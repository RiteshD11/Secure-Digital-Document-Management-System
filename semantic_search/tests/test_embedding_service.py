import asyncio

from app.services.embedding_service import EmbeddingService


def test_embed_text_works():
    service = EmbeddingService(model_name="sentence-transformers/paraphrase-MiniLM-L3-v2")
    asyncio.run(service.load_model())
    embedding = asyncio.run(service.embed_text("sample document text"))
    assert isinstance(embedding, list)
    assert len(embedding) > 0


def test_embed_texts_works():
    service = EmbeddingService(model_name="sentence-transformers/paraphrase-MiniLM-L3-v2")
    asyncio.run(service.load_model())
    embeddings = asyncio.run(service.embed_texts(["one", "two"]))
    assert isinstance(embeddings, list)
    assert len(embeddings) == 2
