from __future__ import annotations

from functools import lru_cache

import numpy as np

from app.config import get_settings
from app.errors import ComparisonError, DuplicateUserError, FaceProcessingError, MultipleFacesDetectedError, NoFaceDetectedError
from app.services.face_database import FaceDatabase


class FaceService:
    def __init__(self, database: FaceDatabase, threshold: float) -> None:
        self.database = database
        self.threshold = threshold
        self._analysis = None

    def _get_analysis(self):
        if self._analysis is None:
            try:
                from insightface.app import FaceAnalysis
            except ImportError as exc:
                raise FaceProcessingError from exc
            try:
                self._analysis = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
                self._analysis.prepare(ctx_id=0, det_size=(640, 640))
            except Exception as exc:
                raise FaceProcessingError from exc
        return self._analysis

    def extract_embedding(self, image: np.ndarray) -> np.ndarray:
        try:
            faces = self._get_analysis().get(image)
        except FaceProcessingError:
            raise
        except Exception as exc:
            raise FaceProcessingError from exc
        if len(faces) == 0:
            raise NoFaceDetectedError
        if len(faces) > 1:
            raise MultipleFacesDetectedError
        embedding = getattr(faces[0], "embedding", None)
        if embedding is None:
            raise FaceProcessingError
        try:
            return np.asarray(embedding, dtype=np.float32)
        except Exception as exc:
            raise FaceProcessingError from exc

    def register(self, user_id: str, image: np.ndarray) -> None:
        if self.database.contains(user_id):
            raise DuplicateUserError
        self.database.save(user_id, self.extract_embedding(image))

    def verify(self, user_id: str, image: np.ndarray) -> bool:
        registered = self.database.load(user_id)
        candidate = self.extract_embedding(image)
        try:
            registered_norm = np.linalg.norm(registered)
            candidate_norm = np.linalg.norm(candidate)
            if registered_norm == 0 or candidate_norm == 0:
                return False
            similarity = float(np.dot(registered, candidate) / (registered_norm * candidate_norm))
            return similarity >= self.threshold
        except Exception as exc:
            raise ComparisonError from exc


@lru_cache
def get_face_service() -> FaceService:
    settings = get_settings()
    return FaceService(
        database=FaceDatabase(settings.face_database_path, settings.face_encryption_key),
        threshold=settings.face_similarity_threshold,
    )