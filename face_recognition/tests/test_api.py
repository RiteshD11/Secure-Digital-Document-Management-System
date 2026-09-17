from __future__ import annotations

from types import SimpleNamespace

import cv2
import numpy as np
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.config import get_settings
from app.errors import ComparisonError, DatabaseError, DecryptionError, DuplicateUserError, EncryptionError, MultipleFacesDetectedError, NoFaceDetectedError, UserNotFoundError
from app.main import app
from app.services.face_database import FaceDatabase
from app.services.face_service import FaceService


def image_bytes(format_name: str = ".png") -> bytes:
    success, encoded = cv2.imencode(format_name, np.full((24, 24, 3), 255, dtype=np.uint8))
    assert success
    return encoded.tobytes()


class FakeFaceService:
    def __init__(self, match: bool = True) -> None:
        self.match = match
        self.registered: set[str] = set()

    def register(self, user_id: str, image: np.ndarray) -> None:
        if user_id in self.registered:
            raise DuplicateUserError
        self.registered.add(user_id)

    def verify(self, user_id: str, image: np.ndarray) -> bool:
        if user_id not in self.registered:
            raise UserNotFoundError
        return self.match


@pytest.fixture
def client():
    app.state.face_service = FakeFaceService()
    with TestClient(app) as test_client:
        yield test_client
    del app.state.face_service


def test_health(client):
    assert client.get("/health").status_code == 200


def test_openapi_uses_multipart_file_upload(client):
    schema = client.get("/openapi.json").json()
    for path in ("/api/v1/face/register", "/api/v1/face/verify"):
        operation = schema["paths"][path]["post"]
        request_schema = operation["requestBody"]["content"]["multipart/form-data"]["schema"]
        schema_name = request_schema["$ref"].split("/")[-1]
        fields = schema["components"]["schemas"][schema_name]["properties"]
        assert fields["user_id"]["type"] == "string"
        assert fields["image"]["format"] == "binary"
        assert "400" in operation["responses"]
        assert "422" in operation["responses"]


def test_successful_registration_with_image_upload(client):
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 200
    assert response.json() == {"success": True, "user_id": "USER-123"}
    assert "embedding" not in response.text


def test_missing_user_id_returns_422(client):
    response = client.post("/api/v1/face/register", files={"image": ("person.png", image_bytes(), "image/png")})
    assert response.status_code == 422
    assert response.json() == {"success": False, "error_code": "VALIDATION_ERROR", "message": "User ID is required."}


def test_missing_image_returns_422(client):
    response = client.post("/api/v1/face/register", data={"user_id": "USER-123"})
    assert response.status_code == 422
    assert response.json() == {"success": False, "error_code": "IMAGE_REQUIRED", "message": "Image file is required."}


@pytest.mark.parametrize("endpoint", ["register", "verify"])
def test_missing_user_id_returns_422_for_both_endpoints(client, endpoint):
    response = client.post(f"/api/v1/face/{endpoint}", files={"image": ("person.png", image_bytes(), "image/png")})
    assert response.status_code == 422
    assert response.json()["message"] == "User ID is required."


@pytest.mark.parametrize("endpoint", ["register", "verify"])
def test_missing_image_returns_422_for_both_endpoints(client, endpoint):
    response = client.post(f"/api/v1/face/{endpoint}", data={"user_id": "USER-123"})
    assert response.status_code == 422
    assert response.json()["message"] == "Image file is required."


def test_same_person_verification_matches(client):
    client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    response = client.post(
        "/api/v1/face/verify",
        data={"user_id": "USER-123"},
        files={"image": ("new-photo.jpg", image_bytes(".jpg"), "image/jpeg")},
    )
    assert response.status_code == 200
    assert response.json() == {"success": True, "user_id": "USER-123", "match": True}


