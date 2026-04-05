from __future__ import annotations

from dataclasses import dataclass


_CONTROL_REPLACEMENTS = {
    "\n": " ",
    "\r": " ",
    "\t": " ",
}

_HUMAN_KEYWORDS = (
    "girl",
    "woman",
    "women",
    "man",
    "men",
    "person",
    "people",
    "model",
    "portrait",
    "beauty",
    "face",
    "fashion",
)
_PRODUCT_KEYWORDS = (
    "product",
    "perfume",
    "bottle",
    "shoe",
    "watch",
    "phone",
    "packshot",
    "pack shot",
    "cosmetic",
)
_INTERIOR_KEYWORDS = (
    "room",
    "interior",
    "bedroom",
    "living room",
    "kitchen",
    "architecture",
    "building",
    "lobby",
)
_ILLUSTRATION_KEYWORDS = (
    "illustration",
    "anime",
    "manga",
    "painting",
    "drawn",
    "cartoon",
    "concept art",
    "digital art",
)
_FANTASY_KEYWORDS = (
    "fantasy",
    "dragon",
    "wizard",
    "sci-fi",
    "science fiction",
    "cyberpunk",
    "alien",
    "mythic",
)
_COMPOSITION_KEYWORDS = (
    "composition",
    "framing",
    "close-up",
    "close up",
    "wide shot",
    "three-quarter",
    "centered",
    "full body",
    "waist-up",
    "waist up",
)
_LIGHTING_KEYWORDS = (
    "lighting",
    "light",
    "sunset",
    "neon",
    "rim light",
    "softbox",
    "studio light",
    "golden hour",
    "shadow",
)
_DETAIL_KEYWORDS = (
    "detail",
    "texture",
    "sharp",
    "skin texture",
    "high resolution",
    "micro-detail",
    "materials",
)
_CAMERA_KEYWORDS = (
    "lens",
    "depth of field",
    "dof",
    "bokeh",
    "85mm",
    "50mm",
    "35mm",
    "f/",
)
_BACKGROUND_KEYWORDS = (
    "background",
    "environment",
    "setting",
    "backdrop",
    "studio backdrop",
    "cityscape",
)
_STYLE_KEYWORDS = (
    "cinematic",
    "editorial",
    "studio photography",
    "illustration",
    "render",
    "photography",
    "campaign",
)


@dataclass(frozen=True, slots=True)
class CompiledPrompt:
    prompt: str
    negative_prompt: str


@dataclass(frozen=True, slots=True)
class PromptProfileAnalysis:
    profile: str
    has_reference_image: bool
    workflow: str
    detail_score: int
    premium_intent: bool


def analyze_generation_prompt_profile(
    *,
    prompt: str,
    model_id: str | None = None,
    workflow: str = "text_to_image",
    has_reference_image: bool = False,
) -> PromptProfileAnalysis:
    cleaned_prompt = _normalize_text(prompt, limit=900)
    lowered_prompt = cleaned_prompt.lower()
    normalized_workflow = _normalize_workflow(workflow, has_reference_image=has_reference_image)
    model = (model_id or "").strip().lower()
    profile = _classify_prompt_profile(lowered_prompt, model=model)
    detail_score = _detail_score(lowered_prompt)
    premium_intent = (
        normalized_workflow in {"image_to_image", "edit"}
        or model in {"realvis-xl", "juggernaut-xl"}
        or profile in {"realistic_editorial", "product_commercial", "interior_archviz"}
    )
    return PromptProfileAnalysis(
        profile=profile,
        has_reference_image=has_reference_image,
        workflow=normalized_workflow,
        detail_score=detail_score,
        premium_intent=premium_intent,
    )


