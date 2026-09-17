from __future__ import annotations

from qdrant_client import AsyncQdrantClient


def get_qdrant_client(url: str) -> AsyncQdrantClient:
    return AsyncQdrantClient(url=url)
