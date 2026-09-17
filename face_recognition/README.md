# Face Recognition Module

This module is independently runnable on port `8001`:

```bash
cd face_recognition
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

The service uses InsightFace `buffalo_l` with SCRFD detection and ArcFace embeddings. Embeddings are encrypted with `FACE_ENCRYPTION_KEY` and stored in the local encrypted face database. It provides:

- `POST /api/v1/face/register`
- `POST /api/v1/face/verify`
- `GET /health`

Both face endpoints accept `multipart/form-data` with a `user_id` string and an uploaded JPG, JPEG, PNG, or WEBP image. Exactly one face is required. No original image is stored, no embeddings are returned, and no face embeddings are sent to Qdrant. Configure `FACE_ENCRYPTION_KEY` through the repository-root `.env`; it is never stored in source code.