from __future__ import annotations

import cv2
import numpy as np

from app.errors import EmptyImageError, InvalidImageError, UnsupportedImageFormatError


SUPPORTED_IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def decode_image(file_bytes: bytes, filename: str, content_type: str | None) -> np.ndarray:
    if not file_bytes:
        raise EmptyImageError

    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    expected_content_type = SUPPORTED_IMAGE_TYPES.get(suffix)
    if expected_content_type is None:
        raise UnsupportedImageFormatError

    normalized_content_type = (content_type or "").split(";", 1)[0].strip().lower()
    if normalized_content_type and normalized_content_type not in {expected_content_type, "application/octet-stream"}:
        raise InvalidImageError

    image = cv2.imdecode(np.frombuffer(file_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise InvalidImageError
    return image