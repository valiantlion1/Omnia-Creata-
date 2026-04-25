from __future__ import annotations

import pytest

from studio_platform.asset_import_ops import parse_data_url_image


_ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=="


def test_parse_data_url_image_accepts_real_image_payload() -> None:
    mime_type, image_bytes = parse_data_url_image(f"data:image/png;base64,{_ONE_PIXEL_PNG}")

    assert mime_type == "image/png"
    assert image_bytes.startswith(b"\x89PNG")


def test_parse_data_url_image_rejects_non_image_bytes_even_with_image_mime() -> None:
    with pytest.raises(ValueError, match="valid image"):
        parse_data_url_image("data:image/png;base64,aGVsbG8=")


def test_parse_data_url_image_rejects_mime_type_mismatch() -> None:
    with pytest.raises(ValueError, match="declared type"):
        parse_data_url_image(f"data:image/jpeg;base64,{_ONE_PIXEL_PNG}")


def test_parse_data_url_image_rejects_corrupt_image_bytes() -> None:
    corrupt_png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z0uoAAAAASUVORK5CYII="
    )

    with pytest.raises(ValueError, match="valid image"):
        parse_data_url_image(f"data:image/png;base64,{corrupt_png}")
