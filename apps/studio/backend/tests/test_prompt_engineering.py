from studio_platform.prompt_engineering import (
    analyze_generation_prompt_profile,
    compile_generation_request,
    compact_visual_prompt,
    improve_prompt_candidate,
)


def test_compile_generation_request_strengthens_short_realistic_prompt_for_weak_provider() -> None:
    compiled = compile_generation_request(
        prompt="sexy girl",
        negative_prompt="",
        provider_name="pollinations",
        model_id="realvis-xl",
    )

    lowered = compiled.prompt.lower()
    assert "editorial" in lowered or "fashion photography" in lowered
    assert "lighting" in lowered or "key light" in lowered
    assert "portrait" in lowered or "pose" in lowered
    assert "watermark" in compiled.negative_prompt.lower()
    assert "bad anatomy" in compiled.negative_prompt.lower()


def test_improve_prompt_candidate_adds_visual_direction_without_exploding_length() -> None:
    improved = improve_prompt_candidate("black perfume bottle")

    lowered = improved.lower()
    assert "product" in lowered or "campaign" in lowered
    assert "lighting" in lowered or "studio light" in lowered
    assert len(improved) <= 720


def test_compact_visual_prompt_stays_short_but_more_directive() -> None:
    compacted = compact_visual_prompt("cat", limit=180)

    assert len(compacted) <= 180
    assert "composition" in compacted.lower() or "lighting" in compacted.lower() or "cinematic" in compacted.lower()


def test_analyze_generation_prompt_profile_detects_premium_realistic_intent() -> None:
    analysis = analyze_generation_prompt_profile(
        prompt="editorial beauty portrait for a luxury campaign",
        model_id="flux-schnell",
    )

    assert analysis.profile == "realistic_editorial"
    assert analysis.premium_intent is True


def test_compile_generation_request_uses_provider_specific_adaptation() -> None:
    huggingface_prompt = compile_generation_request(
        prompt="dragon queen in a ruined neon city",
        provider_name="huggingface",
        model_id="flux-schnell",
    )
    fal_prompt = compile_generation_request(
        prompt="dragon queen in a ruined neon city",
        provider_name="fal",
        model_id="flux-schnell",
    )

    assert huggingface_prompt.prompt != fal_prompt.prompt
    assert "palette" in huggingface_prompt.prompt.lower() or "stylization" in huggingface_prompt.prompt.lower()
