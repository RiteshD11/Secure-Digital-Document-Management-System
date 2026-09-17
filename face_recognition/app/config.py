from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseSettings):
    face_encryption_key: str | None = Field(default_factory=lambda: os.getenv("FACE_ENCRYPTION_KEY"))
    face_database_path: Path = Field(
        default_factory=lambda: Path(os.getenv("FACE_DATABASE_PATH", "face_data/face_database.json"))
    )
    face_max_upload_size_mb: int = Field(
        default_factory=lambda: int(os.getenv("FACE_MAX_UPLOAD_SIZE_MB", "5"))
    )
    face_similarity_threshold: float = Field(
        default_factory=lambda: float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.5"))
    )

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()