def compile_generation_request(
    *,
    prompt: str,
    negative_prompt: str = "",
    provider_name: str | None = None,
    model_id: str | None = None,
    workflow: str = "text_to_image",
    prompt_profile: str | PromptProfileAnalysis | None = None,
) -> CompiledPrompt:
    cleaned_prompt = _normalize_text(prompt, limit=900)
    cleaned_negative = _normalize_text(negative_prompt, limit=420)
    if not cleaned_prompt:
        return CompiledPrompt(prompt="", negative_prompt=cleaned_negative)

    provider = (provider_name or "").strip().lower()
    model = (model_id or "").strip().lower()
    analysis = _coerce_prompt_profile_analysis(
        prompt_profile,
        prompt=cleaned_prompt,
        model_id=model,
        workflow=workflow,
    )
    compiled_prompt = _compile_provider_agnostic_prompt(
        cleaned_prompt,
        model=model,
        analysis=analysis,
    )
    compiled_prompt = _adapt_prompt_for_provider(
        compiled_prompt,
        provider_name=provider,
        analysis=analysis,
    )

    compiled_negative = _merge_negative_prompt(
        base_negative=cleaned_negative,
        prompt=compiled_prompt,
        provider_name=provider,
        model_id=model,
    )
    return CompiledPrompt(
        prompt=_normalize_text(compiled_prompt, limit=720),
        negative_prompt=_normalize_text(compiled_negative, limit=420),
    )


def improve_prompt_candidate(prompt: str) -> str:
    return compile_generation_request(prompt=prompt).prompt


def compact_visual_prompt(prompt: str, *, limit: int = 320) -> str:
    compiled = compile_generation_request(prompt=prompt)
    return _normalize_text(compiled.prompt, limit=limit)


def _normalize_workflow(workflow: str, *, has_reference_image: bool) -> str:
    normalized = (workflow or "").strip().lower()
    if normalized in {"image_to_image", "img2img", "i2i"}:
        return "image_to_image"
    if normalized in {"edit", "inpaint", "outpaint"}:
        return "edit"
    if has_reference_image:
        return "image_to_image"
    return "text_to_image"


def _normalize_text(value: str, *, limit: int) -> str:
    normalized = value
    for source, target in _CONTROL_REPLACEMENTS.items():
        normalized = normalized.replace(source, target)
    normalized = " ".join(normalized.strip().split())
    return normalized[:limit]


def _coerce_prompt_profile_analysis(
    prompt_profile: str | PromptProfileAnalysis | None,
    *,
    prompt: str,
    model_id: str,
    workflow: str,
) -> PromptProfileAnalysis:
    if isinstance(prompt_profile, PromptProfileAnalysis):
        return prompt_profile
    if isinstance(prompt_profile, str) and prompt_profile.strip():
        normalized_workflow = _normalize_workflow(
            workflow,
            has_reference_image=workflow in {"image_to_image", "edit"},
        )
        return PromptProfileAnalysis(
            profile=prompt_profile.strip().lower(),
            has_reference_image=normalized_workflow in {"image_to_image", "edit"},
            workflow=normalized_workflow,
            detail_score=_detail_score(prompt.lower()),
            premium_intent=(
                normalized_workflow in {"image_to_image", "edit"}
                or model_id in {"realvis-xl", "juggernaut-xl"}
                or prompt_profile.strip().lower() in {"realistic_editorial", "product_commercial", "interior_archviz"}
            ),
        )
    return analyze_generation_prompt_profile(
        prompt=prompt,
        model_id=model_id,
        workflow=workflow,
        has_reference_image=workflow in {"image_to_image", "edit"},
    )


def _contains_any(content: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in content for keyword in keywords)


def _detail_score(content: str) -> int:
    return sum(
        1
        for keywords in (
            _STYLE_KEYWORDS,
            _COMPOSITION_KEYWORDS,
            _LIGHTING_KEYWORDS,
            _DETAIL_KEYWORDS,
            _CAMERA_KEYWORDS,
            _BACKGROUND_KEYWORDS,
        )
        if _contains_any(content, keywords)
    )


def _looks_photographic(content: str, *, model: str) -> bool:
    if _contains_any(content, _ILLUSTRATION_KEYWORDS):
        return False
    if model in {"realvis-xl", "juggernaut-xl", "sdxl-base"}:
        return True
    return _contains_any(content, _HUMAN_KEYWORDS + _PRODUCT_KEYWORDS + _INTERIOR_KEYWORDS)


