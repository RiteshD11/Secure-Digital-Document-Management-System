from app.services.chunker import chunk_text


def test_chunk_text_basic():
    text = "word " * 1000
    chunks = chunk_text(text, chunk_size=200, chunk_overlap=50)
    assert chunks
    assert all(len(chunk) <= 200 for chunk in chunks)
    assert len(chunks) > 1


def test_chunk_text_empty():
    assert chunk_text("") == []


def test_chunk_text_overlap_validation():
    try:
        chunk_text("hello world", chunk_size=10, chunk_overlap=10)
        assert False, "Expected ValueError"
    except ValueError:
        pass
