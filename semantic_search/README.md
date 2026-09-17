# Semantic Search Microservice

This service provides a lightweight semantic search pipeline for secure document management without using an LLM or generative AI component. It extracts text from PDFs and image-based documents, cleans and chunks the text, generates embeddings with BAAI/bge-m3, stores vectors in Qdrant, and performs semantic similarity search using cosine similarity.

## Features

- FastAPI API with OpenAPI/Swagger docs
- PDF extraction using PyMuPDF
- DOCX, DOC, TXT, CSV, XLSX, and PPTX text extraction
- OCR support for scanned PDFs and JPG, JPEG, PNG, WEBP, and TIFF images via PaddleOCR
- Text cleaning and chunking
- BGE-M3 embeddings via sentence-transformers
- Qdrant vector storage and cosine search
- Safe re-indexing by document ID
- Security-focused response schemas that do not expose text or embeddings
- Health endpoint

## Local setup

From the repository root, enter this module first:

```bash
cd semantic_search
```

1. Create and activate a virtual environment:

   python3 -m venv .venv
   source .venv/bin/activate

2. Install dependencies:

   pip install -r requirements.txt

3. Set environment variables:

   cp .env.example .env

4. Start Qdrant locally:

   docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

5. Run the API:

   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

6. Open the docs:

   http://localhost:8000/docs

## API endpoints

### Index document

POST /api/v1/index-document

Form-data fields:
- file
- document_id
- case_id
- document_type (optional)
- version (optional)

### Search

POST /api/v1/search

Example body:

{
  "query": "murder weapon recovered from the accused",
  "top_k": 10
}

The endpoint automatically limits results to a maximum of 10.

### Health

GET /health

## Security notes

- No original document, document text, or embeddings are returned in search results.
- Qdrant stores only chunk metadata and vectors.
- The original document remains in the secure backend storage outside this service.
- Sensitive document contents are not logged.

## Testing

Run:

pytest

## Docker

You can also run the API and Qdrant together:

docker compose up --build