def _classify_prompt_profile(content: str, *, model: str) -> str:
    if _contains_any(content, _PRODUCT_KEYWORDS):
        return "product_commercial"
    if _contains_any(content, _INTERIOR_KEYWORDS):
        return "interior_archviz"
    if _contains_any(content, _ILLUSTRATION_KEYWORDS):
        return "stylized_illustration"
    if _contains_any(content, _FANTASY_KEYWORDS):
        return "fantasy_concept"
    if _looks_photographic(content, model=model):
        return "realistic_editorial"
    return "generic"


def _compile_provider_agnostic_prompt(
    prompt: str,
    *,
    model: str,
    analysis: PromptProfileAnalysis,
) -> str:
    lowered_prompt = prompt.lower()
    additions: list[str] = []
    if not _contains_any(lowered_prompt, _STYLE_KEYWORDS):
        additions.append(_infer_style_clause(lowered_prompt, model=model))
    if not _contains_any(lowered_prompt, _COMPOSITION_KEYWORDS):
        additions.append(_infer_composition_clause(lowered_prompt))
    if not _contains_any(lowered_prompt, _LIGHTING_KEYWORDS):
        additions.append(_infer_lighting_clause(lowered_prompt))
    if not _contains_any(lowered_prompt, _DETAIL_KEYWORDS):
        additions.append(_infer_detail_clause(lowered_prompt, weak_provider=False))
    if not _contains_any(lowered_prompt, _CAMERA_KEYWORDS) and _looks_photographic(lowered_prompt, model=model):
        additions.append("85mm portrait lens feel, shallow depth of field")
    if not _contains_any(lowered_prompt, _BACKGROUND_KEYWORDS):
        additions.append(_infer_environment_clause(lowered_prompt))
    if analysis.workflow in {"image_to_image", "edit"}:
        additions.append(
            "respect the reference image identity, preserve the strongest visual anchors, change only the requested elements"
        )
    aggressive_expand = analysis.detail_score < 3 or len(prompt.split()) < 18
    limit = 4 if aggressive_expand else 3
    return _append_prompt_clauses(prompt, additions[:limit])


def _adapt_prompt_for_provider(
    prompt: str,
    *,
    provider_name: str,
    analysis: PromptProfileAnalysis,
) -> str:
    provider = (provider_name or "").strip().lower()
    if provider in {"", "fal", "runware"}:
        return prompt

    additions: list[str] = []
    if provider == "pollinations":
        additions.append("single coherent subject, clean focal hierarchy, no collage feel")
        if analysis.profile == "realistic_editorial":
            additions.append("natural skin fidelity, premium editorial polish")
        elif analysis.profile == "product_commercial":
            additions.append("single hero product, crisp materials, controlled reflections")
        elif analysis.profile == "interior_archviz":
            additions.append("straight architectural lines, balanced daylight, readable material detail")
        elif analysis.profile == "stylized_illustration":
            additions.append("coherent illustration language, readable silhouette, clean color blocking")
        elif analysis.profile == "fantasy_concept":
            additions.append("single scene readability, cinematic fantasy atmosphere, clear focal subject")
    elif provider == "huggingface":
        if analysis.profile in {"stylized_illustration", "fantasy_concept"}:
            additions.append("coherent stylization, readable silhouette, intentional palette separation")
        else:
            additions.append("coherent subject, clean composition, refined visual consistency")
    elif provider == "demo":
        additions.append("single coherent subject, simplified composition, clean focal hierarchy")

    return _append_prompt_clauses(prompt, additions[:2])


def _infer_style_clause(content: str, *, model: str) -> str:
    if _contains_any(content, _ILLUSTRATION_KEYWORDS):
        return "premium digital illustration, strong silhouette language, polished color separation"
    if _contains_any(content, _FANTASY_KEYWORDS):
        return "cinematic concept art with premium production design"
    if _contains_any(content, _PRODUCT_KEYWORDS):
        return "luxury campaign photography, premium commercial finish"
    if _contains_any(content, _HUMAN_KEYWORDS):
        return "premium editorial fashion photography, refined campaign look"
    if _contains_any(content, _INTERIOR_KEYWORDS):
        return "high-end architectural visualization, premium editorial interior photography"
    if model in {"realvis-xl", "juggernaut-xl"}:
        return "premium cinematic realism, luxury campaign finish"
    return "cinematic high-end image, polished visual storytelling"


