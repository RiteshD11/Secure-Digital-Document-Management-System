from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.errors import (
    ComparisonError,
    DatabaseError,
    DecryptionError,
    DuplicateUserError,
    EmptyImageError,
    EncryptionError,
    FaceProcessingError,
    InvalidImageError,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
    UnsupportedImageFormatError,
    UserNotFoundError,
)
from app.models.schemas import FaceErrorResponse, FaceRegisterResponse, FaceVerifyResponse
from app.services.face_service import FaceService, get_face_service
from app.services.image_service import decode_image
from app.utils.logging import get_logger


logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/face", tags=["face recognition"])

ERROR_RESPONSES = {
    400: {"model": FaceErrorResponse, "description": "Invalid image or face input."},
    404: {"model": FaceErrorResponse, "description": "No registered face found."},
    409: {"model": FaceErrorResponse, "description": "Face already registered."},
    422: {"model": FaceErrorResponse, "description": "Missing or invalid request fields."},
    500: {"model": FaceErrorResponse, "description": "Internal face-processing error."},
    503: {"model": FaceErrorResponse, "description": "Face model or database unavailable."},
}


def _service(request: Request) -> FaceService:
    return getattr(request.app.state, "face_service", None) or get_face_service()


async def _read_image(file: UploadFile) -> object:
    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file is required.")
    file_bytes = await file.read(settings.face_max_upload_size_mb * 1024 * 1024 + 1)
    if len(file_bytes) > settings.face_max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error_code": "IMAGE_TOO_LARGE", "message": "Uploaded image exceeds the maximum allowed size."})
    try:
        return decode_image(file_bytes, file.filename, file.content_type)
    except UnsupportedImageFormatError as exc:
        raise HTTPException(status_code=400, detail={"error_code": "UNSUPPORTED_IMAGE_FORMAT", "message": "Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP."}) from exc
    except EmptyImageError as exc:
        raise HTTPException(status_code=400, detail={"error_code": "IMAGE_REQUIRED", "message": "Uploaded image is empty."}) from exc
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail={"error_code": "INVALID_IMAGE", "message": "Invalid image file. The uploaded file could not be processed as an image."}) from exc


def _error(status_code: int, error_code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error_code": error_code, "message": message})


def _validate_user_id(user_id: str) -> str:
    normalized = user_id.strip()
    if not normalized:
        raise _error(422, "VALIDATION_ERROR", "User ID is required.")
    return normalized


@router.post("/register", response_model=FaceRegisterResponse, responses=ERROR_RESPONSES)
async def register_face(
    request: Request,
    user_id: Annotated[str, Form(..., min_length=1)],
    image: Annotated[UploadFile, File(...)],
) -> FaceRegisterResponse:
    user_id = _validate_user_id(user_id)
    image_data = await _read_image(image)
    try:
        _service(request).register(user_id, image_data)
    except DuplicateUserError as exc:
        raise _error(409, "DUPLICATE_USER", "Face is already registered for this user.") from exc
    except NoFaceDetectedError as exc:
        raise _error(400, "NO_FACE_DETECTED", "No face detected. Please upload a clear image containing exactly one face.") from exc
    except MultipleFacesDetectedError as exc:
        raise _error(400, "MULTIPLE_FACES_DETECTED", "Multiple faces detected. Please upload an image containing exactly one face.") from exc
    except EncryptionError as exc:
        logger.exception("Face encryption failed for user_id=%s", user_id)
        raise _error(500, "ENCRYPTION_ERROR", "Face registration could not be completed due to a secure-storage error.") from exc
    except DatabaseError as exc:
        logger.exception("Face database failure during registration for user_id=%s", user_id)
        raise _error(503, "DATABASE_ERROR", "Face registration could not be completed because the face database is unavailable.") from exc
    except FaceProcessingError as exc:
        logger.exception("Face processing failed during registration for user_id=%s", user_id)
        raise _error(503, "FACE_PROCESSING_ERROR", "Face processing could not be completed. Please try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected face registration failure for user_id=%s", user_id)
        raise _error(500, "FACE_PROCESSING_ERROR", "Face processing could not be completed. Please try again.") from exc
    return FaceRegisterResponse(user_id=user_id)


@router.post("/verify", response_model=FaceVerifyResponse, responses=ERROR_RESPONSES)
async def verify_face(
    request: Request,
    user_id: Annotated[str, Form(..., min_length=1)],
    image: Annotated[UploadFile, File(...)],
) -> FaceVerifyResponse:
    user_id = _validate_user_id(user_id)
    image_data = await _read_image(image)
    try:
        match = _service(request).verify(user_id, image_data)
    except UserNotFoundError as exc:
        raise _error(404, "USER_NOT_FOUND", "No registered face found for this user.") from exc
    except DecryptionError as exc:
        logger.exception("Face decryption failed during verification for user_id=%s", user_id)
        raise _error(500, "DECRYPTION_ERROR", "Face verification could not be completed because the stored face data could not be accessed securely.") from exc
    except NoFaceDetectedError as exc:
        raise _error(400, "NO_FACE_DETECTED", "No face detected. Please upload a clear image containing exactly one face.") from exc
    except MultipleFacesDetectedError as exc:
        raise _error(400, "MULTIPLE_FACES_DETECTED", "Multiple faces detected. Please upload an image containing exactly one face.") from exc
    except ComparisonError as exc:
        logger.exception("Face comparison failed for user_id=%s", user_id)
        raise _error(500, "VERIFICATION_ERROR", "Face verification could not be completed. Please try again.") from exc
    except DatabaseError as exc:
        logger.exception("Face database failure during verification for user_id=%s", user_id)
        raise _error(503, "DATABASE_ERROR", "Face verification could not be completed because the face database is unavailable.") from exc
    except FaceProcessingError as exc:
        logger.exception("Face processing failed during verification for user_id=%s", user_id)
        raise _error(503, "FACE_PROCESSING_ERROR", "Face processing could not be completed. Please try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected face verification failure for user_id=%s", user_id)
        raise _error(500, "VERIFICATION_ERROR", "Face verification could not be completed. Please try again.") from exc
    return FaceVerifyResponse(user_id=user_id, match=match)