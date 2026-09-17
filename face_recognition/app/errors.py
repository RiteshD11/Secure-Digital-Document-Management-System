from __future__ import annotations


class FaceError(Exception):
    """Base class for expected face-service failures."""


class ImageError(FaceError):
    pass


class UnsupportedImageFormatError(ImageError):
    pass


class EmptyImageError(ImageError):
    pass


class InvalidImageError(ImageError):
    pass


class NoFaceDetectedError(FaceError):
    pass


class MultipleFacesDetectedError(FaceError):
    pass


class FaceProcessingError(FaceError):
    pass


class DuplicateUserError(FaceError):
    pass


class UserNotFoundError(FaceError):
    pass


class EncryptionError(FaceError):
    pass


class DecryptionError(FaceError):
    pass


class DatabaseError(FaceError):
    pass


class ComparisonError(FaceError):
    pass