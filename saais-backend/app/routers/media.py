from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File
from app.auth import get_current_user
from app import models
import uuid
import os

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_media(
    photo: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(get_current_user),
):
    if not photo:
        return {"media_url": None, "url": None, "message": "No media uploaded"}
    ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    contents = await photo.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    media_url = f"/uploads/{filename}"
    return {"media_url": media_url}
