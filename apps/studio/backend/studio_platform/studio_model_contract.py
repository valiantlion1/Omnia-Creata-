from __future__ import annotations

from typing import Final

STUDIO_FAST_MODEL_ID: Final[str] = "flux-2-klein"
STUDIO_STANDARD_MODEL_ID: Final[str] = "qwen-image-2512"
STUDIO_PREMIUM_MODEL_ID: Final[str] = "flux-2-max"
STUDIO_SIGNATURE_MODEL_ID: Final[str] = "flux-2-flex"
STUDIO_QUICK_IMAGE_MODEL_ID: Final[str] = "nano-banana"
STUDIO_DEFAULT_IMAGE_MODEL_ID: Final[str] = "nano-banana-2"
STUDIO_CINEMATIC_IMAGE_MODEL_ID: Final[str] = "grok-imagine-pro"
STUDIO_MULTI_REFERENCE_MODEL_ID: Final[str] = "wan-2-7-image-pro"
STUDIO_TEXT_IMAGE_MODEL_ID: Final[str] = "gpt-image-2"
STUDIO_DESIGN_IMAGE_MODEL_ID: Final[str] = "recraft-v4"
STUDIO_IDEOGRAM_MODEL_ID: Final[str] = "ideogram-3"
STUDIO_SEEDREAM_MODEL_ID: Final[str] = "seedream-4-5"

STUDIO_PUBLIC_MODEL_IDS: Final[tuple[str, ...]] = (
    STUDIO_QUICK_IMAGE_MODEL_ID,
    STUDIO_DEFAULT_IMAGE_MODEL_ID,
    STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_MULTI_REFERENCE_MODEL_ID,
    STUDIO_TEXT_IMAGE_MODEL_ID,
    STUDIO_DESIGN_IMAGE_MODEL_ID,
    STUDIO_IDEOGRAM_MODEL_ID,
    STUDIO_SEEDREAM_MODEL_ID,
)

