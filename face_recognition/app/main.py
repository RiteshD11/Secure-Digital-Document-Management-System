from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes.face import router as face_router


app = FastAPI(
    title="Face Recognition Service",
    description="Independent API boundary for face registration and verification.",
    version="1.0.0",
)

app.include_router(face_router)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    locations = {error.get("loc", ()) for error in exc.errors()}
    if any("user_id" in location for location in locations):
        error_code, message = "VALIDATION_ERROR", "User ID is required."
    elif any("image" in location for location in locations):
        error_code, message = "IMAGE_REQUIRED", "Image file is required."
    else:
        error_code, message = "VALIDATION_ERROR", "Request validation failed."
    return JSONResponse(status_code=422, content={"success": False, "error_code": error_code, "message": message})


@app.exception_handler(HTTPException)
async def face_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error_code" in exc.detail and "message" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={"success": False, "error_code": exc.detail["error_code"], "message": exc.detail["message"]},
        )
    return JSONResponse(status_code=exc.status_code, headers=exc.headers, content={"success": False, "error_code": "HTTP_ERROR", "message": str(exc.detail)})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}