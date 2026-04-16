from datetime import timezone
from typing import TYPE_CHECKING, Optional, List, Dict, Any
from fastapi import Request
import asyncio
import logging
from config.env import Environment, get_settings
from ..models import *
from ..billing_ops import *
from ..cost_telemetry_ops import *
from ..provider_spend_guardrails import *
from ..entitlement_ops import resolve_entitlements
from ..generation_credit_forecast_ops import build_generation_credit_forecasts
from ..mailer import mailer
import hmac
import hashlib
import json

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from ..service import StudioService

class BillingService:
    def __init__(self, service: 'StudioService'):
        self.service = service
        self.providers = service.providers

    def _demo_checkout_fallback_allowed(self) -> bool:
        return get_settings().environment == Environment.DEVELOPMENT

    async def _resolve_billing_state_for_identity(self, identity: OmniaIdentity) -> BillingStateSnapshot:
        def query(state: StudioState) -> BillingStateSnapshot:
            return self._resolve_billing_state_locked(state, identity)

        return await self.service.store.read(query)


    def _resolve_billing_state_locked(self, state: StudioState, identity: OmniaIdentity) -> BillingStateSnapshot:
        jobs = [
            job
            for job in state.generations.values()
            if job.identity_id == identity.id
        ]
        return resolve_billing_state(
            identity=identity,
            generation_jobs=jobs,
            plan_catalog=self.service.plan_catalog,
        )


    def _serialize_credit_snapshot(self, billing_state: BillingStateSnapshot) -> Dict[str, Any]:
        return billing_state.credits_dict()


    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.service.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        ledger = await self.service.store.list_credit_entries_for_identity(identity_id)
        accessible_models = [
            model
            for model in await self.service.list_models_for_identity(identity)
            if not (
                identity.plan == IdentityPlan.FREE and model.min_plan in {IdentityPlan.CREATOR, IdentityPlan.PRO}
            )
        ]
        return build_billing_summary(
            identity=identity,
            identity_id=identity_id,
            billing_state=billing_state,
            ledger_entries=ledger,
            plan_catalog=self.service.plan_catalog,
            checkout_catalog=self.service.checkout_catalog,
            entitlements=self.service.serialize_entitlements(identity, billing_state=billing_state),
            generation_credit_guide=build_generation_credit_forecasts(
                identity_plan=identity.plan,
                billing_state=billing_state,
                models=accessible_models,
                providers=self.service.providers,
            ),
        )


    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        identity = await self.service.get_identity(identity_id)
        config = self.service.checkout_catalog[kind]
        settings = get_settings()

        if settings.paddle_checkout_base_url:
            logger.info(
                "Checkout initiated: identity=%s kind=%s provider=%s",
                identity_id, kind.value, "paddle",
            )
            return {
                "status": "redirect",
                "provider": "paddle",
                "kind": kind.value,
                "checkout_url": build_paddle_checkout_url(
                    base_url=settings.paddle_checkout_base_url,
                    identity_id=identity_id,
                    email=identity.email,
                    kind=kind,
                ),
            }

        if not self._demo_checkout_fallback_allowed():
            raise RuntimeError("Billing checkout is not configured for this environment")

        logger.info(
            "Checkout initiated: identity=%s kind=%s provider=%s",
            identity_id, kind.value, "demo",
        )
        # Fallback to demo local mutation only for local development.
        updated_holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            now = utc_now()
            updated_holder["identity"] = apply_demo_checkout(
                state=state,
                identity_id=identity.id,
                kind=kind,
                config=config,
                plan_catalog=self.service.plan_catalog,
                now=now,
            )

        await self.service.store.mutate(mutation)
        logger.info(
            "Demo checkout completed: identity=%s kind=%s",
            identity_id, kind.value,
        )
        updated = updated_holder["identity"]
        billing_state = await self._resolve_billing_state_for_identity(updated)
        return {
            "status": "demo_activated",
            "provider": "demo",
            "kind": kind.value,
            "identity": self.service.serialize_identity(updated, billing_state=billing_state),
        }


    async def _provider_spend_guardrail_for_provider(
        self,
        *,
        provider_name: str | None,
        provider_billable: bool | None,
        projected_cost_usd: float = 0.0,
    ) -> ProviderSpendGuardrailStatus | None:
        normalized_provider = str(provider_name or "").strip().lower()
        if not normalized_provider:
            return None

        def query(state: StudioState) -> ProviderSpendGuardrailStatus:
            spend_summary = summarize_provider_daily_spend(
                state,
                provider_name=normalized_provider,
                now=utc_now(),
            )
            return evaluate_provider_spend_guardrail(
                self.service.settings,
                provider_name=normalized_provider,
                provider_billable=bool(provider_billable),
                spend_summary=spend_summary,
                projected_cost_usd=projected_cost_usd,
            )

        result = await self.service.store.read(query)
        if result and result.status == "blocked":
            logger.warning(
                "Provider spend guardrail BLOCKED: provider=%s",
                normalized_provider,
            )
        return result

    async def _evaluate_monthly_spend_guardrail(
        self,
        *,
        projected_cost_usd: float = 0.0,
    ) -> MonthlyGuardrailResult:
        def query(state: StudioState) -> MonthlyGuardrailResult:
            monthly = summarize_monthly_spend(state, now=utc_now())
            return evaluate_monthly_spend_guardrail(
                self.service.settings,
                monthly_summary=monthly,
                projected_cost_usd=projected_cost_usd,
            )

        result = await self.service.store.read(query)
        if result.status == "blocked":
            logger.warning(
                "Monthly spend guardrail BLOCKED: status=%s",
                result.status,
            )
        return result

    async def _build_provider_spend_guardrails_summary(self) -> Dict[str, Any]:
        provider_names: List[str] = []
        for provider in getattr(self.service.providers, "providers", []):
            if getattr(provider, "billable", False):
                normalized = str(getattr(provider, "name", "")).strip().lower()
                if normalized and normalized not in provider_names:
                    provider_names.append(normalized)

        def query(state: StudioState) -> List[dict[str, Any]]:
            items: List[dict[str, Any]] = []
            for provider_name in provider_names:
                spend_summary = summarize_provider_daily_spend(
                    state,
                    provider_name=provider_name,
                    now=utc_now(),
                )
                guardrail = evaluate_provider_spend_guardrail(
                    self.service.settings,
                    provider_name=provider_name,
                    provider_billable=bool(self.service.providers.provider_billable(provider_name)),
                    spend_summary=spend_summary,
                )
                items.append(guardrail.serialize())
            return items

        serialized = await self.service.store.read(query)
        blocked = [
            item["provider"]
            for item in serialized
            if str(item.get("status") or "").strip().lower() == "blocked"
        ]
        warnings = [
            item["provider"]
            for item in serialized
            if str(item.get("status") or "").strip().lower() == "warning"
        ]
        return {
            "enabled": self.service.settings.provider_spend_guardrails_enabled,
            "window": "utc_day",
            "providers": serialized,
            "warning_providers": warnings,
            "blocked_providers": blocked,
        }


    async def _build_cost_telemetry_summary(self) -> Dict[str, Any]:
        def query(state: StudioState) -> Dict[str, Any]:
            return build_cost_telemetry_summary(
                state,
                window_days=self.service.settings.owner_cost_telemetry_window_days,
                recent_limit=self.service.settings.owner_cost_telemetry_recent_event_limit,
                now=utc_now(),
            )

        return await self.service.store.read(query)


    async def _record_cost_telemetry_event(
        self,
        *,
        source_kind: str,
        surface: str,
        provider: str | None,
        amount_usd: float | None,
        identity_id: str | None = None,
        source_id: str | None = None,
        provider_model: str | None = None,
        studio_model: str | None = None,
        billable: bool | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> CostTelemetryEvent | None:
        normalized_provider = str(provider or "").strip().lower()
        normalized_amount = round(float(amount_usd or 0.0), 6)
        if not normalized_provider or normalized_amount <= 0:
            return None
        event = CostTelemetryEvent(
            source_kind=source_kind,
            source_id=source_id,
            identity_id=identity_id,
            provider=normalized_provider,
            surface=surface,
            amount_usd=normalized_amount,
            provider_model=provider_model,
            studio_model=studio_model,
            billable=bool(normalized_amount > 0 if billable is None else billable),
            metadata=dict(metadata or {}),
        )
        await self.service.store.save_model("cost_telemetry_events", event)
        logger.info(
            "Cost telemetry recorded: provider=%s amount_usd=%.6f surface=%s",
            normalized_provider, normalized_amount, surface,
        )
        return event


    def _refresh_monthly_credits_locked(self, state: StudioState, identity: OmniaIdentity) -> None:
        plan_config = self.service.plan_catalog[identity.plan]
        identity.monthly_credit_allowance = plan_config.monthly_credits
        if identity.plan == IdentityPlan.GUEST:
            identity.monthly_credits_remaining = 0
            identity.last_credit_refresh_at = utc_now()
            return
        if identity.plan in {IdentityPlan.CREATOR, IdentityPlan.PRO} and identity.subscription_status != SubscriptionStatus.ACTIVE:
            return

        last = identity.last_credit_refresh_at.astimezone(timezone.utc)
        now = utc_now()
        if (last.year, last.month) != (now.year, now.month):
            identity.monthly_credits_remaining = plan_config.monthly_credits
            identity.last_credit_refresh_at = now
            state.credit_ledger[f"refresh_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                identity_id=identity.id,
                amount=plan_config.monthly_credits,
                entry_type=CreditEntryType.MONTHLY_GRANT,
                description=f"{plan_config.label} monthly refresh",
            )
            logger.info(
                "Monthly credits refreshed: identity=%s plan=%s credits=%d",
                identity.id, identity.plan.value, plan_config.monthly_credits,
            )


    async def process_paddle_webhook(self, payload: Dict[str, Any]) -> None:
        """Handle Paddle webhook events to update user subscription state and wallet credits."""
        event_name = str(payload.get("event_type") or "").strip().lower()
        data = payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}
        subscription_status = str(
            data.get("status")
            or (data.get("attributes", {}) if isinstance(data.get("attributes"), dict) else {}).get("status")
            or ""
        ).strip().lower()
        if event_name == "subscription.updated":
            if subscription_status == "expired":
                event_name = "subscription.expired"
            elif subscription_status in {"canceled", "cancelled"}:
                event_name = "subscription.canceled"
            elif subscription_status == "paused":
                event_name = "subscription.paused"
            elif subscription_status == "past_due":
                event_name = "subscription.past_due"
        custom_data = data.get("custom_data", {})
        if not isinstance(custom_data, dict):
            custom_data = payload.get("meta", {}).get("custom_data", {})
        if not isinstance(custom_data, dict):
            custom_data = {}
        identity_id = custom_data.get("identity_id")
        checkout_kind_raw = custom_data.get("checkout_kind")
        checkout_kind = None
        if isinstance(checkout_kind_raw, str):
            try:
                checkout_kind = CheckoutKind(checkout_kind_raw)
            except ValueError:
                checkout_kind = None

        if not identity_id:
            raise ValueError("Paddle webhook is missing identity_id custom_data.")

        if not is_supported_paddle_event(event_name):
            return

        logger.info(
            "Paddle webhook received: event=%s identity=%s checkout_kind=%s",
            event_name, identity_id, checkout_kind_raw,
        )
        now = utc_now()
        receipt = build_paddle_webhook_receipt(
            payload=payload,
            identity_id=identity_id,
            checkout_kind=checkout_kind,
            now=now,
        )
        upgraded_email = None
        upgraded_label = None
        already_processed = False

        def mutation(state: StudioState) -> None:
            nonlocal already_processed, upgraded_email, upgraded_label
            if receipt.id in state.billing_webhook_receipts:
                already_processed = True
                logger.info(
                    "Paddle webhook already processed: receipt=%s",
                    receipt.id,
                )
                return
            result = apply_paddle_webhook_event(
                state=state,
                identity_id=identity_id,
                event_name=event_name,
                now=now,
                plan_catalog=self.service.plan_catalog,
                checkout_catalog=self.service.checkout_catalog,
                checkout_kind=checkout_kind,
                receipt_id=receipt.id,
            )
            state.billing_webhook_receipts[receipt.id] = receipt
            upgraded_email = result.upgraded_email
            if upgraded_email and checkout_kind in {CheckoutKind.CREATOR_MONTHLY, CheckoutKind.PRO_MONTHLY}:
                upgraded_label = self.service.plan_catalog[checkout_catalog_kind_to_plan(checkout_kind)].label

        await self.service.store.mutate(mutation)
        if not already_processed:
            logger.info(
                "Paddle webhook applied: event=%s identity=%s receipt=%s",
                event_name, identity_id, receipt.id,
            )
        if upgraded_email and upgraded_label and not already_processed:
            await mailer.send_subscription_update(upgraded_email, upgraded_label)
            logger.info(
                "Subscription upgrade email sent: email=%s plan=%s",
                upgraded_email, upgraded_label,
            )

    async def process_lemonsqueezy_webhook(self, payload: Dict[str, Any]) -> None:
        raise RuntimeError("LemonSqueezy webhooks have been retired. Use Paddle webhook processing instead.")