STUDIO_MODEL_ID_ALIASES: Final[dict[str, str]] = {
    # Current canonical ids
    STUDIO_FAST_MODEL_ID: STUDIO_FAST_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID: STUDIO_STANDARD_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID: STUDIO_PREMIUM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID: STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_QUICK_IMAGE_MODEL_ID: STUDIO_QUICK_IMAGE_MODEL_ID,
    STUDIO_DEFAULT_IMAGE_MODEL_ID: STUDIO_DEFAULT_IMAGE_MODEL_ID,
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    STUDIO_MULTI_REFERENCE_MODEL_ID: STUDIO_MULTI_REFERENCE_MODEL_ID,
    STUDIO_TEXT_IMAGE_MODEL_ID: STUDIO_TEXT_IMAGE_MODEL_ID,
    STUDIO_DESIGN_IMAGE_MODEL_ID: STUDIO_DESIGN_IMAGE_MODEL_ID,
    STUDIO_IDEOGRAM_MODEL_ID: STUDIO_IDEOGRAM_MODEL_ID,
    STUDIO_SEEDREAM_MODEL_ID: STUDIO_SEEDREAM_MODEL_ID,
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
    "flux-2-dev": STUDIO_STANDARD_MODEL_ID,
    "flux2-dev": STUDIO_STANDARD_MODEL_ID,
    "flux.2 [dev]": STUDIO_STANDARD_MODEL_ID,
    "qwen-image-2512": STUDIO_STANDARD_MODEL_ID,
    "qwen image 2512": STUDIO_STANDARD_MODEL_ID,
    "alibaba-qwen-image-2512": STUDIO_STANDARD_MODEL_ID,
    "alibaba:qwen-image@2512": STUDIO_STANDARD_MODEL_ID,
    "flux.2 max": STUDIO_PREMIUM_MODEL_ID,
    "flux.2-max": STUDIO_PREMIUM_MODEL_ID,
    "flux-2-max": STUDIO_PREMIUM_MODEL_ID,
    "flux2-max": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 [max]": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 pro": STUDIO_PREMIUM_MODEL_ID,
    "flux.2-pro": STUDIO_PREMIUM_MODEL_ID,
    "flux-2-pro": STUDIO_PREMIUM_MODEL_ID,
    "flux2-pro": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 [pro]": STUDIO_PREMIUM_MODEL_ID,
    "bfl:7@1": STUDIO_PREMIUM_MODEL_ID,
    "bfl:5@1": STUDIO_PREMIUM_MODEL_ID,
    "flux.2 flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux.2-flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux2-flex": STUDIO_SIGNATURE_MODEL_ID,
    "flux.2 [flex]": STUDIO_SIGNATURE_MODEL_ID,
    "bfl:6@1": STUDIO_SIGNATURE_MODEL_ID,
    # Modern public Studio ids and provider spellings
    "google:4@1": STUDIO_QUICK_IMAGE_MODEL_ID,
    "google-nano-banana": STUDIO_QUICK_IMAGE_MODEL_ID,
    "nano banana": STUDIO_QUICK_IMAGE_MODEL_ID,
    "gemini-image": STUDIO_QUICK_IMAGE_MODEL_ID,
    "google:4@3": STUDIO_DEFAULT_IMAGE_MODEL_ID,
    "google-nano-banana-2": STUDIO_DEFAULT_IMAGE_MODEL_ID,
    "nano banana 2": STUDIO_DEFAULT_IMAGE_MODEL_ID,
    "nanobanana2": STUDIO_DEFAULT_IMAGE_MODEL_ID,
    "xai:grok-imagine@image-pro": STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    "grok imagine pro": STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    "grok imagine image pro": STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    "grok-imagine-image-pro": STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    "alibaba:wan@2.7-image-pro": STUDIO_MULTI_REFERENCE_MODEL_ID,
    "wan 2.7 image pro": STUDIO_MULTI_REFERENCE_MODEL_ID,
    "wan2.7 image pro": STUDIO_MULTI_REFERENCE_MODEL_ID,
    "wan2.7-image-pro": STUDIO_MULTI_REFERENCE_MODEL_ID,
    "openai:gpt-image@2": STUDIO_TEXT_IMAGE_MODEL_ID,
    "gpt image 2": STUDIO_TEXT_IMAGE_MODEL_ID,
    "gpt-image@2": STUDIO_TEXT_IMAGE_MODEL_ID,
    "recraft:v4@0": STUDIO_DESIGN_IMAGE_MODEL_ID,
    "recraft v4": STUDIO_DESIGN_IMAGE_MODEL_ID,
    "recraft-v4": STUDIO_DESIGN_IMAGE_MODEL_ID,
    "ideogram:4@1": STUDIO_IDEOGRAM_MODEL_ID,
    "ideogram 3": STUDIO_IDEOGRAM_MODEL_ID,
    "ideogram 3.0": STUDIO_IDEOGRAM_MODEL_ID,
    "ideogram-3-0": STUDIO_IDEOGRAM_MODEL_ID,
    "bytedance:seedream@4.5": STUDIO_SEEDREAM_MODEL_ID,
    "seedream 4.5": STUDIO_SEEDREAM_MODEL_ID,
    "seedream-4.5": STUDIO_SEEDREAM_MODEL_ID,
}

STUDIO_MODEL_PRICING_LANES: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "draft",
    STUDIO_STANDARD_MODEL_ID: "standard",
    STUDIO_PREMIUM_MODEL_ID: "final",
    STUDIO_SIGNATURE_MODEL_ID: "final",
    STUDIO_QUICK_IMAGE_MODEL_ID: "draft",
    STUDIO_DEFAULT_IMAGE_MODEL_ID: "standard",
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: "final",
    STUDIO_MULTI_REFERENCE_MODEL_ID: "final",
    STUDIO_TEXT_IMAGE_MODEL_ID: "final",
    STUDIO_DESIGN_IMAGE_MODEL_ID: "standard",
    STUDIO_IDEOGRAM_MODEL_ID: "final",
    STUDIO_SEEDREAM_MODEL_ID: "final",
}

STUDIO_MODEL_OPENAI_QUALITY_HINTS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "low",
    STUDIO_STANDARD_MODEL_ID: "medium",
    STUDIO_PREMIUM_MODEL_ID: "high",
    STUDIO_SIGNATURE_MODEL_ID: "high",
    STUDIO_QUICK_IMAGE_MODEL_ID: "low",
    STUDIO_DEFAULT_IMAGE_MODEL_ID: "high",
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: "high",
    STUDIO_MULTI_REFERENCE_MODEL_ID: "high",
    STUDIO_TEXT_IMAGE_MODEL_ID: "high",
    STUDIO_DESIGN_IMAGE_MODEL_ID: "medium",
    STUDIO_IDEOGRAM_MODEL_ID: "high",
    STUDIO_SEEDREAM_MODEL_ID: "high",
}

