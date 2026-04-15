from __future__ import annotations

from typing import Any

from config.env import get_settings

from .models import CheckoutKind, IdentityPlan, PlanCatalogEntry


def build_plan_catalog(settings=None) -> dict[IdentityPlan, PlanCatalogEntry]:
    settings = settings or get_settings()
    return {
        IdentityPlan.GUEST: PlanCatalogEntry(
            id=IdentityPlan.GUEST,
            label="Guest",
            monthly_credits=0,
            queue_priority="browse-only",
            max_incomplete_generations=0,
            generation_submit_window_seconds=60,
            generation_submit_limit=0,
            max_resolution="preview only",
            can_access_chat=False,
            premium_chat=False,
            chat_modes=[],
            chat_message_limit=0,
            max_chat_attachments=0,
            clean_exports=False,
            share_links=False,
            can_generate=False,
        ),
        IdentityPlan.FREE: PlanCatalogEntry(
            id=IdentityPlan.FREE,
            label="Free Account",
            monthly_credits=0,
            queue_priority="standard",
            max_incomplete_generations=1,
            generation_submit_window_seconds=60,
            generation_submit_limit=2,
            max_resolution="1024x1024",
            can_access_chat=False,
            premium_chat=False,
            chat_modes=[],
            chat_message_limit=settings.free_account_chat_message_limit,
            max_chat_attachments=0,
            clean_exports=False,
            share_links=False,
            can_generate=True,
        ),
        IdentityPlan.CREATOR: PlanCatalogEntry(
            id=IdentityPlan.CREATOR,
            label="Creator",
            monthly_credits=settings.creator_monthly_credits,
            queue_priority="standard",
            max_incomplete_generations=4,
            generation_submit_window_seconds=60,
            generation_submit_limit=8,
            max_resolution="1024x1024",
            can_access_chat=True,
            premium_chat=False,
            chat_modes=["think", "vision"],
            chat_message_limit=settings.creator_chat_message_limit,
            max_chat_attachments=2,
            clean_exports=False,
            share_links=True,
            can_generate=True,
        ),
        IdentityPlan.PRO: PlanCatalogEntry(
            id=IdentityPlan.PRO,
            label="Pro",
            monthly_credits=settings.pro_monthly_credits,
            queue_priority="priority",
            max_incomplete_generations=6,
            generation_submit_window_seconds=60,
            generation_submit_limit=12,
            max_resolution="1536x1536",
            can_access_chat=True,
            premium_chat=True,
            chat_modes=["think", "vision", "edit"],
            chat_message_limit=settings.pro_chat_message_limit,
            max_chat_attachments=4,
            clean_exports=True,
            share_links=True,
            can_generate=True,
        ),
    }


PRESET_CATALOG: list[dict[str, Any]] = [
    {
        "id": "cinematic",
        "label": "Cinematic",
        "description": "Moody contrast, richer highlights, stronger composition.",
        "defaults": {"steps": 30, "cfg_scale": 6.5, "aspect_ratio": "16:9"},
    },
    {
        "id": "portrait",
        "label": "Portrait",
        "description": "Sharper faces and centered subject framing.",
        "defaults": {"steps": 28, "cfg_scale": 7.0, "aspect_ratio": "3:4"},
    },
    {
        "id": "editorial",
        "label": "Editorial",
        "description": "Premium product and campaign visuals with clean light.",
        "defaults": {"steps": 32, "cfg_scale": 6.0, "aspect_ratio": "4:5"},
    },
]


