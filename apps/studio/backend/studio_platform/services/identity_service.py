from typing import TYPE_CHECKING, Optional, List, Dict, Any
from fastapi import Request
import asyncio
import logging
import json
import re
from datetime import datetime, timedelta, timezone
import httpx
from config.env import get_settings, reveal_secret_with_audit
from ..models import (
    CreditEntryType,
    CreditLedgerEntry,
    DeletedIdentityTombstone,
    GenerationJob,
    IdentityPlan,
    ManualReviewState,
    MediaAsset,
    OmniaIdentity,
    PlanCatalogEntry,
    PublicPost,
    StudioState,
    StudioWorkspace,
    SubscriptionStatus,
    Visibility,
    utc_now,
)
from ..models.identity import (
    MARKETING_CONSENT_VERSION,
    PRIVACY_VERSION,
    TERMS_VERSION,
    USAGE_POLICY_VERSION,
)
from ..profile_ops import build_identity_export, purge_identity_state
from ..creative_profile_ops import attach_creative_profile
from ..generation_admission_ops import count_incomplete_generations_for_identity
from ..entitlement_ops import resolve_entitlements, resolve_guest_entitlements
from security.moderation import ModerationResult, check_display_name_safety
from ..billing_ops import BillingStateSnapshot, resolve_billing_state

logger = logging.getLogger(__name__)

_PROFILE_FEATURED_ASSET_POSITIONS = frozenset({"top", "center", "bottom"})


class DeletedIdentityError(PermissionError):
    def __init__(
        self,
        identity_id: str,
        *,
        deleted_at: datetime | None = None,
    ) -> None:
        self.identity_id = identity_id
        self.deleted_at = deleted_at
        super().__init__("Account has been permanently deleted.")


def _coerce_optional_datetime(value: datetime | str | None) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        try:
            parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        except ValueError:
            return None
        return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)
    return None

if TYPE_CHECKING:
    from ..service import StudioService

def _lazy_service_constants():
    """Lazy import to break circular dependency with service.py"""
    from ..service import (
        _MODERATION_RESET_WINDOW,
        _TEMP_BLOCK_AFTER_FIVE_STRIKES,
        _TEMP_BLOCK_AFTER_THREE_STRIKES,
    )
    return (
        _MODERATION_RESET_WINDOW,
        _TEMP_BLOCK_AFTER_FIVE_STRIKES,
        _TEMP_BLOCK_AFTER_THREE_STRIKES,
    )

