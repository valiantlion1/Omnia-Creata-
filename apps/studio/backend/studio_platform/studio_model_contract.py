from __future__ import annotations

from typing import Final

STUDIO_FAST_MODEL_ID: Final[str] = "flux-2-klein"
STUDIO_STANDARD_MODEL_ID: Final[str] = "flux-2-dev"
STUDIO_PREMIUM_MODEL_ID: Final[str] = "flux-2-pro"
STUDIO_SIGNATURE_MODEL_ID: Final[str] = "flux-2-flex"

STUDIO_MODEL_ID_ALIASES: Final[dict[str, str]] = {
    # Current canonical ids
    STUDIO_FAST_MODEL_ID: STUDIO_FAST_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID: STUDIO_STANDARD_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID: STUDIO_PREMIUM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID: STUDIO_SIGNATURE_MODEL_ID,
    # Legacy Studio ids kept for backwards compatibility
    "flux-schnell": STUDIO_FAST_MODEL_ID,
    "sdxl-base": STUDIO_STANDARD_MODEL_ID,
    "realvis-xl": STUDIO_PREMIUM_MODEL_ID,
    "juggernaut-xl": STUDIO_SIGNATURE_MODEL_ID,
    # Common operator/provider spellings
    "flux.2-klein": STUDIO_FAST_MODEL_ID,
    "flux-2-klein-9b": STUDIO_FAST_MODEL_ID,
    "flux2-klein": STUDIO_FAST_MODEL_ID,
    "flux2-klein-9b": STUDIO_FAST_MODEL_ID,
    "flux.2 [klein] 9b": STUDIO_FAST_MODEL_ID,
    "flux.2 dev": STUDIO_STANDARD_MODEL_ID,
    "flux.2-dev": STUDIO_STANDARD_MODEL_ID,
    "flux2-dev": STUDIO_STANDARD_MODEL_ID,
    "flux.2 [dev]": STUDIO_STANDARD_MODEL_ID,
    "flux.2 pro": STUDIO_PREMIUM_MODEL_ID,
    "flux.2-pro": STUDIO_PREMIUM_MODEL_ID,
    "flux2-pro": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 [pro]": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux.2-flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux2-flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux.2 [flex]": STUDIO_SIGNATURE_MODEL_ID,
}

STUDIO_MODEL_PRICING_LANES: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "draft",
    STUDIO_STANDARD_MODEL_ID: "standard",
    STUDIO_PREMIUM_MODEL_ID: "final",
    STUDIO_SIGNATURE_MODEL_ID: "final",
}

STUDIO_MODEL_OPENAI_QUALITY_HINTS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "low",
    STUDIO_STANDARD_MODEL_ID: "medium",
    STUDIO_PREMIUM_MODEL_ID: "high",
    STUDIO_SIGNATURE_MODEL_ID: "high",
}

STUDIO_RUNWARE_TEXT_MODEL_AIR_IDS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "runware:400@2",
    STUDIO_STANDARD_MODEL_ID: "runware:400@1",
    STUDIO_PREMIUM_MODEL_ID: "bfl:5@1",
    STUDIO_SIGNATURE_MODEL_ID: "bfl:6@1",
}

STUDIO_RUNWARE_REFERENCE_MODEL_AIR_IDS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "runware:400@2",
    STUDIO_STANDARD_MODEL_ID: "runware:400@1",
    STUDIO_PREMIUM_MODEL_ID: "bfl:5@1",
    STUDIO_SIGNATURE_MODEL_ID: "bfl:6@1",
}

STUDIO_RUNWARE_MODEL_DEFAULTS: Final[dict[str, dict[str, object]]] = {
    STUDIO_FAST_MODEL_ID: {
        "steps": 4,
        "cfg_scale": 3.5,
        "acceleration": "high",
        "true_cfg_scale": 4.0,
        "prompt_upsampling": False,
    },
    STUDIO_STANDARD_MODEL_ID: {
        "steps": 28,
        "cfg_scale": 4.0,
        "acceleration": "medium",
        "true_cfg_scale": None,
        "prompt_upsampling": False,
    },
    STUDIO_PREMIUM_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": True,
    },
    STUDIO_SIGNATURE_MODEL_ID: {
        "steps": 28,
        "cfg_scale": 2.5,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
    },
}


def normalize_studio_model_id(model_id: str | None) -> str:
    normalized = str(model_id or "").strip().lower()
    if not normalized:
        return ""
    return STUDIO_MODEL_ID_ALIASES.get(normalized, normalized)


def is_fast_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) == STUDIO_FAST_MODEL_ID


def is_standard_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) == STUDIO_STANDARD_MODEL_ID


def is_premium_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) == STUDIO_PREMIUM_MODEL_ID


def is_signature_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) == STUDIO_SIGNATURE_MODEL_ID


def is_high_fidelity_model_id(model_id: str | None) -> bool:
    normalized = normalize_studio_model_id(model_id)
    return normalized in {STUDIO_PREMIUM_MODEL_ID, STUDIO_SIGNATURE_MODEL_ID}


def resolve_studio_model_pricing_lane(model_id: str | None) -> str:
    normalized = normalize_studio_model_id(model_id)
    return STUDIO_MODEL_PRICING_LANES.get(normalized, "standard")


def resolve_studio_model_openai_quality(model_id: str | None) -> str:
    normalized = normalize_studio_model_id(model_id)
    return STUDIO_MODEL_OPENAI_QUALITY_HINTS.get(normalized, "medium")


def resolve_runware_model_air_id(
    model_id: str | None,
    *,
    workflow: str = "text_to_image",
) -> str:
    normalized = normalize_studio_model_id(model_id)
    if workflow in {"image_to_image", "edit"}:
        return STUDIO_RUNWARE_REFERENCE_MODEL_AIR_IDS.get(
            normalized,
            STUDIO_RUNWARE_REFERENCE_MODEL_AIR_IDS[STUDIO_FAST_MODEL_ID],
        )
    return STUDIO_RUNWARE_TEXT_MODEL_AIR_IDS.get(
        normalized,
        STUDIO_RUNWARE_TEXT_MODEL_AIR_IDS[STUDIO_FAST_MODEL_ID],
    )


def runware_model_defaults(model_id: str | None) -> dict[str, object]:
    normalized = normalize_studio_model_id(model_id)
    return dict(
        STUDIO_RUNWARE_MODEL_DEFAULTS.get(
            normalized,
            STUDIO_RUNWARE_MODEL_DEFAULTS[STUDIO_FAST_MODEL_ID],
        )
    )
