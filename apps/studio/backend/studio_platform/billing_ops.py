from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence
from urllib.parse import urlencode

from .models import (
    BillingWebhookReceipt,
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    IdentityPlan,
    JobStatus,
    OmniaIdentity,
    PlanCatalogEntry,
    StudioState,
    SubscriptionStatus,
)

LEMONSQUEEZY_SUPPORTED_EVENTS = frozenset(
    {
        "order_created",
        "subscription_created",
        "subscription_payment_success",
        "subscription_cancelled",
        "subscription_expired",
    }
)

ACTIVE_CREDIT_HOLD_STATUSES = frozenset(
    {
        JobStatus.QUEUED,
        JobStatus.RUNNING,
        JobStatus.RETRYABLE_FAILED,
    }
)


@dataclass(frozen=True, slots=True)
class BillingStateSnapshot:
    gross_remaining: int
    reserved_total: int
    available_to_spend: int
    monthly_remaining: int
    monthly_allowance: int
    extra_credits: int
    unlimited: bool
    effective_plan: IdentityPlan
    subscription_active: bool
    spend_order: str = "monthly_then_extra"

    def credits_dict(self) -> Dict[str, Any]:
        return {
            "remaining": self.gross_remaining,
            "gross_remaining": self.gross_remaining,
            "monthly_remaining": self.monthly_remaining,
            "monthly_allowance": self.monthly_allowance,
            "extra_credits": self.extra_credits,
            "reserved_total": self.reserved_total,
            "available_to_spend": self.available_to_spend,
            "spend_order": self.spend_order,
            "unlimited": self.unlimited,
        }


@dataclass(slots=True)
class LemonSqueezyWebhookMutationResult:
    upgraded_email: Optional[str] = None


def resolve_billing_state(
    *,
    identity: OmniaIdentity,
    generation_jobs: Sequence[GenerationJob],
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> BillingStateSnapshot:
    monthly_remaining = max(int(identity.monthly_credits_remaining or 0), 0)
    monthly_allowance = max(
        int(identity.monthly_credit_allowance or 0),
        int(plan_catalog[identity.plan].monthly_credits),
    )
    extra_credits = max(int(identity.extra_credits or 0), 0)
    gross_remaining = monthly_remaining + extra_credits
    unlimited = bool(identity.owner_mode or identity.root_admin or identity.local_access)
    reserved_total = 0
    if not unlimited:
        reserved_total = sum(
            max(int(getattr(job, "reserved_credit_cost", 0) or 0), 0)
            for job in generation_jobs
            if job.identity_id == identity.id
            and job.status in ACTIVE_CREDIT_HOLD_STATUSES
            and str(getattr(job, "credit_status", "none") or "none") == "reserved"
        )
    return BillingStateSnapshot(
        gross_remaining=gross_remaining,
        reserved_total=reserved_total,
        available_to_spend=gross_remaining if unlimited else max(gross_remaining - reserved_total, 0),
        monthly_remaining=monthly_remaining,
        monthly_allowance=monthly_allowance,
        extra_credits=extra_credits,
        unlimited=unlimited,
        effective_plan=identity.plan,
        subscription_active=identity.subscription_status == SubscriptionStatus.ACTIVE,
    )


def calculate_generation_final_charge(
    *,
    base_credit_cost: int,
    provider_name: str | None,
    provider_billable: bool | None,
    degraded: bool,
) -> tuple[str, int]:
    normalized_provider = (provider_name or "").strip().lower()
    normalized_cost = max(int(base_credit_cost or 0), 0)
    if degraded or normalized_provider == "demo":
        return ("degraded_free", 0)
    if provider_billable:
        return ("managed_full", normalized_cost)
    if normalized_cost <= 0:
        return ("standard_discount", 0)
    return ("standard_discount", max(1, int(math.ceil(normalized_cost * 0.5))))


def build_billing_summary(
    *,
    identity: OmniaIdentity,
    identity_id: str,
    billing_state: BillingStateSnapshot,
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
        "plan": plan_catalog[billing_state.effective_plan].model_dump(mode="json"),
        "subscription_status": identity.subscription_status.value,
        "entitlements": dict(entitlements or {}),
        "credits": billing_state.credits_dict(),
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


def _apply_top_up_paid(
    *,
    state: StudioState,
    current: OmniaIdentity,
    amount: int,
    description: str,
    checkout_kind: CheckoutKind,
    ledger_prefix: str,
    ledger_suffix: str,
    now: datetime,
) -> LemonSqueezyWebhookMutationResult:
    current.extra_credits += amount
    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"{ledger_prefix}_{ledger_suffix}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=amount,
        entry_type=CreditEntryType.TOP_UP,
        description=description,
        checkout_kind=checkout_kind,
    )
    return LemonSqueezyWebhookMutationResult()


def _apply_subscription_activated(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_kind: CheckoutKind,
    ledger_prefix: str,
    ledger_suffix: str,
    now: datetime,
) -> LemonSqueezyWebhookMutationResult:
    upgraded_email: Optional[str] = None
    pro_allowance = int(plan_catalog[IdentityPlan.PRO].monthly_credits)
    if current.plan != IdentityPlan.PRO:
        upgraded_email = current.email
    current.plan = IdentityPlan.PRO
    current.subscription_status = SubscriptionStatus.ACTIVE
    current.monthly_credit_allowance = pro_allowance
    current.monthly_credits_remaining = max(current.monthly_credits_remaining, pro_allowance)
    current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"{ledger_prefix}_{ledger_suffix}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=pro_allowance,
        entry_type=CreditEntryType.SUBSCRIPTION,
        description="Pro Upgrade",
        checkout_kind=checkout_kind,
    )
    return LemonSqueezyWebhookMutationResult(upgraded_email=upgraded_email)


