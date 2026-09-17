from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.models.schemas import IndexDocumentRequest, IndexingSuccessResponse
from app.services.document_processor import DocumentProcessor
from app.services.text_extractor import DocumentTextExtractor
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["indexing"])


@router.post("/index-document", response_model=IndexingSuccessResponse)
async def index_document(
    request: Request,
    document_id: Annotated[str, Form(...)],
    case_id: Annotated[str, Form(...)],
    file: UploadFile = File(...),
    document_type: Annotated[str | None, Form()] = None,
    version: Annotated[str | None, Form()] = None,
) -> IndexingSuccessResponse:
    settings = get_settings()
    try:
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is required.")

        extractor = getattr(request.app.state, "text_extractor", None)
        if not isinstance(extractor, DocumentTextExtractor):
            extractor = DocumentTextExtractor()

        payload = IndexDocumentRequest(document_id=document_id, case_id=case_id, document_type=document_type, version=version)
        if not file.file:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File content is empty.")

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

        if len(file_bytes) > settings.max_file_size_mb * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds the maximum allowed size.")

        extractor.validate_file(file_bytes, file.filename, file.content_type)

        embedding_service = request.app.state.embedding_service
        vector_service = request.app.state.vector_service

        processor = DocumentProcessor(embedding_service=embedding_service, text_extractor=extractor)
        chunks = await processor.process_document(
            file_bytes,
            file.filename,
            payload.document_id,
            payload.case_id,
            payload.document_type,
            payload.version,
        )

        await vector_service.ensure_collection()
        await vector_service.delete_document_points(payload.document_id)

        embeddings = await embedding_service.embed_texts(chunks)
        points = []
        for idx, chunk in enumerate(chunks):
            point_id = f"{payload.document_id}:{idx}"
            payload_item = {
                "document_id": payload.document_id,
                "case_id": payload.case_id,
                "chunk_id": point_id,
                "source_type": processor.source_type,
            }
            if payload.document_type:
                payload_item["document_type"] = payload.document_type
            if payload.version:
                payload_item["version"] = payload.version
            points.append(
                {
                    "id": point_id,
                    "vector": embeddings[idx],
                    "payload": payload_item,
                }
            )

        await vector_service.upsert_points(points)
        logger.info("Indexed document %s in case %s with %s chunks.", payload.document_id, payload.case_id, len(points))
        return IndexingSuccessResponse(success=True, document_id=payload.document_id, case_id=payload.case_id, chunks_indexed=len(points))
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Indexing failed for document %s", document_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Indexing failed.") from exc
