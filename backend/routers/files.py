"""
routers/files.py

File upload + serving.
  POST /upload             — multipart upload, returns stored path + url
  GET  /files/{filename}   — serve an uploaded file (inline / download)
"""

import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from config import settings
import models
from utils.jwt import get_current_user

router = APIRouter(tags=["Files"])

ALLOWED_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".zip",
}
UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type '{ext or 'unknown'}' is not allowed")

    contents = await file.read()
    size = len(contents)
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(400, f"File exceeds the {settings.MAX_UPLOAD_MB}MB limit")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored_name)
    with open(dest, "wb") as f:
        f.write(contents)

    return {
        "file_name": file.filename,
        "file_path": stored_name,
        "file_size": size,
        "url": f"/files/{stored_name}",
    }


@router.get("/files/{filename}")
def serve_file(filename: str):
    # prevent path traversal — only allow a bare filename
    safe = os.path.basename(filename)
    path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    return FileResponse(path)
