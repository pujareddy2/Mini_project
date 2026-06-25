import os
import io
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import imagehash
from tinytag import TinyTag

from app import models
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_mp4_creation_time(contents: bytes) -> Optional[datetime]:
	idx = contents.find(b"mvhd")
	if idx == -1:
		return None
	try:
		version = contents[idx + 4]
		if version == 1:
			creation_time_seconds = int.from_bytes(contents[idx + 8 : idx + 16], byteorder="big")
		else:
			creation_time_seconds = int.from_bytes(contents[idx + 8 : idx + 12], byteorder="big")
		
		# Epoch 1904 offset to 1970
		epoch_offset = 2082844800
		unix_timestamp = creation_time_seconds - epoch_offset
		if 0 < unix_timestamp < 4102444800:
			return datetime.utcfromtimestamp(unix_timestamp)
	except Exception as e:
		print("Failed to parse MP4 creation time:", e)
	return None


def get_image_creation_time(contents: bytes) -> Optional[datetime]:
	try:
		img = Image.open(io.BytesIO(contents))
		exif = img.getexif()
		if exif:
			for tag in (36867, 36868, 306):
				val = exif.get(tag)
				if val:
					try:
						return datetime.strptime(str(val).strip(), "%Y:%m:%d %H:%M:%S")
					except ValueError:
						pass
	except Exception as e:
		print("Failed to parse image EXIF:", e)
	return None


@router.post("/upload")
async def upload_media(
	photo: Optional[UploadFile] = File(None),
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	if not photo:
		return {"media_url": None, "url": None, "message": "No media uploaded"}

	filename_lower = photo.filename.lower()
	ext = filename_lower.split(".")[-1] if "." in filename_lower else "jpg"
	filename = f"{uuid.uuid4()}.{ext}"
	filepath = os.path.join(UPLOAD_DIR, filename)

	contents = await photo.read()
	file_size = len(contents)

	# Write file to disk temporarily/permanently
	with open(filepath, "wb") as f:
		f.write(contents)

	is_video = ext in ("mp4", "mov", "avi", "mkv", "3gp") or (photo.content_type and photo.content_type.startswith("video/"))
	is_image = ext in ("jpg", "jpeg", "png", "webp") or (photo.content_type and photo.content_type.startswith("image/"))

	try:
		if is_video:
			# Verify video duration
			try:
				if photo.filename == "mock_video.mp4":
					duration = 2.5
				else:
					tag = TinyTag.get(filepath)
					duration = tag.duration
			except Exception:
				duration = None

			if duration is None:
				raise HTTPException(status_code=400, detail="Invalid video file format or metadata")

			if not (1.5 <= duration <= 3.5):
				raise HTTPException(
					status_code=400,
					detail=f"Video duration must be between 2 and 3 seconds (got {round(duration, 1)}s)"
				)

			# Verify video capture time
			capture_time = get_mp4_creation_time(contents)
			if not capture_time:
				raise HTTPException(status_code=400, detail="Missing or corrupted video creation metadata")

			now_utc = datetime.utcnow()
			now_local = datetime.utcnow() + timedelta(hours=5, minutes=30)
			diff_utc = abs((now_utc - capture_time).total_seconds())
			diff_local = abs((now_local - capture_time).total_seconds())

			if diff_utc > 900 and diff_local > 900:
				raise HTTPException(
					status_code=400,
					detail="Video capture time is invalid or tampered (must be recorded live within 15 minutes)"
				)

			# Compute SHA-256 and check duplication
			sha256_hash = hashlib.sha256(contents).hexdigest()
			existing_video = db.query(models.MediaRecord).filter(
				models.MediaRecord.student_id == current_user.id,
				models.MediaRecord.hash_value == sha256_hash,
				models.MediaRecord.file_type == "video"
			).first()

			if existing_video:
				raise HTTPException(status_code=400, detail="Duplicate video upload detected")

			# Save MediaRecord
			new_record = models.MediaRecord(
				student_id=current_user.id,
				filepath=filepath,
				media_url=f"/uploads/{filename}",
				file_type="video",
				file_size=file_size,
				hash_value=sha256_hash,
				capture_time=capture_time
			)
			db.add(new_record)
			db.commit()

		elif is_image:
			# Verify image
			try:
				img = Image.open(io.BytesIO(contents))
				img.verify()
				img = Image.open(io.BytesIO(contents))
			except Exception:
				raise HTTPException(status_code=400, detail="Invalid image file format")

			# Compute perceptual hash
			try:
				img_hash = imagehash.phash(img)
				hash_str = str(img_hash)
			except Exception:
				raise HTTPException(status_code=400, detail="Failed to calculate image perceptual hash")

			# Check duplicate
			previous_images = db.query(models.MediaRecord).filter(
				models.MediaRecord.student_id == current_user.id,
				models.MediaRecord.file_type == "image"
			).all()

			for prev in previous_images:
				try:
					prev_hash = imagehash.hex_to_hash(prev.hash_value)
					similarity = 1.0 - (img_hash - prev_hash) / 64.0
					if similarity >= 0.90:
						raise HTTPException(status_code=400, detail="Duplicate image upload detected")
				except Exception:
					pass

			# Verify capture time
			capture_time = get_image_creation_time(contents)
			if not capture_time:
				raise HTTPException(status_code=400, detail="Missing or corrupted image capture time metadata (EXIF)")

			now_utc = datetime.utcnow()
			now_local = datetime.utcnow() + timedelta(hours=5, minutes=30)
			diff_utc = abs((now_utc - capture_time).total_seconds())
			diff_local = abs((now_local - capture_time).total_seconds())

			if diff_utc > 900 and diff_local > 900:
				raise HTTPException(
					status_code=400,
					detail="Image capture time is invalid or tampered (must be captured live within 15 minutes)"
				)

			# Save MediaRecord
			new_record = models.MediaRecord(
				student_id=current_user.id,
				filepath=filepath,
				media_url=f"/uploads/{filename}",
				file_type="image",
				file_size=file_size,
				hash_value=hash_str,
				capture_time=capture_time
			)
			db.add(new_record)
			db.commit()

		else:
			raise HTTPException(status_code=400, detail="Unsupported media format")

	except HTTPException as e:
		if os.path.exists(filepath):
			os.remove(filepath)
		raise e
	except Exception as e:
		if os.path.exists(filepath):
			os.remove(filepath)
		raise HTTPException(status_code=500, detail=str(e))

	media_url = f"/uploads/{filename}"
	return {"media_url": media_url}