class IdentityService:
    def __init__(self, service: 'StudioService'):
        self.service = service
        # Lazy-loaded to avoid circular import with service.py
        _mrw, _tb5, _tb3 = _lazy_service_constants()
        self._PLAN_CATALOG = self.service.plan_catalog
        self._CHECKOUT_CATALOG = self.service.checkout_catalog
        self._PUBLIC_PLAN_CATALOG = self.service.public_plan_catalog
        self._PUBLIC_TOP_UP_GROUP = self.service.public_credit_pack_group
        self._MODERATION_RESET_WINDOW = _mrw
        self._TEMP_BLOCK_AFTER_THREE_STRIKES = _tb3
        self._TEMP_BLOCK_AFTER_FIVE_STRIKES = _tb5

    async def _resolve_billing_state_for_identity(self, identity: OmniaIdentity) -> BillingStateSnapshot:
        return await self.service.billing._resolve_billing_state_for_identity(identity)

    def _resolve_billing_state_locked(self, state: StudioState, identity: OmniaIdentity) -> BillingStateSnapshot:
        return self.service.billing._resolve_billing_state_locked(state, identity)

    def _serialize_credit_snapshot(self, billing_state: BillingStateSnapshot) -> Dict[str, Any]:
        return self.service.billing._serialize_credit_snapshot(billing_state)

    def _normalize_moderation_reason(
        self,
        reason: str | None,
        moderation_result: ModerationResult,
    ) -> str:
        return self.service._normalize_moderation_reason(reason, moderation_result)

    def _should_hide_post_from_public(
        self,
        post: PublicPost,
        *,
        identity: OmniaIdentity,
        generations_by_id: Dict[str, GenerationJob],
    ) -> bool:
        return self.service.public.should_hide_post_from_public(
            post,
            identity=identity,
            generations_by_id=generations_by_id,
        )

    def _is_publicly_showcase_ready_post(self, post: PublicPost) -> bool:
        return self.service.public.is_publicly_showcase_ready_post(post)

    def _is_truthful_surface_asset(self, asset: MediaAsset) -> bool:
        return self.service.library.is_truthful_surface_asset(asset)

    def serialize_asset(self, asset: MediaAsset, *, identity_id: str | None = None) -> Dict[str, Any]:
        return self.service.library.serialize_asset(asset, identity_id=identity_id)

    def serialize_post(
        self,
        post: PublicPost,
        *,
        assets_by_id: Dict[str, MediaAsset],
        identities_by_id: Dict[str, OmniaIdentity],
        viewer_identity_id: str | None = None,
        public_preview: bool = False,
    ) -> Dict[str, Any]:
        return self.service.public.serialize_post(
            post,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
            viewer_identity_id=viewer_identity_id,
            public_preview=public_preview,
        )

    async def _purge_asset_storage(self, asset: MediaAsset) -> None:
        await self.service.library.purge_asset_storage(asset)


    async def get_public_identity(self, auth_user: Any | None) -> Dict[str, Any]:
        if auth_user is None:
            guest_plan = self._PLAN_CATALOG[IdentityPlan.GUEST]
            guest_entitlements = resolve_guest_entitlements(plan_catalog=self._PLAN_CATALOG)
            return {
                "guest": True,
                "identity": self._serialize_guest_identity_payload(),
                "credits": {"remaining": 0, "monthly_remaining": 0, "extra_credits": 0},
                "plan": guest_plan.model_dump(mode="json"),
                "entitlements": guest_entitlements,
                "account_tier": self._account_tier_for_plan(IdentityPlan.GUEST),
                "subscription_tier": None,
                "wallet_balance": 0,
                "wallet": {
                    "balance": 0,
                    "wallet_balance": 0,
                    "included_monthly_allowance": 0,
                    "included_monthly_remaining": 0,
                    "reserved_total": 0,
                    "available_to_spend": 0,
                    "spend_order": "monthly_then_extra",
                    "unlimited": False,
                },
                "feature_entitlements": guest_entitlements,
                "usage_caps": self._serialize_usage_caps(guest_plan),
            }

        identity = await self.ensure_identity(
            user_id=auth_user.id,
            email=auth_user.email or f"{auth_user.id}@omnia.local",
            display_name=getattr(auth_user, "username", None) or "Creator",
            username=(getattr(auth_user, "metadata", {}) or {}).get("username") or None,
            accepted_terms=bool(getattr(auth_user, "metadata", {}).get("accepted_terms")),
            accepted_terms_at=(getattr(auth_user, "metadata", {}) or {}).get("accepted_terms_at"),
            terms_version=(getattr(auth_user, "metadata", {}) or {}).get("terms_version"),
            accepted_privacy=bool(getattr(auth_user, "metadata", {}).get("accepted_privacy")),
            accepted_privacy_at=(getattr(auth_user, "metadata", {}) or {}).get("accepted_privacy_at"),
            privacy_version=(getattr(auth_user, "metadata", {}) or {}).get("privacy_version"),
            accepted_usage_policy=bool(getattr(auth_user, "metadata", {}).get("accepted_usage_policy")),
            accepted_usage_policy_at=(getattr(auth_user, "metadata", {}) or {}).get("accepted_usage_policy_at"),
            usage_policy_version=(getattr(auth_user, "metadata", {}) or {}).get("usage_policy_version"),
            marketing_opt_in=bool(getattr(auth_user, "metadata", {}).get("marketing_opt_in")),
            marketing_opt_in_at=(getattr(auth_user, "metadata", {}) or {}).get("marketing_opt_in_at"),
            marketing_consent_version=(getattr(auth_user, "metadata", {}) or {}).get("marketing_consent_version"),
        )
        billing_state = await self._resolve_billing_state_for_identity(identity)
        payload = self.serialize_identity(identity, billing_state=billing_state)
        payload["identity"].update(self._auth_provider_context_for_user(auth_user))
        return payload


    async def get_deleted_identity_tombstone(self, identity_id: str) -> DeletedIdentityTombstone | None:
        return await self.service.store.get_deleted_identity_tombstone(identity_id)


    async def is_identity_deleted(self, identity_id: str) -> bool:
        return (await self.get_deleted_identity_tombstone(identity_id)) is not None


    async def ensure_identity(
        self,
        user_id: str,
        email: str,
        display_name: str,
        username: str | None = None,
        desired_plan: IdentityPlan | None = None,
        owner_mode: bool = False,
        root_admin: bool = False,
        local_access: bool = False,
        accepted_terms: bool = False,
        accepted_terms_at: datetime | str | None = None,
        terms_version: str | None = None,
        accepted_privacy: bool = False,
        accepted_privacy_at: datetime | str | None = None,
        privacy_version: str | None = None,
        accepted_usage_policy: bool = False,
        accepted_usage_policy_at: datetime | str | None = None,
        usage_policy_version: str | None = None,
        marketing_opt_in: bool = False,
        marketing_opt_in_at: datetime | str | None = None,
        marketing_consent_version: str | None = None,
        bio: str = "",
        avatar_url: str | None = None,
        featured_asset_id: str | None = None,
        default_visibility: Optional[Visibility] = None,
    ) -> OmniaIdentity:
        holder: Dict[str, Any] = {}

        def mutation(state: StudioState) -> None:
            tombstone = state.deleted_identity_tombstones.get(user_id)
            if tombstone is not None:
                holder["deleted_tombstone"] = tombstone.model_copy(deep=True)
                return

            identity = state.identities.get(user_id)
            now = utc_now()

            normalized_email = (email or "").strip().lower()
            privileged_flags = self._resolve_privileged_email_flags(normalized_email)
            if privileged_flags["is_owner"]:
                nonlocal desired_plan, owner_mode, root_admin, local_access
                desired_plan = IdentityPlan.PRO
                owner_mode = True
                local_access = True
                if privileged_flags["is_root_admin"]:
                    root_admin = True

            if identity is None:
                plan = desired_plan or IdentityPlan.FREE
                plan_config = self._PLAN_CATALOG[plan]
                identity = OmniaIdentity(
                    id=user_id,
                    email=email,
                    display_name=display_name or "Creator",
                    username=(username or email.split("@")[0] or "creator").strip().lower(),
                    plan=plan,
                    workspace_id=f"ws_{user_id}",
                    guest=False,
                    owner_mode=owner_mode,
                    root_admin=root_admin,
                    local_access=local_access,
                    accepted_terms=accepted_terms,
                    accepted_privacy=accepted_privacy,
                    accepted_usage_policy=accepted_usage_policy,
                    marketing_opt_in=marketing_opt_in,
                    bio=bio.strip(),
                    avatar_url=avatar_url,
                    profile_featured_asset_id=featured_asset_id,
                    default_visibility=default_visibility or Visibility.PRIVATE,
                    subscription_status=(
                        SubscriptionStatus.ACTIVE
                        if plan in {IdentityPlan.CREATOR, IdentityPlan.PRO}
                        else SubscriptionStatus.NONE
                    ),
                    monthly_credits_remaining=plan_config.monthly_credits,
                    monthly_credit_allowance=plan_config.monthly_credits,
                    extra_credits=0,
                    last_credit_refresh_at=now,
                    created_at=now,
                    updated_at=now,
                )
                self._apply_consent_audit_fields(
                    identity,
                    now=now,
                    accepted_terms=accepted_terms,
                    accepted_terms_at=accepted_terms_at,
                    terms_version=terms_version,
                    accepted_privacy=accepted_privacy,
                    accepted_privacy_at=accepted_privacy_at,
                    privacy_version=privacy_version,
                    accepted_usage_policy=accepted_usage_policy,
                    accepted_usage_policy_at=accepted_usage_policy_at,
                    usage_policy_version=usage_policy_version,
                    marketing_opt_in=marketing_opt_in,
                    marketing_opt_in_at=marketing_opt_in_at,
                    marketing_consent_version=marketing_consent_version,
                )
                if privileged_flags["is_owner"]:
                    self._apply_privileged_identity_overrides(identity)
                state.identities[identity.id] = identity
                state.workspaces[identity.workspace_id] = StudioWorkspace(
                    id=identity.workspace_id,
                    identity_id=identity.id,
                    name=f"{identity.display_name}'s Studio",
                )
                if plan_config.monthly_credits > 0:
                    state.credit_ledger[f"grant_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                        identity_id=identity.id,
                        amount=plan_config.monthly_credits,
                        entry_type=CreditEntryType.MONTHLY_GRANT,
                        description=f"{plan_config.label} welcome credits",
                    )
            else:
                if desired_plan and desired_plan != identity.plan:
                    identity.plan = desired_plan
                    identity.subscription_status = (
                        SubscriptionStatus.ACTIVE
                        if desired_plan in {IdentityPlan.CREATOR, IdentityPlan.PRO}
                        else SubscriptionStatus.NONE
                    )
                    upgraded_plan = self._PLAN_CATALOG[desired_plan]
                    identity.monthly_credit_allowance = upgraded_plan.monthly_credits
                    identity.monthly_credits_remaining = max(identity.monthly_credits_remaining, upgraded_plan.monthly_credits)
                else:
                    current_plan = self._PLAN_CATALOG[identity.plan]
                    if not (identity.owner_mode or identity.root_admin or identity.local_access):
                        identity.monthly_credit_allowance = current_plan.monthly_credits
                        identity.monthly_credits_remaining = min(
                            max(identity.monthly_credits_remaining, 0),
                            current_plan.monthly_credits + max(identity.extra_credits, 0),
                        )
                        if (
                            identity.plan not in {IdentityPlan.CREATOR, IdentityPlan.PRO}
                            and identity.subscription_status not in {
                                SubscriptionStatus.CANCELED,
                                SubscriptionStatus.PAUSED,
                                SubscriptionStatus.PAST_DUE,
                            }
                        ):
                            identity.subscription_status = SubscriptionStatus.NONE
                identity.email = email or identity.email
                if not (identity.display_name or "").strip():
                    identity.display_name = display_name or identity.display_name or "Creator"
                if username and not (identity.username or "").strip():
                    identity.username = username.strip().lower()
                elif not identity.username:
                    identity.username = (identity.email.split("@")[0] or "creator").strip().lower()
                identity.owner_mode = identity.owner_mode or owner_mode
                identity.root_admin = identity.root_admin or root_admin
                identity.local_access = identity.local_access or local_access
                self._apply_consent_audit_fields(
                    identity,
                    now=now,
                    accepted_terms=accepted_terms,
                    accepted_terms_at=accepted_terms_at,
                    terms_version=terms_version,
                    accepted_privacy=accepted_privacy,
                    accepted_privacy_at=accepted_privacy_at,
                    privacy_version=privacy_version,
                    accepted_usage_policy=accepted_usage_policy,
                    accepted_usage_policy_at=accepted_usage_policy_at,
                    usage_policy_version=usage_policy_version,
                    marketing_opt_in=marketing_opt_in,
                    marketing_opt_in_at=marketing_opt_in_at,
                    marketing_consent_version=marketing_consent_version,
                )
                identity.bio = bio or identity.bio
                identity.avatar_url = avatar_url or identity.avatar_url
                identity.profile_featured_asset_id = featured_asset_id or identity.profile_featured_asset_id
                if default_visibility is not None:
                    identity.default_visibility = default_visibility

                if privileged_flags["is_owner"]:
                    self._apply_privileged_identity_overrides(identity)

                identity.updated_at = now
                state.identities[identity.id] = identity

                if identity.workspace_id not in state.workspaces:
                    state.workspaces[identity.workspace_id] = StudioWorkspace(
                        id=identity.workspace_id,
                        identity_id=identity.id,
                        name=f"{identity.display_name}'s Studio",
                    )

            holder["identity"] = identity.model_copy(deep=True)

        await self.service.store.mutate(mutation)
        deleted_tombstone = holder.get("deleted_tombstone")
        if isinstance(deleted_tombstone, DeletedIdentityTombstone):
            raise DeletedIdentityError(
                user_id,
                deleted_at=deleted_tombstone.deleted_at,
            )
        return holder["identity"]


    def _resolve_privileged_email_flags(self, email: str) -> Dict[str, bool]:
        normalized_email = (email or "").strip().lower()
        owner_emails = set(self.service.settings.owner_emails_list)
        root_admin_emails = set(self.service.settings.root_admin_emails_list)
        is_root_admin = normalized_email in root_admin_emails or normalized_email in owner_emails
        is_owner = normalized_email in owner_emails or is_root_admin
        return {
            "is_owner": is_owner,
            "is_root_admin": is_root_admin,
        }


    def _apply_privileged_identity_overrides(self, identity: OmniaIdentity) -> None:
        identity.plan = IdentityPlan.PRO
        identity.owner_mode = True
        identity.root_admin = True
        identity.local_access = True
        identity.subscription_status = SubscriptionStatus.ACTIVE
        identity.monthly_credits_remaining = 999999999
        identity.monthly_credit_allowance = 999999999
        identity.extra_credits = 999999999



    def _serialize_identity_payload(self, identity: OmniaIdentity) -> Dict[str, Any]:
        payload = identity.model_dump(
            mode="json",
            exclude={"flag_count", "last_flagged_at", "last_flagged_reason"},
        )
        payload["manual_review_state"] = identity.manual_review_state.value
        return payload


    def _auth_provider_context_for_user(self, auth_user: Any | None) -> Dict[str, Any]:
        metadata = getattr(auth_user, "metadata", {}) or {}

        auth_providers: list[str] = []
        raw_providers = metadata.get("auth_providers")
        if isinstance(raw_providers, (list, tuple, set)):
            for provider_name in raw_providers:
                if not isinstance(provider_name, str):
                    continue
                normalized = provider_name.strip().lower()
                if normalized and normalized not in auth_providers:
                    auth_providers.append(normalized)

        raw_primary_provider = metadata.get("auth_provider")
        auth_provider = raw_primary_provider.strip().lower() if isinstance(raw_primary_provider, str) else None
        if auth_provider and auth_provider not in auth_providers:
            auth_providers.insert(0, auth_provider)
        if not auth_provider and auth_providers:
            auth_provider = auth_providers[0]

        return {
            "auth_provider": auth_provider,
            "auth_providers": auth_providers,
            "credentials_managed_by_provider": bool(auth_provider and auth_provider != "email"),
        }


    def _serialize_guest_identity_payload(self) -> Dict[str, Any]:
        return {
            "id": "guest",
            "email": "",
            "display_name": "Guest",
            "username": None,
            "plan": IdentityPlan.GUEST.value,
            "owner_mode": False,
            "root_admin": False,
            "local_access": False,
            "accepted_terms": False,
            "accepted_terms_at": None,
            "terms_version": None,
            "accepted_privacy": False,
            "accepted_privacy_at": None,
            "privacy_version": None,
            "accepted_usage_policy": False,
            "accepted_usage_policy_at": None,
            "usage_policy_version": None,
            "marketing_opt_in": False,
            "marketing_opt_in_at": None,
            "marketing_consent_version": None,
            "workspace_id": None,
            "temp_block_until": None,
            "manual_review_state": ManualReviewState.NONE.value,
        }


    def _account_tier_for_plan(self, plan: IdentityPlan) -> str:
        return plan.value


    def _subscription_tier_for_identity(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> str | None:
        effective_plan = billing_state.effective_plan if billing_state is not None else identity.plan
        if effective_plan in {IdentityPlan.CREATOR, IdentityPlan.PRO} and identity.subscription_status == SubscriptionStatus.ACTIVE:
            return effective_plan.value
        return None


    def _serialize_wallet_payload(self, billing_state: BillingStateSnapshot) -> Dict[str, Any]:
        return {
            "balance": billing_state.extra_credits,
            "wallet_balance": billing_state.extra_credits,
            "included_monthly_allowance": billing_state.monthly_allowance,
            "included_monthly_remaining": billing_state.monthly_remaining,
            "reserved_total": billing_state.reserved_total,
            "available_to_spend": billing_state.available_to_spend,
            "spend_order": billing_state.spend_order,
            "unlimited": billing_state.unlimited,
        }


    def _serialize_usage_caps(self, plan: PlanCatalogEntry) -> Dict[str, Any]:
        return {
            "queue_priority": plan.queue_priority,
            "max_incomplete_generations": plan.max_incomplete_generations,
            "generation_submit_window_seconds": plan.generation_submit_window_seconds,
            "generation_submit_limit": plan.generation_submit_limit,
            "chat_message_limit": plan.chat_message_limit,
            "max_chat_attachments": plan.max_chat_attachments,
            "requires_verified_account_for_generation": True,
            "free_image_generation_included": False,
            "wallet_credit_purchase_allowed": True,
        }


    def _log_security_event(
        self,
        event: str,
        *,
        level: int = logging.INFO,
        **fields: Any,
    ) -> None:
        payload = {"event": event, **fields}
        logger.log(level, "security_event %s", json.dumps(payload, ensure_ascii=True, sort_keys=True))


    def _resolve_consent_version(self, configured_version: str | None, fallback: str) -> str:
        candidate = (configured_version or "").strip()
        return candidate or fallback


    def _apply_consent_audit_fields(
        self,
        identity: OmniaIdentity,
        *,
        now: datetime,
        accepted_terms: bool,
        accepted_terms_at: datetime | str | None,
        terms_version: str | None,
        accepted_privacy: bool,
        accepted_privacy_at: datetime | str | None,
        privacy_version: str | None,
        accepted_usage_policy: bool,
        accepted_usage_policy_at: datetime | str | None,
        usage_policy_version: str | None,
        marketing_opt_in: bool,
        marketing_opt_in_at: datetime | str | None,
        marketing_consent_version: str | None,
    ) -> None:
        if accepted_terms:
            identity.accepted_terms = True
        if identity.accepted_terms:
            if identity.accepted_terms_at is None:
                identity.accepted_terms_at = _coerce_optional_datetime(accepted_terms_at) or identity.created_at or now
            if not identity.terms_version:
                identity.terms_version = self._resolve_consent_version(terms_version, TERMS_VERSION)

        if accepted_privacy:
            identity.accepted_privacy = True
        if identity.accepted_privacy:
            if identity.accepted_privacy_at is None:
                identity.accepted_privacy_at = _coerce_optional_datetime(accepted_privacy_at) or identity.created_at or now
            if not identity.privacy_version:
                identity.privacy_version = self._resolve_consent_version(privacy_version, PRIVACY_VERSION)

        if accepted_usage_policy:
            identity.accepted_usage_policy = True
        if identity.accepted_usage_policy:
            if identity.accepted_usage_policy_at is None:
                identity.accepted_usage_policy_at = _coerce_optional_datetime(accepted_usage_policy_at) or identity.created_at or now
            if not identity.usage_policy_version:
                identity.usage_policy_version = self._resolve_consent_version(usage_policy_version, USAGE_POLICY_VERSION)

        if marketing_opt_in:
            identity.marketing_opt_in = True
        if identity.marketing_opt_in:
            if identity.marketing_opt_in_at is None:
                identity.marketing_opt_in_at = _coerce_optional_datetime(marketing_opt_in_at) or identity.created_at or now
            if not identity.marketing_consent_version:
                identity.marketing_consent_version = self._resolve_consent_version(
                    marketing_consent_version,
                    MARKETING_CONSENT_VERSION,
                )


    def _apply_identity_moderation_flag_locked(
        self,
        identity: OmniaIdentity,
        *,
        moderation_result: ModerationResult,
        reason_code: str,
    ) -> Dict[str, Any]:
        now = utc_now()
        strike_delta = 2 if moderation_result == ModerationResult.HARD_BLOCK else 1
        if identity.last_flagged_at is None or (now - identity.last_flagged_at) > self._MODERATION_RESET_WINDOW:
            next_count = strike_delta
        else:
            next_count = max(identity.flag_count, 0) + strike_delta

        identity.flag_count = next_count
        identity.last_flagged_at = now
        identity.last_flagged_reason = reason_code

        temp_block_applied = False
        manual_review_applied = False
        block_until: datetime | None = None

        if next_count >= 5:
            block_until = now + self._TEMP_BLOCK_AFTER_FIVE_STRIKES
            manual_review_applied = identity.manual_review_state != ManualReviewState.REQUIRED
            identity.manual_review_state = ManualReviewState.REQUIRED
        elif next_count >= 3:
            block_until = now + self._TEMP_BLOCK_AFTER_THREE_STRIKES

        if block_until is not None and (
            identity.temp_block_until is None or identity.temp_block_until < block_until
        ):
            identity.temp_block_until = block_until
            temp_block_applied = True

        return {
            "strike_delta": strike_delta,
            "flag_count": next_count,
            "reason_code": reason_code,
            "temp_block_until": identity.temp_block_until,
            "temp_block_applied": temp_block_applied,
            "manual_review_applied": manual_review_applied,
            "manual_review_state": identity.manual_review_state.value,
        }


    async def record_generation_moderation_block(
        self,
        identity_id: str,
        moderation_result: ModerationResult,
        reason: str | None,
    ) -> None:
        reason_code = self._normalize_moderation_reason(reason, moderation_result)
        holder: Dict[str, Any] = {}

        def mutation(state: StudioState) -> None:
            identity = state.identities.get(identity_id)
            if identity is None:
                return
            result = self._apply_identity_moderation_flag_locked(
                identity,
                moderation_result=moderation_result,
                reason_code=reason_code,
            )
            state.identities[identity.id] = identity
            holder.update(result)

        await self.service.store.mutate(mutation)
        self._log_security_event(
            "generation_moderation_block",
            level=logging.WARNING,
            identity_id=identity_id,
            moderation_result=moderation_result.value,
            reason_code=reason_code,
            strike_delta=holder.get("strike_delta", 0),
            flag_count=holder.get("flag_count", 0),
        )
        if holder.get("temp_block_applied"):
            self._log_security_event(
                "identity_temp_blocked",
                level=logging.WARNING,
                identity_id=identity_id,
                reason_code=reason_code,
                temp_block_until=holder["temp_block_until"].isoformat() if holder.get("temp_block_until") else None,
            )
        if holder.get("manual_review_applied"):
            self._log_security_event(
                "identity_manual_review_required",
                level=logging.WARNING,
                identity_id=identity_id,
                reason_code=reason_code,
            )
        await self.service.moderation_cases.record_generation_block_case(
            identity_id=identity_id,
            decision_tier=moderation_result.value,
            reason_code=reason_code,
            prompt=reason,
        )


    def _assert_identity_action_allowed(
        self,
        identity: OmniaIdentity,
        *,
        action_code: str,
        action_label: str,
    ) -> None:
        if identity.manual_review_state == ManualReviewState.REQUIRED:
            self._log_security_event(
                "identity_manual_review_required",
                level=logging.WARNING,
                identity_id=identity.id,
                action=action_code,
            )
            raise PermissionError(f"Account is pending manual review before {action_label}.")
        if identity.temp_block_until and identity.temp_block_until > utc_now():
            self._log_security_event(
                "identity_temp_blocked",
                level=logging.WARNING,
                identity_id=identity.id,
                action=action_code,
                temp_block_until=identity.temp_block_until.isoformat(),
            )
            raise PermissionError(f"Account is temporarily blocked from {action_label}.")


    def serialize_identity(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        resolved_billing_state = billing_state or resolve_billing_state(
            identity=identity,
            generation_jobs=(),
            plan_catalog=self._PLAN_CATALOG,
        )
        resolved_plan = self._PLAN_CATALOG[resolved_billing_state.effective_plan]
        entitlements = self.serialize_entitlements(identity, billing_state=resolved_billing_state)
        return {
            "guest": False,
            "identity": self._serialize_identity_payload(identity),
            "credits": {
                "remaining": resolved_billing_state.gross_remaining,
                "monthly_remaining": resolved_billing_state.monthly_remaining,
                "extra_credits": resolved_billing_state.extra_credits,
            },
            "plan": resolved_plan.model_dump(mode="json"),
            "entitlements": entitlements,
            "account_tier": self._account_tier_for_plan(resolved_billing_state.effective_plan),
            "subscription_tier": self._subscription_tier_for_identity(identity, billing_state=resolved_billing_state),
            "wallet_balance": resolved_billing_state.extra_credits,
            "wallet": self._serialize_wallet_payload(resolved_billing_state),
            "feature_entitlements": entitlements,
            "usage_caps": self._serialize_usage_caps(resolved_plan),
        }


    def serialize_entitlements(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        return resolve_entitlements(
            identity=identity,
            plan_catalog=self._PLAN_CATALOG,
            billing_state=billing_state,
        ).to_dict()


    def serialize_usage_summary(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        resolved_billing_state = billing_state or resolve_billing_state(
            identity=identity,
            generation_jobs=(),
            plan_catalog=self._PLAN_CATALOG,
        )
        allowance = max(resolved_billing_state.monthly_allowance, 0)
        remaining = resolved_billing_state.gross_remaining
        consumed = max(resolved_billing_state.monthly_allowance - resolved_billing_state.monthly_remaining, 0)
        progress = 0 if allowance <= 0 else max(0, min(100, round((consumed / allowance) * 100)))
        next_reset = (
            identity.last_credit_refresh_at.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            + timedelta(days=32)
        ).replace(day=1)
        return {
            "plan_label": self._PLAN_CATALOG[resolved_billing_state.effective_plan].label,
            "credits_remaining": remaining,
            "allowance": allowance,
            "reset_at": next_reset.isoformat(),
            "progress_percent": progress,
            "gross_remaining": resolved_billing_state.gross_remaining,
            "reserved_total": resolved_billing_state.reserved_total,
            "available_to_spend": resolved_billing_state.available_to_spend,
            "monthly_remaining": resolved_billing_state.monthly_remaining,
            "extra_credits": resolved_billing_state.extra_credits,
            "spend_order": resolved_billing_state.spend_order,
            "unlimited": resolved_billing_state.unlimited,
        }


    def _initialize_state_locked(self, state: StudioState) -> None:
        self._migrate_identity_visibility_defaults_locked(state)
        self.service.public.backfill_posts_locked(state)
        self.service.public.normalize_public_posts_locked(state)


    def _migrate_identity_visibility_defaults_locked(self, state: StudioState) -> None:
        migration_key = "visibility_defaults_v1"
        if migration_key in state.migrations_applied:
            return
        now = utc_now()
        for identity in state.identities.values():
            if identity.default_visibility == Visibility.PUBLIC:
                identity.default_visibility = Visibility.PRIVATE
                identity.updated_at = now
        state.migrations_applied[migration_key] = now.isoformat()


    def get_public_plan_payload(self) -> Dict[str, Any]:
        def serialize_plan_entry(plan_id: IdentityPlan) -> Dict[str, Any]:
            plan = self._PLAN_CATALOG[plan_id]
            public_meta = self._PUBLIC_PLAN_CATALOG[plan_id]
            return {
                **plan.model_dump(mode="json"),
                "id": public_meta["public_id"],
                "entitlement_plan": plan_id.value,
                "summary": public_meta["summary"],
                "feature_summary": list(public_meta["feature_summary"]),
                "price_usd": public_meta["price_usd"],
                "billing_period": public_meta["billing_period"],
                "checkout_kind": public_meta["checkout_kind"],
                "recommended": public_meta["recommended"],
                "availability": public_meta["availability"],
            }

        subscriptions = [
            serialize_plan_entry(IdentityPlan.CREATOR),
            serialize_plan_entry(IdentityPlan.PRO),
        ]
        credit_packs = [
            {"kind": kind.value, **meta}
            for kind, meta in self._CHECKOUT_CATALOG.items()
            if meta["plan"] is None
        ]
        free_account = serialize_plan_entry(IdentityPlan.FREE)
        featured_subscription = self._PUBLIC_PLAN_CATALOG[IdentityPlan.PRO]["public_id"]

        return {
            "operating_mode": "controlled_public_paid_launch",
            "free_account": free_account,
            "subscriptions": subscriptions,
            "credit_packs": credit_packs,
            "wallet": {
                "contract": "subscription_plus_wallet",
                "free_account_can_buy_credit_packs": True,
                "image_generation_requires_credits_or_included_allowance": True,
                "spend_order": "monthly_then_extra",
                "free_image_generation_included": False,
            },
            "entitlements": {
                IdentityPlan.FREE.value: self._serialize_usage_caps(self._PLAN_CATALOG[IdentityPlan.FREE]),
                IdentityPlan.CREATOR.value: self._serialize_usage_caps(self._PLAN_CATALOG[IdentityPlan.CREATOR]),
                IdentityPlan.PRO.value: self._serialize_usage_caps(self._PLAN_CATALOG[IdentityPlan.PRO]),
            },
            "usage_caps": {
                "verified_account_required_for_generation": True,
                "captcha_required_for_sensitive_flows": True,
                "free_ai_chat_limited": False,
                "free_image_generation_included": False,
                "wallet_credit_purchase_allowed": True,
                "credit_reserve_required_before_generation": True,
            },
            "featured_subscription": featured_subscription,
            # Legacy aliases kept temporarily so older clients do not explode mid-migration.
            "plans": [free_account, *subscriptions],
            "top_up": {
                **self._PUBLIC_TOP_UP_GROUP,
                "options": credit_packs,
            },
            "featured_plan": featured_subscription,
        }


    async def get_profile_payload(
        self,
        *,
        username: Optional[str] = None,
        identity_id: Optional[str] = None,
        viewer_identity_id: Optional[str] = None,
        limit: Optional[int] = None,
        force_public: bool = False,
    ) -> Dict[str, Any]:
        if username:
            identity = await self.get_identity_by_username(username)
        elif identity_id:
            identity = await self.get_identity(identity_id)
        else:
            raise KeyError("Profile not found")

        posts, assets, generations = await asyncio.gather(
            self.service.store.list_posts_for_identity(identity.id),
            self.service.store.list_assets_for_identity(identity.id),
            self.service.store.list_generations_for_identity(identity.id),
        )
        assets_by_id = {asset.id: asset for asset in assets}
        generations_by_id = {generation.id: generation for generation in generations}
        own_profile = bool(not force_public and viewer_identity_id and viewer_identity_id == identity.id)

        visible_posts = []
        public_post_count = 0
        for post in posts:
            has_truthful_assets = any(
                asset_id in assets_by_id
                and assets_by_id[asset_id].deleted_at is None
                and self._is_truthful_surface_asset(assets_by_id[asset_id])
                for asset_id in post.asset_ids
            )
            if not has_truthful_assets:
                continue

            publicly_visible = (
                post.visibility == Visibility.PUBLIC
                and not self._should_hide_post_from_public(
                    post,
                    identity=identity,
                    generations_by_id=generations_by_id,
                )
                and self._is_publicly_showcase_ready_post(post)
            )
            if publicly_visible:
                public_post_count += 1

            if not own_profile and not publicly_visible:
                continue
            visible_posts.append(post)

        visible_posts.sort(key=lambda item: item.created_at, reverse=True)
        visible_asset_ids: list[str] = []
        for post in visible_posts:
            if post.cover_asset_id:
                visible_asset_ids.append(post.cover_asset_id)
            visible_asset_ids.extend(post.asset_ids)

        featured_asset: MediaAsset | None = None
        if own_profile and identity.profile_featured_asset_id:
            candidate = assets_by_id.get(identity.profile_featured_asset_id)
            if (
                candidate is not None
                and candidate.deleted_at is None
                and self._is_truthful_surface_asset(candidate)
                and self.service.library.asset_has_renderable_variant(candidate)
            ):
                featured_asset = candidate
        elif identity.profile_featured_asset_id and identity.profile_featured_asset_id in visible_asset_ids:
            candidate = assets_by_id.get(identity.profile_featured_asset_id)
            if (
                candidate is not None
                and candidate.deleted_at is None
                and self._is_truthful_surface_asset(candidate)
                and self.service.library.asset_has_renderable_variant(candidate)
            ):
                featured_asset = candidate

        if featured_asset is None:
            seen_asset_ids: set[str] = set()
            for asset_id in visible_asset_ids:
                if asset_id in seen_asset_ids:
                    continue
                seen_asset_ids.add(asset_id)
                candidate = assets_by_id.get(asset_id)
                if candidate is None or candidate.deleted_at is not None:
                    continue
                if not (
                    self._is_truthful_surface_asset(candidate)
                    and self.service.library.asset_has_renderable_variant(candidate)
                ):
                    continue
                featured_asset = candidate
                break

        billing_state = await self._resolve_billing_state_for_identity(identity) if own_profile else None
        posts_for_payload = visible_posts
        if limit is not None:
            posts_for_payload = visible_posts[:limit]

        featured_asset_position = identity.profile_featured_asset_position
        if featured_asset_position not in _PROFILE_FEATURED_ASSET_POSITIONS:
            featured_asset_position = "center"

        return {
            "profile": {
                "display_name": identity.display_name,
                "username": identity.username or identity.email.split("@")[0],
                "avatar_url": identity.avatar_url,
                "bio": identity.bio,
                "plan": identity.plan.value,
                "default_visibility": identity.default_visibility.value if own_profile else None,
                "featured_asset_id": identity.profile_featured_asset_id if own_profile else None,
                "featured_asset_position": featured_asset_position,
                "usage_summary": self.serialize_usage_summary(identity, billing_state=billing_state) if own_profile else None,
                "public_post_count": public_post_count,
            },
            "featured_asset": self.serialize_asset(featured_asset, identity_id=viewer_identity_id)
            if featured_asset is not None
            else None,
            "posts": [
                self.serialize_post(
                    post,
                    assets_by_id=assets_by_id,
                    identities_by_id={identity.id: identity},
                    viewer_identity_id=viewer_identity_id,
                    public_preview=not own_profile,
                )
                for post in posts_for_payload
            ],
            "own_profile": own_profile,
            "can_edit": own_profile,
        }


    async def update_profile(
        self,
        identity_id: str,
        *,
        display_name: Optional[str] = None,
        bio: Optional[str] = None,
        default_visibility: Optional[Visibility] = None,
        featured_asset_id: Optional[str] = None,
        featured_asset_id_provided: bool = False,
        featured_asset_position: Optional[str] = None,
    ) -> OmniaIdentity:
        identity = await self.get_identity(identity_id)
        cleaned_name: str | None = None
        selected_featured_asset: MediaAsset | None = None

        if display_name is not None:
            cleaned_name = re.sub(r"\s+", " ", display_name).strip()[:120]
            if not cleaned_name:
                raise ValueError("Display name cannot be blank.")

            moderation_result, _ = check_display_name_safety(cleaned_name)
            if moderation_result != ModerationResult.SAFE:
                raise ValueError("That display name is not allowed. Choose a different one.")

        if featured_asset_position is not None and featured_asset_position not in _PROFILE_FEATURED_ASSET_POSITIONS:
            raise ValueError("Choose a valid profile artwork crop.")

        if featured_asset_id_provided and featured_asset_id is not None:
            selected_featured_asset = await self.service.store.get_model("assets", featured_asset_id, MediaAsset)
            if selected_featured_asset is None:
                raise ValueError("Choose one of your Studio images for the profile header.")
            if selected_featured_asset.identity_id != identity.id or selected_featured_asset.deleted_at is not None:
                raise ValueError("Choose one of your Studio images for the profile header.")
            if not (
                self.service.library.is_truthful_surface_asset(selected_featured_asset)
                and self.service.library.asset_has_renderable_variant(selected_featured_asset)
            ):
                raise ValueError("Choose a finished Studio image for the profile header.")

        def mutation(state: StudioState) -> None:
            current = state.identities[identity.id]
            if cleaned_name is not None:
                current.display_name = cleaned_name
            if bio is not None:
                current.bio = bio.strip()[:220]
            if default_visibility is not None:
                current.default_visibility = default_visibility
            if featured_asset_id_provided:
                current.profile_featured_asset_id = selected_featured_asset.id if selected_featured_asset is not None else None
                if selected_featured_asset is None:
                    current.profile_featured_asset_position = "center"
            if featured_asset_position is not None and current.profile_featured_asset_id is not None:
                current.profile_featured_asset_position = featured_asset_position
            current.updated_at = utc_now()
            state.identities[current.id] = current

            workspace = state.workspaces.get(current.workspace_id)
            if workspace is not None:
                workspace.name = f"{current.display_name}'s Studio"
                state.workspaces[workspace.id] = workspace

            for post in state.posts.values():
                if post.identity_id != current.id:
                    continue
                post.owner_display_name = current.display_name
                post.owner_username = current.username or current.email.split("@")[0]
                post.updated_at = utc_now()

        await self.service.store.mutate(mutation)
        refreshed = await self.service.store.get_model("identities", identity.id, OmniaIdentity)
        if refreshed is None:
            raise KeyError("Identity not found")
        return refreshed


    async def get_identity(self, identity_id: str) -> OmniaIdentity:
        identity = await self.service.store.get_model("identities", identity_id, OmniaIdentity)
        if identity is None:
            raise KeyError("Identity not found")
        await self.ensure_identity(
            user_id=identity.id,
            email=identity.email,
            display_name=identity.display_name,
            username=identity.username,
            desired_plan=identity.plan,
            owner_mode=identity.owner_mode,
            root_admin=identity.root_admin,
            local_access=identity.local_access,
            accepted_terms=identity.accepted_terms,
            accepted_privacy=identity.accepted_privacy,
            accepted_usage_policy=identity.accepted_usage_policy,
            marketing_opt_in=identity.marketing_opt_in,
            bio=identity.bio,
            avatar_url=identity.avatar_url,
            featured_asset_id=identity.profile_featured_asset_id,
            default_visibility=identity.default_visibility,
        )
        refreshed = await self.service.store.get_model("identities", identity_id, OmniaIdentity)
        if refreshed is None:
            raise KeyError("Identity not found after refresh")
        return refreshed


    async def get_identity_by_username(self, username: str) -> OmniaIdentity:
        identity = await self.service.store.find_identity_by_username(username)
        if identity is not None:
            return identity
        raise KeyError("Identity not found")



    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        """GDPR compliant export of all user data in JSON structure."""
        identity = await self.get_identity(identity_id)
        assets = await self.service.store.list_assets_for_identity(identity_id)
        posts = await self.service.store.list_posts_for_identity(identity_id)
        assets_by_id = await self.service.store.get_asset_map()
        identities_by_id = await self.service.store.get_identity_map()
        return build_identity_export(
            identity=identity,
            identity_id=identity_id,
            assets=assets,
            posts=posts,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
            serialize_asset=lambda asset, viewer_identity_id: self.serialize_asset(asset, identity_id=viewer_identity_id),
            serialize_post=lambda post, assets_by_id, identities_by_id, viewer_identity_id: self.serialize_post(
                post,
                assets_by_id=assets_by_id,
                identities_by_id=identities_by_id,
                viewer_identity_id=viewer_identity_id,
            ),
        )


    async def permanently_delete_identity(self, identity_id: str) -> bool:
        """Deep purge an identity and all belonging assets from DB and Supabase Auth."""
        identity = await self.get_identity(identity_id)
        assets_to_delete = await self.service.store.list_assets_for_identity(identity_id)
        for asset in assets_to_delete:
            await self._purge_asset_storage(asset)

        def mutation(state: StudioState) -> None:
            purge_identity_state(state, identity_id, assets_to_delete)
            state.deleted_identity_tombstones[identity_id] = DeletedIdentityTombstone(
                id=identity_id,
                identity_id=identity_id,
                email=identity.email,
                deleted_at=utc_now(),
            )

        await self.service.store.mutate(mutation)

        settings = get_settings()
        service_role_key = reveal_secret_with_audit(
            "SUPABASE_SERVICE_ROLE_KEY",
            settings.supabase_service_role_key,
        )
        if settings.supabase_url and service_role_key:
            try:
                # Make admin delete request to auth db
                url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{identity_id}"
                headers = {
                    "apikey": service_role_key,
                    "Authorization": f"Bearer {service_role_key}"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.delete(url, headers=headers)
            except (ImportError, httpx.HTTPError) as e:
                import logging
                logging.getLogger(__name__).warning("Failed to delete user from Supabase auth: %s", e)
                
        return True
