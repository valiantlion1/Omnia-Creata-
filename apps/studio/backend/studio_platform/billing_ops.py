from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional
from urllib.parse import urlencode

from .models import (
    BillingWebhookReceipt,
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    IdentityPlan,
    OmniaIdentity,
    PlanCatalogEntry,
    StudioState,
    SubscriptionStatus,
)

LEMONSQUEEZY_SUPPORTED_EVENTS = frozenset(
    {
        "order_created",
        "subscription_created",
        "subscription_cancelled",
        "subscription_expired",
    }
)


def build_billing_summary(
    *,
    identity: OmniaIdentity,
    identity_id: str,
    ledger_entries: Iterable[CreditLedgerEntry],
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_catalog: Mapping[CheckoutKind, Dict[str, Any]],
    entitlements: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    recent_entries = [
        entry
        for entry in sorted(ledger_entries, key=lambda item: item.created_at, reverse=True)
        if entry.identity_id == identity_id
    ][:12]
    return {
        "plan": plan_catalog[identity.plan].model_dump(mode="json"),
        "subscription_status": identity.subscription_status.value,
        "entitlements": dict(entitlements or {}),
        "credits": {
            "remaining": identity.monthly_credits_remaining + identity.extra_credits,
            "monthly_remaining": identity.monthly_credits_remaining,
            "monthly_allowance": identity.monthly_credit_allowance,
            "extra_credits": identity.extra_credits,
        },
        "checkout_options": [
            {"kind": kind.value, **meta}
            for kind, meta in checkout_catalog.items()
        ],
        "recent_activity": [entry.model_dump(mode="json") for entry in recent_entries],
    }


def build_lemonsqueezy_checkout_url(
    *,
    store_id: str,
    identity_id: str,
    email: str,
    kind: CheckoutKind,
) -> str:
    params = {
        "checkout[custom][identity_id]": identity_id,
        "checkout[custom][checkout_kind]": kind.value,
        "checkout[email]": email,
    }
    variant_id = "pro_subscription" if kind == CheckoutKind.PRO_MONTHLY else "credit_pack"
    return f"https://{store_id}.lemonsqueezy.com/checkout/buy/{variant_id}?{urlencode(params)}"


def apply_demo_checkout(
    *,
    state: StudioState,
    identity_id: str,
    kind: CheckoutKind,
    config: Dict[str, Any],
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    now: datetime,
) -> OmniaIdentity:
    current = state.identities[identity_id]
    if config["plan"] == IdentityPlan.PRO:
        current.plan = IdentityPlan.PRO
        current.subscription_status = SubscriptionStatus.ACTIVE
        current.monthly_credit_allowance = plan_catalog[IdentityPlan.PRO].monthly_credits
        current.monthly_credits_remaining = max(
            current.monthly_credits_remaining,
            plan_catalog[IdentityPlan.PRO].monthly_credits,
        )
    else:
        current.extra_credits += config["credits"]

    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"checkout_{kind.value}_{int(now.timestamp())}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=config["credits"],
        entry_type=CreditEntryType.SUBSCRIPTION if config["plan"] else CreditEntryType.TOP_UP,
        description=config["label"],
        checkout_kind=kind,
    )
    return current.model_copy(deep=True)


@dataclass(slots=True)
class LemonSqueezyWebhookMutationResult:
    upgraded_email: Optional[str] = None


def is_supported_lemonsqueezy_event(event_name: str) -> bool:
    return event_name in LEMONSQUEEZY_SUPPORTED_EVENTS


def build_lemonsqueezy_webhook_receipt(
    *,
    payload: Dict[str, Any],
    identity_id: str,
    checkout_kind: CheckoutKind | None,
    now: datetime,
) -> BillingWebhookReceipt:
    meta = payload.get("meta", {}) or {}
    data = payload.get("data", {}) or {}
    resource_type = str(data.get("type") or "unknown")
    resource_id = str(data.get("id") or identity_id or "unknown")
    event_name = str(meta.get("event_name") or "unknown")
    fingerprint_payload = {
        "provider": "lemonsqueezy",
        "event_name": event_name,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "identity_id": identity_id,
        "checkout_kind": checkout_kind.value if checkout_kind is not None else "",
    }
    fingerprint = hashlib.sha256(
        json.dumps(fingerprint_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return BillingWebhookReceipt(
        id=f"lemonsqueezy_{fingerprint}",
        event_name=event_name,
        resource_type=resource_type,
        resource_id=resource_id,
        identity_id=identity_id,
        checkout_kind=checkout_kind,
        processed_at=now,
    )


def apply_lemonsqueezy_webhook_event(
    *,
    state: StudioState,
    identity_id: str,
    event_name: str,
    now: datetime,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_catalog: Mapping[CheckoutKind, Dict[str, Any]],
    checkout_kind: CheckoutKind | None = None,
    receipt_id: str | None = None,
) -> LemonSqueezyWebhookMutationResult:
    current = state.identities.get(identity_id)
    if current is None:
        return LemonSqueezyWebhookMutationResult()

    ledger_suffix = receipt_id or str(int(now.timestamp()))

    if event_name == "order_created":
        checkout_config = checkout_catalog.get(checkout_kind) if checkout_kind is not None else None
        if checkout_kind in {CheckoutKind.TOP_UP_SMALL, CheckoutKind.TOP_UP_LARGE} and checkout_config is not None:
            amount = int(checkout_config["credits"])
            current.extra_credits += amount
            current.updated_at = now
            state.identities[current.id] = current
            state.credit_ledger[f"webhook_topup_{ledger_suffix}"] = CreditLedgerEntry(
                identity_id=current.id,
                amount=amount,
                entry_type=CreditEntryType.TOP_UP,
                description=str(checkout_config["label"]),
                checkout_kind=checkout_kind,
            )
            return LemonSqueezyWebhookMutationResult()

        current.updated_at = now
        state.identities[current.id] = current
        return LemonSqueezyWebhookMutationResult()

    if event_name == "subscription_created":
        upgraded_email: Optional[str] = None
        if current.plan != IdentityPlan.PRO:
            upgraded_email = current.email
            current.plan = IdentityPlan.PRO
            current.subscription_status = SubscriptionStatus.ACTIVE
            current.monthly_credits_remaining = plan_catalog[IdentityPlan.PRO].monthly_credits
            current.monthly_credit_allowance = plan_catalog[IdentityPlan.PRO].monthly_credits
            current.last_credit_refresh_at = now
            state.credit_ledger[f"webhook_upgrade_{ledger_suffix}"] = CreditLedgerEntry(
                identity_id=current.id,
                amount=current.monthly_credits_remaining,
                entry_type=CreditEntryType.SUBSCRIPTION,
                description="Pro Upgrade (LemonSqueezy)",
                checkout_kind=checkout_kind or CheckoutKind.PRO_MONTHLY,
            )
        else:
            current.subscription_status = SubscriptionStatus.ACTIVE
        current.updated_at = now
        state.identities[current.id] = current
        return LemonSqueezyWebhookMutationResult(upgraded_email=upgraded_email)

    if event_name in ("subscription_cancelled", "subscription_expired"):
        if current.plan == IdentityPlan.PRO:
            current.plan = IdentityPlan.FREE
            current.subscription_status = SubscriptionStatus.CANCELED
            current.monthly_credits_remaining = plan_catalog[IdentityPlan.FREE].monthly_credits
            current.monthly_credit_allowance = plan_catalog[IdentityPlan.FREE].monthly_credits
            current.last_credit_refresh_at = now
        current.updated_at = now
        state.identities[current.id] = current

    return LemonSqueezyWebhookMutationResult()