def _infer_composition_clause(content: str) -> str:
    if _contains_any(content, _PRODUCT_KEYWORDS):
        return "hero product framing, premium negative space, balanced composition"
    if _contains_any(content, _HUMAN_KEYWORDS):
        return "confident portrait framing, clean focal hierarchy, flattering pose"
    if _contains_any(content, _INTERIOR_KEYWORDS):
        return "balanced wide composition, clear depth layers, strong line control"
    return "intentional framing, strong focal hierarchy, layered depth"


def _infer_lighting_clause(content: str) -> str:
    if _contains_any(content, _PRODUCT_KEYWORDS):
        return "soft directional studio light, controlled reflections, clean highlight roll-off"
    if _contains_any(content, _HUMAN_KEYWORDS):
        return "soft cinematic key light, natural highlight falloff, rich skin-toned contrast"
    if _contains_any(content, _FANTASY_KEYWORDS + _ILLUSTRATION_KEYWORDS):
        return "dramatic cinematic lighting, atmospheric depth, luminous accents"
    if _contains_any(content, _INTERIOR_KEYWORDS):
        return "clean daylight balance, shaped practical lighting, natural shadow depth"
    return "controlled cinematic lighting, clean contrast, dimensional highlights"


def _infer_detail_clause(content: str, *, weak_provider: bool) -> str:
    if _contains_any(content, _HUMAN_KEYWORDS):
        base = "realistic skin texture, detailed eyes, clean hair separation"
    elif _contains_any(content, _PRODUCT_KEYWORDS):
        base = "premium material detail, crisp edges, believable reflections"
    elif _contains_any(content, _ILLUSTRATION_KEYWORDS + _FANTASY_KEYWORDS):
        base = "high micro-detail, clean line fidelity, polished surface rendering"
    else:
        base = "high detail, crisp texture separation, polished finish"
    if weak_provider:
        return f"{base}, coherent anatomy, consistent proportions"
    return base


def _infer_environment_clause(content: str) -> str:
    if _contains_any(content, _PRODUCT_KEYWORDS):
        return "minimal luxury backdrop, premium studio environment"
    if _contains_any(content, _HUMAN_KEYWORDS):
        return "tasteful background separation, premium fashion-campaign atmosphere"
    if _contains_any(content, _FANTASY_KEYWORDS + _ILLUSTRATION_KEYWORDS):
        return "immersive environment storytelling, atmospheric background depth"
    return "clean environment storytelling, readable background depth"


def _merge_negative_prompt(
    *,
    base_negative: str,
    prompt: str,
    provider_name: str,
    model_id: str,
) -> str:
    lowered_prompt = prompt.lower()
    defaults = [
        "lowres",
        "blurry",
        "pixelated",
        "text",
        "watermark",
        "logo",
        "jpeg artifacts",
        "cropped subject",
        "duplicate subject",
    ]
    if _contains_any(lowered_prompt, _HUMAN_KEYWORDS):
        defaults.extend(["bad anatomy", "deformed hands", "extra fingers", "crossed eyes", "plastic skin"])
    if _contains_any(lowered_prompt, _PRODUCT_KEYWORDS):
        defaults.extend(["warped geometry", "dirty reflections", "muddy materials"])
    if _contains_any(lowered_prompt, _ILLUSTRATION_KEYWORDS):
        defaults.extend(["photographic artifacts", "muddy linework"])
    if provider_name in {"pollinations", "demo"}:
        defaults.extend(["collage layout", "double face", "extra limbs"])
    if model_id == "flux-schnell":
        defaults.append("oversmoothed details")

    merged = [item.strip() for item in base_negative.split(",") if item.strip()]
    seen = {item.lower() for item in merged}
    for item in defaults:
        lowered = item.lower()
        if lowered not in seen:
            merged.append(item)
            seen.add(lowered)
    return ", ".join(merged)


def _dedupe_nonempty(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        normalized = item.strip().lower()
        if not normalized or normalized in seen:
            continue
        result.append(item.strip())
        seen.add(normalized)
    return result


def _append_prompt_clauses(prompt: str, clauses: list[str]) -> str:
    effective_additions = [item for item in _dedupe_nonempty(clauses) if item]
    if not effective_additions:
        return prompt
    return ", ".join([prompt, *effective_additions])
