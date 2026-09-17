from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseSettings):
    app_name: str = "semantic-search-service"
    app_version: str = "1.0.0"
    project_name: str = "Secure Digital Document Management System"

    qdrant_url: str = Field(default_factory=lambda: os.getenv("QDRANT_URL", "http://localhost:6333"))
    collection_name: str = Field(default_factory=lambda: os.getenv("COLLECTION_NAME", "document_chunks"))
    model_name: str = Field(default_factory=lambda: os.getenv("MODEL_NAME", "BAAI/bge-m3"))
    vector_dimension: int = Field(default_factory=lambda: int(os.getenv("VECTOR_DIMENSION", "1024")))
    chunk_size: int = Field(default_factory=lambda: int(os.getenv("CHUNK_SIZE", "500")))
    chunk_overlap: int = Field(default_factory=lambda: int(os.getenv("CHUNK_OVERLAP", "100")))
    max_top_k: int = Field(default_factory=lambda: int(os.getenv("MAX_TOP_K", "10")))
    allowed_file_extensions: str = Field(
        default_factory=lambda: os.getenv(
            "ALLOWED_FILE_EXTENSIONS",
            ".pdf,.docx,.doc,.txt,.csv,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.tif,.tiff",
        )
    )
    max_file_size_mb: int = Field(default_factory=lambda: int(os.getenv("MAX_FILE_SIZE_MB", "20")))

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
