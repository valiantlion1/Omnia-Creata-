from __future__ import annotations

import base64
import binascii
import io
from typing import Tuple

from PIL import Image, UnidentifiedImageError


MAX_IMPORTED_IMAGE_BYTES = 5_000_000
MAX_IMPORTED_IMAGE_PIXELS = 16_777_216
_PIL_FORMAT_MIME_TYPES = {
    "GIF": "image/gif",
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


def parse_data_url_image(data_url: str) -> Tuple[str, bytes]:
    value = data_url.strip()
    header, separator, payload = value.partition(",")
    if not separator or not header.startswith("data:") or ";base64" not in header:
        raise ValueError("Unsupported image payload")

    mime_type = header[5:].split(";", 1)[0].strip().lower()
    if mime_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise ValueError("Unsupported image type")

    try:
        raw = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Invalid image payload") from exc

    if not raw:
        raise ValueError("Image payload is empty")
    if len(raw) > MAX_IMPORTED_IMAGE_BYTES:
        raise ValueError("Image payload is too large")
    _verify_image_payload(raw, expected_mime_type=mime_type)
    return mime_type, raw


def _verify_image_payload(raw: bytes, *, expected_mime_type: str) -> None:
    try:
        with Image.open(io.BytesIO(raw)) as image:
            detected_mime_type = _PIL_FORMAT_MIME_TYPES.get(str(image.format or "").upper())
            width, height = image.size
            if detected_mime_type != expected_mime_type:
                raise ValueError("Image payload does not match its declared type")
            if width <= 0 or height <= 0:
                raise ValueError("Image dimensions are invalid")
            if width * height > MAX_IMPORTED_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large")
            image.verify()
    except ValueError:
        raise
    except (OSError, SyntaxError, UnidentifiedImageError) as exc:
        raise ValueError("Image payload is not a valid image") from exc
