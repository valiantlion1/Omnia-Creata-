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

PADDLE_SUPPORTED_EVENTS = frozenset(
    {
        "transaction.completed",
        "subscription.created",
        "subscription.activated",
        "subscription.updated",
        "subscription.paused",
        "subscription.canceled",
        "subscription.cancelled",
        "subscription.resumed",
        "subscription.past_due",
        "subscription.expired",
    }
)

_PAID_SUBSCRIPTION_PLANS = frozenset({IdentityPlan.CREATOR, IdentityPlan.PRO})

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
            "credits_remaining": self.gross_remaining,
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
class BillingWebhookMutationResult:
    upgraded_email: Optional[str] = None


def resolve_effective_plan(
    *,
    identity: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> IdentityPlan:
    if identity.owner_mode or identity.root_admin or identity.local_access:
        return identity.plan
    if identity.plan in _PAID_SUBSCRIPTION_PLANS and identity.subscription_status != SubscriptionStatus.ACTIVE:
        return IdentityPlan.FREE
    return identity.plan


def resolve_billing_state(
    *,
    identity: OmniaIdentity,
    generation_jobs: Sequence[GenerationJob],
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> BillingStateSnapshot:
    monthly_remaining = max(int(identity.monthly_credits_remaining or 0), 0)
    effective_plan = resolve_effective_plan(identity=identity, plan_catalog=plan_catalog)
    monthly_allowance = max(
        int(identity.monthly_credit_allowance or 0),
        int(plan_catalog[identity.plan].monthly_credits),
    )
    if effective_plan != identity.plan:
        monthly_allowance = int(plan_catalog[effective_plan].monthly_credits)
        monthly_remaining = min(monthly_remaining, monthly_allowance)
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
        effective_plan=effective_plan,
        subscription_active=identity.subscription_status == SubscriptionStatus.ACTIVE and identity.plan in _PAID_SUBSCRIPTION_PLANS,
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
    generation_credit_guide: Mapping[str, Any] | None = None,
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
        "feature_entitlements": dict(entitlements or {}),
        "credits": billing_state.credits_dict(),
        "wallet": {
            "balance": billing_state.extra_credits,
            "wallet_balance": billing_state.extra_credits,
            "included_monthly_allowance": billing_state.monthly_allowance,
            "included_monthly_remaining": billing_state.monthly_remaining,
            "reserved_total": billing_state.reserved_total,
            "available_to_spend": billing_state.available_to_spend,
            "spend_order": billing_state.spend_order,
            "unlimited": billing_state.unlimited,
        },
        "wallet_balance": billing_state.extra_credits,
        "account_tier": billing_state.effective_plan.value,
        "subscription_tier": (
            billing_state.effective_plan.value
            if billing_state.effective_plan in _PAID_SUBSCRIPTION_PLANS and billing_state.subscription_active
            else None
        ),
        "generation_credit_guide": dict(generation_credit_guide or {}),
        "checkout_options": [
            {"kind": kind.value, **meta}
            for kind, meta in checkout_catalog.items()
        ],
        "recent_activity": [entry.model_dump(mode="json") for entry in recent_entries],
    }


def build_paddle_checkout_url(
    *,
    base_url: str,
    identity_id: str,
    email: str,
    kind: CheckoutKind,
) -> str:
    params = {
        "identity_id": identity_id,
        "checkout_kind": kind.value,
        "email": email,
    }
    return f"{base_url.rstrip('/')}?{urlencode(params)}"


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
) -> BillingWebhookMutationResult:
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
    return BillingWebhookMutationResult()


def _apply_subscription_activated(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_kind: CheckoutKind,
    ledger_prefix: str,
    ledger_suffix: str,
    now: datetime,
) -> BillingWebhookMutationResult:
    upgraded_email: Optional[str] = None
    allowance = int(plan_catalog[checkout_catalog_kind_to_plan(checkout_kind)].monthly_credits)
    next_plan = checkout_catalog_kind_to_plan(checkout_kind)
    if current.plan != next_plan:
        upgraded_email = current.email
    current.plan = next_plan
    current.subscription_status = SubscriptionStatus.ACTIVE
    current.monthly_credit_allowance = allowance
    current.monthly_credits_remaining = max(current.monthly_credits_remaining, allowance)
    current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"{ledger_prefix}_{ledger_suffix}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=allowance,
        entry_type=CreditEntryType.SUBSCRIPTION,
        description=f"{plan_catalog[next_plan].label} activation",
        checkout_kind=checkout_kind,
    )
    return BillingWebhookMutationResult(upgraded_email=upgraded_email)


def _apply_subscription_renewed(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_kind: CheckoutKind,
    ledger_prefix: str,
    ledger_suffix: str,
    now: datetime,
) -> BillingWebhookMutationResult:
    next_plan = checkout_catalog_kind_to_plan(checkout_kind)
    allowance = int(plan_catalog[next_plan].monthly_credits)
    current.plan = next_plan
    current.subscription_status = SubscriptionStatus.ACTIVE
    current.monthly_credit_allowance = allowance
    current.monthly_credits_remaining = allowance
    current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    state.credit_ledger[f"{ledger_prefix}_{ledger_suffix}"] = CreditLedgerEntry(
        identity_id=current.id,
        amount=allowance,
        entry_type=CreditEntryType.SUBSCRIPTION,
        description=f"{plan_catalog[next_plan].label} renewal",
        checkout_kind=checkout_kind,
    )
    return BillingWebhookMutationResult()


