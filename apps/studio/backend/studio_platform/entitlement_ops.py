from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .models import ChatAttachment, IdentityPlan, OmniaIdentity, PlanCatalogEntry


@dataclass(slots=True)
class ResolvedEntitlements:
    plan: IdentityPlan
    queue_priority: str
    can_generate: bool
    can_access_chat: bool
    premium_chat: bool
    can_share_links: bool
    can_clean_export: bool
    allowed_chat_modes: tuple[str, ...]
    chat_message_limit: int
    max_chat_attachments: int
    monthly_credits: int
    monthly_credits_remaining: int
    extra_credits: int
    credits_remaining: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "plan": self.plan.value,
            "queue_priority": self.queue_priority,
            "can_generate": self.can_generate,
            "can_access_chat": self.can_access_chat,
            "premium_chat": self.premium_chat,
            "can_share_links": self.can_share_links,
            "can_clean_export": self.can_clean_export,
            "allowed_chat_modes": list(self.allowed_chat_modes),
            "chat_message_limit": self.chat_message_limit,
            "max_chat_attachments": self.max_chat_attachments,
            "monthly_credits": self.monthly_credits,
            "monthly_credits_remaining": self.monthly_credits_remaining,
            "extra_credits": self.extra_credits,
            "credits_remaining": self.credits_remaining,
        }


def resolve_entitlements(
    *,
    identity: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> ResolvedEntitlements:
    plan = plan_catalog[identity.plan]
    return ResolvedEntitlements(
        plan=identity.plan,
        queue_priority=plan.queue_priority,
        can_generate=plan.can_generate,
        can_access_chat=plan.can_access_chat,
        premium_chat=plan.premium_chat,
        can_share_links=plan.share_links,
        can_clean_export=plan.clean_exports,
        allowed_chat_modes=tuple(plan.chat_modes),
        chat_message_limit=plan.chat_message_limit,
        max_chat_attachments=plan.max_chat_attachments,
        monthly_credits=identity.monthly_credit_allowance,
        monthly_credits_remaining=identity.monthly_credits_remaining,
        extra_credits=identity.extra_credits,
        credits_remaining=identity.monthly_credits_remaining + identity.extra_credits,
    )


def resolve_guest_entitlements(
    *,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> dict[str, Any]:
    guest_plan = plan_catalog[IdentityPlan.GUEST]
    return {
        "plan": IdentityPlan.GUEST.value,
        "queue_priority": guest_plan.queue_priority,
        "can_generate": guest_plan.can_generate,
        "can_access_chat": guest_plan.can_access_chat,
        "premium_chat": guest_plan.premium_chat,
        "can_share_links": guest_plan.share_links,
        "can_clean_export": guest_plan.clean_exports,
        "allowed_chat_modes": list(guest_plan.chat_modes),
        "chat_message_limit": guest_plan.chat_message_limit,
        "max_chat_attachments": guest_plan.max_chat_attachments,
        "monthly_credits": 0,
        "monthly_credits_remaining": 0,
        "extra_credits": 0,
        "credits_remaining": 0,
    }


def ensure_chat_request_allowed(
    *,
    identity: OmniaIdentity,
    mode: str,
    attachments: Sequence[ChatAttachment],
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> ResolvedEntitlements:
    entitlements = resolve_entitlements(identity=identity, plan_catalog=plan_catalog)
    if not entitlements.can_access_chat:
        raise PermissionError("Studio chat is not available on this plan")
    if mode not in entitlements.allowed_chat_modes:
        if mode in {"vision", "edit"}:
            raise PermissionError("Vision and Edit chat require Pro")
        raise PermissionError("This chat mode is not available on your plan")
    if attachments and entitlements.max_chat_attachments <= 0:
        raise PermissionError("Image attachments in chat require Pro")
    if len(attachments) > entitlements.max_chat_attachments:
        raise ValueError(
            f"This plan supports up to {entitlements.max_chat_attachments} chat attachment(s) per turn"
        )
    return entitlements


def ensure_clean_export_allowed(
    *,
    identity: OmniaIdentity,
    plan_catalog: Mapping[IdentityPlan, PlanCatalogEntry],
) -> ResolvedEntitlements:
    entitlements = resolve_entitlements(identity=identity, plan_catalog=plan_catalog)
    if not entitlements.can_clean_export:
        raise PermissionError("Clean export requires Pro")
    return entitlements
