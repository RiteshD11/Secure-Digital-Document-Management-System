from __future__ import annotations

import uuid
from typing import Any, Dict, List

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as rest

from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


class QdrantVectorService:
    def __init__(self, qdrant_client: AsyncQdrantClient, collection_name: str, vector_dimension: int) -> None:
        self.client = qdrant_client
        self.collection_name = collection_name
        self.vector_dimension = vector_dimension
        self.settings = get_settings()

    async def ensure_collection(self) -> None:
        collections = await self.client.get_collections()
        existing_names = {item.name for item in collections.collections}
        if self.collection_name not in existing_names:
            await self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=rest.VectorParams(
                    size=self.vector_dimension,
                    distance=rest.Distance.COSINE,
                ),
            )
            logger.info("Created Qdrant collection: %s", self.collection_name)
        else:
            logger.info("Reusing existing Qdrant collection: %s", self.collection_name)

    async def delete_document_points(self, document_id: str) -> None:
        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=rest.Filter(
                must=[rest.FieldCondition(key="document_id", match=rest.MatchValue(value=document_id))]
            ),
        )

    @staticmethod
    def get_point_id(point_id: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, str(point_id)))

    async def upsert_points(self, points: List[Dict[str, Any]]) -> None:
        if not points:
            return
        await self.client.upsert(
            collection_name=self.collection_name,
            points=[
                rest.PointStruct(
                    id=self.get_point_id(str(point["id"])),
                    vector=point["vector"],
                    payload=point["payload"],
                )
                for point in points
            ],
        )

    async def search(self, query_vector: List[float], top_k: int = 10) -> List[Dict[str, Any]]:
        response = await self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k,
            with_payload=True,
            score_threshold=None,
        )

        results: List[Dict[str, Any]] = []
        for hit in response:
            payload = hit.payload or {}
            results.append({
                "document_id": payload.get("document_id"),
                "case_id": payload.get("case_id"),
                "score": float(hit.score),
            })
        return results

    async def close(self) -> None:
        await self.client.close()
