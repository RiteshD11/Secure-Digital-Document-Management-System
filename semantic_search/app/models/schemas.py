from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class IndexDocumentRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    case_id: str = Field(..., min_length=1)
    document_type: Optional[str] = None
    version: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=10)

    @field_validator("query")
    @classmethod
    def clean_query(cls, value: str) -> str:
        return value.strip()


class SearchResultItem(BaseModel):
    document_id: str
    case_id: str
    score: float


class SearchResponse(BaseModel):
    results: List[SearchResultItem]


class IndexingSuccessResponse(BaseModel):
    success: bool = True
    document_id: str
    case_id: str
    chunks_indexed: int
