from __future__ import annotations

from typing import List

from app.services.chunker import chunk_text
from app.services.embedding_service import EmbeddingService
from app.services.text_extractor import DocumentTextExtractor
from app.utils.logging import get_logger

logger = get_logger(__name__)


class DocumentProcessor:
    def __init__(self, embedding_service: EmbeddingService, text_extractor: DocumentTextExtractor):
        self.embedding_service = embedding_service
        self.text_extractor = text_extractor
        self.source_type = ""

    async def process_document(self, file_bytes: bytes, filename: str, document_id: str, case_id: str, document_type: str | None, version: str | None) -> List[str]:
        text = await self.text_extractor.extract_text(file_bytes=file_bytes, filename=filename)
        self.source_type = getattr(self.text_extractor, "source_type", "")
        if not text or not text.strip():
            raise ValueError("Document contains no readable text after extraction.")

        cleaned_text = self.text_extractor.clean_text(text)
        chunks = chunk_text(cleaned_text)
        if not chunks:
            raise ValueError("No chunks were generated from the extracted text.")

        logger.info("Prepared %s chunks for document %s in case %s", len(chunks), document_id, case_id)
        embeddings = await self.embedding_service.embed_texts(chunks)

        if len(embeddings) != len(chunks):
            raise ValueError("Embedding count does not match chunk count.")

        return chunks
