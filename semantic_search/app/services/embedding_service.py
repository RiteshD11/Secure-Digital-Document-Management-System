from __future__ import annotations

from typing import List

from sentence_transformers import SentenceTransformer

from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str | None = None) -> None:
        self.settings = get_settings()
        self.model_name = model_name or self.settings.model_name
        self._model: SentenceTransformer | None = None

    async def load_model(self) -> None:
        if self._model is None:
            logger.info("Loading embedding model: %s", self.model_name)
            self._model = SentenceTransformer(self.model_name)

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            raise RuntimeError("Embedding model not loaded. Call load_model() during application startup.")
        return self._model

    async def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Embedding input text cannot be empty.")
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()
