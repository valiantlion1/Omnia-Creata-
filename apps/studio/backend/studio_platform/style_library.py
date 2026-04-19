from __future__ import annotations

from typing import Any

from .models import StudioStyle


STYLE_CATALOG: list[dict[str, Any]] = [
    {
        "id": "dramatic-cinema",
        "title": "Dramatic Cinema",
        "description": "Moody, filmic composition with premium contrast and lighting.",
        "prompt_modifier": "cinematic lighting, anamorphic lens flare, film grain, 35mm photography, dramatic shadows, color grading",
        "image": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
        "category": "photography",
        "likes": 342,
        "is_omnia": True,
    },
    {
        "id": "soft-editorial",
        "title": "Soft Editorial",
        "description": "Clean magazine lighting with soft premium polish.",
        "prompt_modifier": "soft natural lighting, editorial fashion photography, muted pastel tones, shallow depth of field, magazine quality",
        "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
        "category": "photography",
        "likes": 287,
        "is_omnia": True,
    },
    {
        "id": "product-gloss",
        "title": "Product Gloss",
        "description": "High-polish commercial packshot styling for products.",
        "prompt_modifier": "studio lighting, product photography, sleek reflections, clean background, commercial grade, high polish",
        "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
        "category": "photography",
        "likes": 195,
        "is_omnia": True,
    },
    {
        "id": "anime-cel",
        "title": "Anime Cel Shading",
        "description": "Bold linework and vibrant anime illustration energy.",
        "prompt_modifier": "anime style, cel-shaded, vibrant colors, clean linework, studio ghibli inspired, 2D illustration",
        "image": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80",
        "category": "illustration",
        "likes": 891,
        "is_omnia": True,
    },
    {
        "id": "oil-painting",
        "title": "Renaissance Oil",
        "description": "Painterly texture and dramatic classical lighting.",
        "prompt_modifier": "oil painting, renaissance style, rich textures, dramatic chiaroscuro, classical composition, canvas texture",
        "image": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=80",
        "category": "illustration",
        "likes": 456,
        "is_omnia": True,
    },
    {
        "id": "neon-cyberpunk",
        "title": "Neon Cyberpunk",
        "description": "High-glow futuristic city atmosphere and chromatic drama.",
        "prompt_modifier": "cyberpunk aesthetic, neon lights, rain-soaked streets, holographic displays, futuristic city, chromatic aberration",
        "image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
        "category": "abstract",
        "likes": 723,
        "is_omnia": True,
    },
    {
        "id": "isometric-3d",
        "title": "Isometric World",
        "description": "Miniature 3D worlds with clean geometry and playful depth.",
        "prompt_modifier": "isometric view, 3D render, miniature world, soft shadows, vibrant colors, clean geometry, low poly",
        "image": "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=900&q=80",
        "category": "3d",
        "likes": 534,
        "is_omnia": True,
    },
    {
        "id": "watercolor-dream",
        "title": "Watercolor Dream",
        "description": "Soft organic pigment flow with handmade texture.",
        "prompt_modifier": "watercolor painting, soft washes, bleeding edges, organic textures, dreamy atmosphere, handmade paper texture",
        "image": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80",
        "category": "illustration",
        "likes": 312,
        "is_omnia": True,
    },
]


def get_style_catalog_entry(style_id: str) -> dict[str, Any] | None:
    normalized = (style_id or "").strip().lower()
    for entry in STYLE_CATALOG:
        if str(entry["id"]).strip().lower() == normalized:
            return dict(entry)
    return None


def serialize_style_catalog_entry(
    entry: dict[str, Any],
    *,
    saved_style: StudioStyle | None = None,
) -> dict[str, Any]:
    payload = dict(entry)
    payload["text_mode"] = str(payload.get("text_mode") or "modifier")
    payload["negative_prompt"] = str(payload.get("negative_prompt") or "")
    payload["preferred_model_id"] = payload.get("preferred_model_id")
    payload["preferred_aspect_ratio"] = payload.get("preferred_aspect_ratio")
    payload["preferred_steps"] = payload.get("preferred_steps")
    payload["preferred_cfg_scale"] = payload.get("preferred_cfg_scale")
    payload["preferred_output_count"] = payload.get("preferred_output_count")
    payload["saved_style_id"] = saved_style.id if saved_style is not None else None
    payload["saved"] = saved_style is not None
    payload["favorite"] = bool(saved_style.favorite) if saved_style is not None else False
    return payload
