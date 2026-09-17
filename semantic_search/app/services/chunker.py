from __future__ import annotations

from typing import List

from app.config import get_settings


settings = get_settings()


def chunk_text(text: str, chunk_size: int | None = None, chunk_overlap: int | None = None) -> List[str]:
    if not text or not text.strip():
        return []

    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap if chunk_overlap is not None else settings.chunk_overlap

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    text = text.strip()
    chunks: List[str] = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = max(end - chunk_overlap, start + 1)

    return chunks