def _apply_subscription_deactivated(
    *,
    state: StudioState,
    current: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    finalize: bool,
    now: datetime,
) -> BillingWebhookMutationResult:
    current.subscription_status = SubscriptionStatus.CANCELED
    if finalize:
        free_allowance = int(plan_catalog[IdentityPlan.FREE].monthly_credits)
        current.plan = IdentityPlan.FREE
        current.monthly_credit_allowance = free_allowance
        current.monthly_credits_remaining = min(current.monthly_credits_remaining, free_allowance)
        current.last_credit_refresh_at = now
    current.updated_at = now
    state.identities[current.id] = current
    return BillingWebhookMutationResult()


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
    if config["plan"] in _PAID_SUBSCRIPTION_PLANS:
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


def checkout_catalog_kind_to_plan(kind: CheckoutKind) -> IdentityPlan:
    if kind == CheckoutKind.CREATOR_MONTHLY:
        return IdentityPlan.CREATOR
    if kind == CheckoutKind.PRO_MONTHLY:
        return IdentityPlan.PRO
    raise ValueError(f"Checkout kind {kind.value} is not a subscription plan.")


def is_supported_paddle_event(event_name: str) -> bool:
    return event_name in PADDLE_SUPPORTED_EVENTS


def build_paddle_webhook_receipt(
    *,
    payload: Dict[str, Any],
    identity_id: str,
    checkout_kind: CheckoutKind | None,
    now: datetime,
) -> BillingWebhookReceipt:
    data = payload.get("data", {}) or {}
    resource_type = str(data.get("type") or payload.get("event_type") or "unknown")
    resource_id = str(data.get("id") or payload.get("event_id") or identity_id or "unknown")
    event_name = str(payload.get("event_type") or "unknown")
    fingerprint_payload = {
        "provider": "paddle",
        "event_id": str(payload.get("event_id") or ""),
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
        id=f"paddle_{fingerprint}",
        provider="paddle",
        event_name=event_name,
        resource_type=resource_type,
        resource_id=resource_id,
        identity_id=identity_id,
        checkout_kind=checkout_kind,
        processed_at=now,
    )


def apply_paddle_webhook_event(
    *,
    state: StudioState,
    identity_id: str,
    event_name: str,
    now: datetime,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
    checkout_catalog: Mapping[CheckoutKind, Dict[str, Any]],
    checkout_kind: CheckoutKind | None = None,
    receipt_id: str | None = None,
) -> BillingWebhookMutationResult:
    current = state.identities.get(identity_id)
    if current is None:
        raise KeyError(f"Identity {identity_id} not found for Paddle webhook.")

    ledger_suffix = receipt_id or str(int(now.timestamp()))
    payload_config = checkout_catalog.get(checkout_kind) if checkout_kind is not None else None

    if event_name == "transaction.completed":
        if checkout_kind in {CheckoutKind.CREDIT_PACK_SMALL, CheckoutKind.CREDIT_PACK_LARGE} and payload_config is not None:
            return _apply_top_up_paid(
                state=state,
                current=current,
                amount=int(payload_config["credits"]),
                description=str(payload_config["label"]),
                checkout_kind=checkout_kind,
                ledger_prefix="webhook_topup",
                ledger_suffix=ledger_suffix,
                now=now,
            )

        current.updated_at = now
        state.identities[current.id] = current
        return BillingWebhookMutationResult()

    if event_name in {"subscription.created", "subscription.activated", "subscription.resumed"} and checkout_kind is not None:
        return _apply_subscription_activated(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            checkout_kind=checkout_kind,
            ledger_prefix="webhook_upgrade",
            ledger_suffix=ledger_suffix,
            now=now,
        )

    if event_name == "subscription.updated" and current.plan in _PAID_SUBSCRIPTION_PLANS:
        if checkout_kind in {CheckoutKind.CREATOR_MONTHLY, CheckoutKind.PRO_MONTHLY}:
            synced_plan = checkout_catalog_kind_to_plan(checkout_kind)
            current.plan = synced_plan
            current.monthly_credit_allowance = int(plan_catalog[synced_plan].monthly_credits)
        current.subscription_status = SubscriptionStatus.ACTIVE
        current.updated_at = now
        state.identities[current.id] = current
        return BillingWebhookMutationResult()

    if event_name in {"subscription.paused", "subscription.canceled", "subscription.cancelled", "subscription.expired", "subscription.past_due"}:
        if event_name == "subscription.past_due":
            current.subscription_status = SubscriptionStatus.PAST_DUE
            current.updated_at = now
            state.identities[current.id] = current
            return BillingWebhookMutationResult()
        return _apply_subscription_deactivated(
            state=state,
            current=current,
            plan_catalog=plan_catalog,
            finalize=event_name == "subscription.expired",
            now=now,
        )

    return BillingWebhookMutationResult()