STUDIO_RUNWARE_TEXT_MODEL_AIR_IDS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "runware:400@2",
    STUDIO_STANDARD_MODEL_ID: "alibaba:qwen-image@2512",
    STUDIO_PREMIUM_MODEL_ID: "bfl:7@1",
    STUDIO_SIGNATURE_MODEL_ID: "bfl:6@1",
    STUDIO_QUICK_IMAGE_MODEL_ID: "google:4@1",
    STUDIO_DEFAULT_IMAGE_MODEL_ID: "google:4@3",
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: "xai:grok-imagine@image-pro",
    STUDIO_MULTI_REFERENCE_MODEL_ID: "alibaba:wan@2.7-image-pro",
    STUDIO_TEXT_IMAGE_MODEL_ID: "openai:gpt-image@2",
    STUDIO_DESIGN_IMAGE_MODEL_ID: "recraft:v4@0",
    STUDIO_IDEOGRAM_MODEL_ID: "ideogram:4@1",
    STUDIO_SEEDREAM_MODEL_ID: "bytedance:seedream@4.5",
}

STUDIO_RUNWARE_REFERENCE_MODEL_AIR_IDS: Final[dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: "runware:400@2",
    STUDIO_STANDARD_MODEL_ID: "alibaba:qwen-image@2512",
    STUDIO_PREMIUM_MODEL_ID: "bfl:7@1",
    STUDIO_SIGNATURE_MODEL_ID: "bfl:6@1",
    STUDIO_QUICK_IMAGE_MODEL_ID: "google:4@1",
    STUDIO_DEFAULT_IMAGE_MODEL_ID: "google:4@3",
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: "xai:grok-imagine@image-pro",
    STUDIO_MULTI_REFERENCE_MODEL_ID: "alibaba:wan@2.7-image-pro",
    STUDIO_TEXT_IMAGE_MODEL_ID: "openai:gpt-image@2",
    STUDIO_DESIGN_IMAGE_MODEL_ID: "recraft:v4@0",
    STUDIO_IDEOGRAM_MODEL_ID: "ideogram:4@1",
    STUDIO_SEEDREAM_MODEL_ID: "bytedance:seedream@4.5",
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
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
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
    STUDIO_QUICK_IMAGE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
        "provider_settings": {"google": {"safetyTolerance": "off"}},
    },
    STUDIO_DEFAULT_IMAGE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
        "settings": {"thinking": "HIGH", "temperature": 0.72, "topP": 0.95},
        "provider_settings": {"google": {"safetyTolerance": "off"}},
    },
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
    },
    STUDIO_MULTI_REFERENCE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
    },
    STUDIO_TEXT_IMAGE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
    },
    STUDIO_DESIGN_IMAGE_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
    },
    STUDIO_IDEOGRAM_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
    },
    STUDIO_SEEDREAM_MODEL_ID: {
        "steps": None,
        "cfg_scale": None,
        "acceleration": None,
        "true_cfg_scale": None,
        "prompt_upsampling": False,
        "omit_steps_cfg": True,
        "provider_settings": {"bytedance": {"optimizePromptMode": "standard"}},
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


def is_default_image_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) == STUDIO_DEFAULT_IMAGE_MODEL_ID


def is_multi_reference_model_id(model_id: str | None) -> bool:
    return normalize_studio_model_id(model_id) in {
        STUDIO_MULTI_REFERENCE_MODEL_ID,
        STUDIO_SEEDREAM_MODEL_ID,
    }


def is_high_fidelity_model_id(model_id: str | None) -> bool:
    normalized = normalize_studio_model_id(model_id)
    return normalized in {
        STUDIO_PREMIUM_MODEL_ID,
        STUDIO_SIGNATURE_MODEL_ID,
        STUDIO_CINEMATIC_IMAGE_MODEL_ID,
        STUDIO_MULTI_REFERENCE_MODEL_ID,
        STUDIO_TEXT_IMAGE_MODEL_ID,
        STUDIO_IDEOGRAM_MODEL_ID,
        STUDIO_SEEDREAM_MODEL_ID,
    }


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
