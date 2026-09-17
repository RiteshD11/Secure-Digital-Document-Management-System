from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.indexing import router as indexing_router
from app.api.routes.search import router as search_router
from app.config import get_settings
from app.db.qdrant_client import get_qdrant_client
from app.services.embedding_service import EmbeddingService
from app.services.text_extractor import DocumentTextExtractor
from app.services.vector_service import QdrantVectorService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    embedding_service = EmbeddingService(model_name=settings.model_name)
    await embedding_service.load_model()

    qdrant_client = get_qdrant_client(settings.qdrant_url)
    vector_service = QdrantVectorService(
        qdrant_client=qdrant_client,
        collection_name=settings.collection_name,
        vector_dimension=settings.vector_dimension,
    )
    await vector_service.ensure_collection()
    text_extractor = DocumentTextExtractor()

    app.state.embedding_service = embedding_service
    app.state.vector_service = vector_service
    app.state.text_extractor = text_extractor
    app.state.settings = settings

    yield

    await vector_service.close()


app = FastAPI(
    title="Semantic Search Microservice",
    description="AI semantic search service for secure digital document management.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(indexing_router)
app.include_router(search_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
