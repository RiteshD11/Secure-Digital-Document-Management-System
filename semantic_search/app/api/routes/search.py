from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.config import get_settings
from app.models.schemas import SearchRequest, SearchResponse, SearchResultItem
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search(request: Request, payload: SearchRequest) -> SearchResponse:
    settings = get_settings()
    try:
        top_k = min(payload.top_k, settings.max_top_k)
        embedding_service = request.app.state.embedding_service
        vector_service = request.app.state.vector_service

        query_vector = await embedding_service.embed_text(payload.query)
        await vector_service.ensure_collection()

        hits = await vector_service.search(query_vector=query_vector, top_k=top_k)
        results = [
            SearchResultItem(document_id=item["document_id"], case_id=item["case_id"], score=item["score"])
            for item in hits
            if item.get("document_id") and item.get("case_id")
        ]

        return SearchResponse(results=results)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Search failed for query: %s", payload.query)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Search failed: {exc}") from exc
