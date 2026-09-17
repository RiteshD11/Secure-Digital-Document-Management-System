from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from qdrant_client.http import models as rest

from app.api.routes.search import search
from app.models.schemas import SearchRequest
from app.services.vector_service import QdrantVectorService


@pytest.mark.asyncio
async def test_search_returns_filtered_results():
    request = MagicMock()
    request.app.state.embedding_service = MagicMock()
    request.app.state.embedding_service.embed_text = AsyncMock(return_value=[0.1, 0.2, 0.3])
    request.app.state.vector_service = MagicMock()
    request.app.state.vector_service.ensure_collection = AsyncMock()
    request.app.state.vector_service.search = AsyncMock(return_value=[
        {"document_id": "DOC1", "case_id": "CASE1", "score": 0.91},
        {"document_id": "DOC2", "case_id": "CASE2", "score": 0.85},
    ])

    response = await search(request, SearchRequest(query="test query", top_k=10))
    assert response.results[0].document_id == "DOC1"
    assert response.results[0].case_id == "CASE1"
    assert response.results[0].score == 0.91


@pytest.mark.asyncio
async def test_ensure_collection_uses_qdrant_vector_params():
    client = AsyncMock()
    client.get_collections.return_value = SimpleNamespace(collections=[])

    service = QdrantVectorService(client, "test_collection", 768)
    await service.ensure_collection()

    client.create_collection.assert_awaited_once()
    _, kwargs = client.create_collection.call_args
    assert kwargs["vectors_config"] == rest.VectorParams(
        size=768,
        distance=rest.Distance.COSINE,
    )


@pytest.mark.asyncio
async def test_upsert_points_uses_valid_qdrant_uuid_ids():
    client = AsyncMock()
    service = QdrantVectorService(client, "test_collection", 768)

    await service.upsert_points([
        {
            "id": "DOC-CASE-2026-014:0",
            "vector": [0.1, 0.2, 0.3],
            "payload": {"document_id": "DOC-CASE-2026-014", "case_id": "CASE-2026-014", "chunk_id": "DOC-CASE-2026-014:0"},
        }
    ])

    client.upsert.assert_awaited_once()
    _, kwargs = client.upsert.call_args
    point = kwargs["points"][0]
    assert isinstance(point.id, str)
    assert point.id == str(uuid.uuid5(uuid.NAMESPACE_URL, "DOC-CASE-2026-014:0"))
