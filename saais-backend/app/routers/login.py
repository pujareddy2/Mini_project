from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db


router = APIRouter(prefix="/auth", tags=["auth"])

failed_attempts = {}
lockout_until = {}


import os
import uuid
from fastapi import Form, UploadFile, File

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

GPS_PASS_DISTANCE = 1000.0  # metres — default geofence written to StudentReference


@router.post("/register")
async def register_user(
	name: str = Form(...),
	email: str = Form(...),
	password: str = Form(...),
	role: str = Form("student"),
	profile_photo: UploadFile = File(...),
	device_id: Optional[str] = Form(None),
	wifi_ssid: Optional[str] = Form(None),
	wifi_bssid: Optional[str] = Form(None),
	gps_lat: Optional[float] = Form(None),
	gps_lon: Optional[float] = Form(None),
	db: Session = Depends(get_db)
):
	email = email.strip().lower()

	# Reject duplicate email
	if db.query(models.User).filter(models.User.email == email).first():
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered",
		)

	# Reject duplicate device — one device may only register one account
	if device_id:
		existing_binding = (
			db.query(models.DeviceBinding)
			.filter(models.DeviceBinding.device_id == device_id)
			.first()
		)
		if existing_binding:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="This device is already registered to another account. Each device can only hold one student account.",
			)

	if not profile_photo or not getattr(profile_photo, "filename", None):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Profile photo is required for face verification during attendance",
		)

	# Save profile photo
	filename_lower = profile_photo.filename.lower()
	ext = filename_lower.split(".")[-1] if "." in filename_lower else "jpg"
	filename = f"profile_{uuid.uuid4()}.{ext}"
	filepath = os.path.join(UPLOAD_DIR, filename)
	contents = await profile_photo.read()
	with open(filepath, "wb") as f:
		f.write(contents)
	profile_photo_url = f"/{UPLOAD_DIR}/{filename}"

	# Create user
	user = models.User(
		name=name,
		email=email,
		password_hash=hash_password(password),
		role=role,
		profile_photo_url=profile_photo_url,
	)
	db.add(user)
	db.commit()
	db.refresh(user)

	# Bind device to this account at registration time
	if device_id:
		db.add(models.DeviceBinding(
			student_id=user.id,
			device_id=device_id,
		))

	# Store registration-time WiFi and GPS as the student's reference snapshot
	if role == "student":
		db.add(models.StudentReference(
			student_id=user.id,
			wifi_ssid=wifi_ssid,
			wifi_bssid=wifi_bssid,
			latitude=gps_lat,
			longitude=gps_lon,
			geofence_radius=GPS_PASS_DISTANCE,
		))

	db.commit()
	return {"message": "User registered successfully"}


@router.post("/login", response_model=schemas.TokenResponse)
def login_user(
	form_data: OAuth2PasswordRequestForm = Depends(),
	db: Session = Depends(get_db),
):
	locked_until = lockout_until.get(form_data.username)
	if locked_until and datetime.utcnow() < locked_until:
		raise HTTPException(
			status_code=status.HTTP_429_TOO_MANY_REQUESTS,
			detail="Too many failed attempts. Try again after 5 minutes.",
		)

	user = db.query(models.User).filter(models.User.email == form_data.username).first()
	if not user or not verify_password(form_data.password, user.password_hash):
		failed_attempts[form_data.username] = failed_attempts.get(form_data.username, 0) + 1
		if failed_attempts[form_data.username] >= 5:
			lockout_until[form_data.username] = datetime.utcnow() + timedelta(minutes=5)
			failed_attempts[form_data.username] = 0
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid email or password",
			headers={"WWW-Authenticate": "Bearer"},
		)

	failed_attempts[form_data.username] = 0
	access_token = create_access_token({"sub": user.email})
	return schemas.TokenResponse(access_token=access_token)


class StudentLoginRequest(BaseModel):
	email: str
	password: str
	device_id: Optional[str] = None

@router.post("/student/login")
def student_login(
	payload: StudentLoginRequest,
	db: Session = Depends(get_db),
):
	user = db.query(models.User).filter(
		models.User.email == payload.email.strip().lower()
	).first()
	
	if not user or not verify_password(payload.password, user.password_hash):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid email or password",
		)
	
	# Enforce device check for students — binding was established at registration
	if user.role == "student" and payload.device_id:
		binding = (
			db.query(models.DeviceBinding)
			.filter(models.DeviceBinding.student_id == user.id)
			.first()
		)
		if binding and binding.device_id != payload.device_id:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="This account is registered to a different device. Log in from your registered device.",
			)

	access_token = create_access_token({"sub": user.email})
	
	return {
		"token": access_token,
		"student_id": str(user.id),
		"email": user.email,
		"name": user.name,
		"role": user.role,
	}
 
