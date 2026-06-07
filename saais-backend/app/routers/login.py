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


@router.post("/register")
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
	existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
	if existing_user:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered",
		)

	user = models.User(
		name=payload.name,
		email=payload.email,
		password_hash=hash_password(payload.password),
		role=payload.role,
	)
	db.add(user)
	db.commit()
	db.refresh(user)

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
		models.User.email == payload.email
	).first()
	
	if not user or not verify_password(payload.password, user.password_hash):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid email or password",
		)
	
	# Enforce device locking for students
	if user.role == "student" and payload.device_id:
		binding = db.query(models.DeviceBinding).filter(
			models.DeviceBinding.student_id == user.id
		).first()
		
		if binding:
			if binding.device_id != payload.device_id:
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail="This student account is bound to another device. You can only log in from your registered device.",
				)
		else:
			new_binding = models.DeviceBinding(
				student_id=user.id,
				device_id=payload.device_id,
			)
			db.add(new_binding)
			db.commit()

	access_token = create_access_token({"sub": user.email})
	
	return {
		"token": access_token,
		"student_id": str(user.id),
		"email": user.email,
		"name": user.name,
		"role": user.role,
	}
 
