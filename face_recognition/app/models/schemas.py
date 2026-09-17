from pydantic import BaseModel, Field


class FaceRegisterResponse(BaseModel):
    success: bool = True
    user_id: str


class FaceVerifyResponse(BaseModel):
    success: bool = True
    user_id: str
    match: bool


class FaceErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str