def test_different_person_verification_returns_false(client):
    app.state.face_service = FakeFaceService(match=False)
    client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    response = client.post(
        "/api/v1/face/verify",
        data={"user_id": "USER-123"},
        files={"image": ("other.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["match"] is False


def test_duplicate_registration_is_rejected(client):
    payload = {"user_id": "USER-123"}
    file = {"image": ("person.png", image_bytes(), "image/png")}
    assert client.post("/api/v1/face/register", data=payload, files=file).status_code == 200
    response = client.post("/api/v1/face/register", data=payload, files=file)
    assert response.status_code == 409
    assert response.json()["message"] == "Face is already registered for this user."


def test_unknown_user_verification_is_rejected(client):
    response = client.post(
        "/api/v1/face/verify",
        data={"user_id": "UNKNOWN"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("service_error", "expected_message"),
    [
        ("No face detected in the uploaded image.", "No face detected. Please upload a clear image containing exactly one face."),
        ("Exactly one face is required in the uploaded image.", "Multiple faces detected. Please upload an image containing exactly one face."),
    ],
)
def test_no_face_and_multiple_faces_are_rejected(client, service_error, expected_message):
    class InvalidFaceService(FakeFaceService):
        def register(self, user_id, image):
            if "No face" in service_error:
                raise NoFaceDetectedError
            raise MultipleFacesDetectedError

    app.state.face_service = InvalidFaceService()
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == expected_message


@pytest.mark.parametrize("endpoint", ["register", "verify"])
@pytest.mark.parametrize("face_error", [NoFaceDetectedError, MultipleFacesDetectedError])
def test_face_count_errors_are_rejected_for_both_endpoints(client, endpoint, face_error):
    class InvalidFaceService(FakeFaceService):
        def register(self, user_id, image):
            raise face_error

        def verify(self, user_id, image):
            raise face_error

    app.state.face_service = InvalidFaceService()
    response = client.post(
        f"/api/v1/face/{endpoint}",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] in {"NO_FACE_DETECTED", "MULTIPLE_FACES_DETECTED"}


def test_invalid_image_is_rejected(client):
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", b"not-an-image", "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Invalid image file. The uploaded file could not be processed as an image."


@pytest.mark.parametrize("endpoint", ["register", "verify"])
def test_invalid_image_is_rejected_for_both_endpoints(client, endpoint):
    response = client.post(
        f"/api/v1/face/{endpoint}",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", b"not-an-image", "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "INVALID_IMAGE"


def test_empty_image_is_rejected(client):
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", b"", "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Uploaded image is empty."


@pytest.mark.parametrize("endpoint", ["register", "verify"])
def test_empty_image_is_rejected_for_both_endpoints(client, endpoint):
    response = client.post(
        f"/api/v1/face/{endpoint}",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", b"", "image/png")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "IMAGE_REQUIRED"


def test_unsupported_image_format_is_rejected(client):
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.gif", b"GIF89a", "image/gif")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP."


@pytest.mark.parametrize("endpoint", ["register", "verify"])
def test_unsupported_image_format_is_rejected_for_both_endpoints(client, endpoint):
    response = client.post(
        f"/api/v1/face/{endpoint}",
        data={"user_id": "USER-123"},
        files={"image": ("person.gif", b"GIF89a", "image/gif")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "UNSUPPORTED_IMAGE_FORMAT"


def test_oversized_image_is_rejected(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "face_max_upload_size_mb", 1)
    response = client.post(
        "/api/v1/face/register",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", b"x" * (1024 * 1024 + 1), "image/png")},
    )
    assert response.status_code == 400
    assert "maximum" in response.json()["message"].lower()


def test_encrypted_face_data_survives_new_database_instance(tmp_path):
    key = Fernet.generate_key().decode()
    path = tmp_path / "faces.json"
    embedding = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    FaceDatabase(path, key).save("USER-123", embedding)

    restored = FaceDatabase(path, key).load("USER-123")

    assert np.array_equal(restored, embedding)
    assert b"1.0" not in path.read_bytes()
    assert b"embedding" not in path.read_bytes()


def test_face_service_requires_exactly_one_face():
    service = FaceService(database=SimpleNamespace(), threshold=0.5)
    service._analysis = SimpleNamespace(get=lambda image: [])

    with pytest.raises(NoFaceDetectedError):
        service.extract_embedding(np.zeros((10, 10, 3), dtype=np.uint8))


@pytest.mark.parametrize(
    ("error", "endpoint", "status_code", "error_code"),
    [
        (EncryptionError, "register", 500, "ENCRYPTION_ERROR"),
        (DatabaseError, "register", 503, "DATABASE_ERROR"),
        (DecryptionError, "verify", 500, "DECRYPTION_ERROR"),
        (ComparisonError, "verify", 500, "VERIFICATION_ERROR"),
        (DatabaseError, "verify", 503, "DATABASE_ERROR"),
    ],
)
def test_internal_failures_return_safe_messages(client, error, endpoint, status_code, error_code):
    class FailingService(FakeFaceService):
        def register(self, user_id, image):
            if endpoint == "register":
                raise error
            return super().register(user_id, image)

        def verify(self, user_id, image):
            if endpoint == "verify":
                raise error
            return super().verify(user_id, image)

    app.state.face_service = FailingService()
    response = client.post(
        f"/api/v1/face/{endpoint}",
        data={"user_id": "USER-123"},
        files={"image": ("person.png", image_bytes(), "image/png")},
    )
    assert response.status_code == status_code
    body = response.json()
    assert body["error_code"] == error_code
    assert "Traceback" not in response.text
    assert "FACE_ENCRYPTION_KEY" not in response.text