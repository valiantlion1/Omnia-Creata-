from __future__ import annotations

import base64
import binascii
from typing import Tuple


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
    return mime_type, raw
