from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from cryptography.fernet import Fernet, InvalidToken

from app.errors import DatabaseError, DecryptionError, DuplicateUserError, EncryptionError, UserNotFoundError


class FaceDatabase:
    def __init__(self, path: Path, encryption_key: str | None) -> None:
        if not encryption_key:
            raise EncryptionError
        try:
            self.cipher = Fernet(encryption_key.encode())
        except (ValueError, TypeError) as exc:
            raise EncryptionError from exc
        self.path = path

    def _read(self) -> dict[str, str]:
        if not self.path.exists():
            return {}
        try:
            content = json.loads(self.path.read_text(encoding="utf-8"))
            return content if isinstance(content, dict) else {}
        except (OSError, json.JSONDecodeError) as exc:
            raise DatabaseError from exc

    def contains(self, user_id: str) -> bool:
        return user_id in self._read()

    def save(self, user_id: str, embedding: np.ndarray) -> None:
        records = self._read()
        if user_id in records:
            raise DuplicateUserError
        try:
            encrypted = self.cipher.encrypt(embedding.astype(np.float32).tobytes()).decode("ascii")
        except Exception as exc:
            raise EncryptionError from exc
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps({**records, user_id: encrypted}), encoding="utf-8")
        except OSError as exc:
            raise DatabaseError from exc

    def load(self, user_id: str) -> np.ndarray:
        records = self._read()
        if user_id not in records:
            raise UserNotFoundError
        try:
            decrypted = self.cipher.decrypt(records[user_id].encode("ascii"))
        except (InvalidToken, ValueError, TypeError) as exc:
            raise DecryptionError from exc
        return np.frombuffer(decrypted, dtype=np.float32)