def _apply_subscription_renewed(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_kind: CheckoutKind,
    ledger_prefix: str,
    ledger_suffix: str,
    now: datetime,
) -> LemonSqueezyWebhookMutationResult:
    pro_allowance = int(plan_catalog[IdentityPlan.PRO].monthly_credits)
    current.plan = IdentityPlan.PRO
    current.subscription_status = SubscriptionStatus.ACTIVE
    current.monthly_credit_allowance = pro_allowance
    current.monthly_credits_remaining = pro_allowance
    current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"{ledger_prefix}_{ledger_suffix}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=pro_allowance,
        entry_type=CreditEntryType.SUBSCRIPTION,
        description="Pro Renewal",
        checkout_kind=checkout_kind,
    )
    return LemonSqueezyWebhookMutationResult()


def _apply_subscription_deactivated(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    finalize: bool,
    now: datetime,
) -> LemonSqueezyWebhookMutationResult:
    current.subscription_status = SubscriptionStatus.CANCELED
    if finalize:
        free_allowance = int(plan_catalog[IdentityPlan.FREE].monthly_credits)
        current.plan = IdentityPlan.FREE
        current.monthly_credit_allowance = free_allowance
        current.monthly_credits_remaining = min(current.monthly_credits_remaining, free_allowance)
        current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    return LemonSqueezyWebhookMutationResult()


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
    ledger_suffix = str(int(now.timestamp()))
    if config["plan"] == IdentityPlan.PRO:
        _apply_subscription_activated(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            checkout_kind=kind,
            ledger_prefix="checkout_subscription",
            ledger_suffix=ledger_suffix,
            now=now,
        )
    else:
        _apply_top_up_paid(
            state=state,
            current=current,
            amount=int(config["credits"]),
            description=str(config["label"]),
            checkout_kind=kind,
            ledger_prefix="checkout_topup",
            ledger_suffix=ledger_suffix,
            now=now,
        )
    return state.identities[identity_id].model_copy(deep=True)


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
        "attributes": data.get("attributes", {}) or {},
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
            return _apply_top_up_paid(
                state=state,
                current=current,
                amount=int(checkout_config["credits"]),
                description=str(checkout_config["label"]),
                checkout_kind=checkout_kind,
                ledger_prefix="webhook_topup",
                ledger_suffix=ledger_suffix,
                now=now,
            )

        current.updated_at = now
        state.identities[current.id] = current
        return LemonSqueezyWebhookMutationResult()

    if event_name == "subscription_created":
        return _apply_subscription_activated(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            checkout_kind=checkout_kind or CheckoutKind.PRO_MONTHLY,
            ledger_prefix="webhook_upgrade",
            ledger_suffix=ledger_suffix,
            now=now,
        )

    if event_name == "subscription_payment_success":
        return _apply_subscription_renewed(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            checkout_kind=checkout_kind or CheckoutKind.PRO_MONTHLY,
            ledger_prefix="webhook_renewal",
            ledger_suffix=ledger_suffix,
            now=now,
        )

    if event_name in ("subscription_cancelled", "subscription_expired"):
        return _apply_subscription_deactivated(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            finalize=event_name == "subscription_expired",
            now=now,
        )

    return LemonSqueezyWebhookMutationResult()