def build_checkout_catalog(settings=None) -> dict[CheckoutKind, dict[str, Any]]:
    settings = settings or get_settings()
    return {
        CheckoutKind.CREATOR_MONTHLY: {
            "label": "Creator monthly",
            "credits": settings.creator_monthly_credits,
            "price_usd": settings.creator_monthly_price_usd,
            "plan": IdentityPlan.CREATOR,
            "billing_provider": "paddle",
            "kind_group": "subscription",
        },
        CheckoutKind.PRO_MONTHLY: {
            "label": "Pro monthly",
            "credits": settings.pro_monthly_credits,
            "price_usd": settings.pro_monthly_price_usd,
            "plan": IdentityPlan.PRO,
            "billing_provider": "paddle",
            "kind_group": "subscription",
        },
        CheckoutKind.CREDIT_PACK_SMALL: {
            "label": f"Credit pack {settings.credit_pack_small_credits}",
            "credits": settings.credit_pack_small_credits,
            "price_usd": settings.credit_pack_small_price_usd,
            "plan": None,
            "billing_provider": "paddle",
            "kind_group": "credit_pack",
        },
        CheckoutKind.CREDIT_PACK_LARGE: {
            "label": f"Credit pack {settings.credit_pack_large_credits}",
            "credits": settings.credit_pack_large_credits,
            "price_usd": settings.credit_pack_large_price_usd,
            "plan": None,
            "billing_provider": "paddle",
            "kind_group": "credit_pack",
        },
    }


def build_public_plan_catalog(
    settings=None,
    *,
    checkout_catalog: dict[CheckoutKind, dict[str, Any]] | None = None,
) -> dict[IdentityPlan, dict[str, Any]]:
    settings = settings or get_settings()
    checkout_catalog = checkout_catalog or build_checkout_catalog(settings)
    return {
        IdentityPlan.FREE: {
            "public_id": "free_account",
            "summary": "Free accounts can use Create with wallet credits, but Studio chat unlocks only on paid plans and image generation is never bundled for free at launch.",
            "feature_summary": [
                "Direct Create access on the same Studio account",
                "Studio chat stays locked on the free account",
                "No bundled image generation credits",
                "Can buy wallet credit packs without a subscription",
                "Projects, library, and saved styles stay on the same account",
            ],
            "price_usd": 0,
            "billing_period": None,
            "checkout_kind": None,
            "recommended": False,
            "availability": "included",
        },
        IdentityPlan.CREATOR: {
            "public_id": "creator",
            "summary": "Paid everyday plan for Create plus Chat with recurring credits and a durable wallet-backed workflow.",
            "feature_summary": [
                "Recurring monthly credits",
                "Standard Studio chat",
                "Core Create, Library, Project, and share workflow",
                "Add wallet credit packs for heavier bursts",
            ],
            "price_usd": checkout_catalog[CheckoutKind.CREATOR_MONTHLY]["price_usd"],
            "billing_period": "month",
            "checkout_kind": CheckoutKind.CREATOR_MONTHLY.value,
            "recommended": False,
            "availability": "self_serve",
        },
        IdentityPlan.PRO: {
            "public_id": "pro",
            "summary": "Premium subscription for higher limits, premium chat lanes, and the strongest Studio execution path.",
            "feature_summary": [
                "Larger recurring monthly credits",
                "Premium chat lanes",
                "Higher generation and queue limits",
                "Clean exports and fuller sharing access",
            ],
            "price_usd": checkout_catalog[CheckoutKind.PRO_MONTHLY]["price_usd"],
            "billing_period": "month",
            "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
            "recommended": True,
            "availability": "self_serve",
        },
    }


def build_public_credit_pack_group(settings=None) -> dict[str, Any]:
    settings = settings or get_settings()
    return {
        "id": "credit_packs",
        "label": "Credit Packs",
        "summary": "One-off wallet credits for free, Creator, or Pro accounts whenever usage spikes past the included allowance.",
        "feature_summary": [
            "Wallet balance is separate from subscription tier",
            "Free accounts may buy packs without subscribing",
            "Credits are reserved before generation starts",
        ],
        "defaults": {
            "small_credits": settings.credit_pack_small_credits,
            "large_credits": settings.credit_pack_large_credits,
        },
    }


PLAN_CATALOG: dict[IdentityPlan, PlanCatalogEntry] = build_plan_catalog()
CHECKOUT_CATALOG: dict[CheckoutKind, dict[str, Any]] = build_checkout_catalog()
PUBLIC_PLAN_CATALOG: dict[IdentityPlan, dict[str, Any]] = build_public_plan_catalog(
    checkout_catalog=CHECKOUT_CATALOG,
)
PUBLIC_TOP_UP_GROUP: dict[str, Any] = build_public_credit_pack_group()
