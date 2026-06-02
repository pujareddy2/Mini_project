import uuid
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

import qrcode


router = APIRouter(prefix="/session", tags=["session"])


def _require_faculty(user: models.User):
	if user.role != "faculty":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Faculty access required",
		)


@router.post("/start", response_model=schemas.SessionResponse)
def start_session(
	payload: schemas.SessionCreate,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	_require_faculty(current_user)

	qr_token = str(uuid.uuid4())
	qr_expires_at = datetime.utcnow() + timedelta(minutes=30)
	session = models.Session(
		faculty_id=current_user.id,
		subject=payload.subject,
		qr_token=qr_token,
		qr_expires_at=qr_expires_at,
		end_time=payload.end_time,
		classroom_lat=payload.classroom_lat,
		classroom_lon=payload.classroom_lon,
		room_name=payload.room_name,
		wifi_ssid=payload.wifi_ssid,
	)
	db.add(session)
	db.commit()
	db.refresh(session)

	return session


@router.post("/end/{session_id}")
def end_session(
	session_id: int,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	_require_faculty(current_user)

	session = db.query(models.Session).filter(models.Session.id == session_id).first()
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Session not found",
		)

	session.is_active = False
	db.commit()

	records = (
		db.query(models.AttendanceRecord)
		.filter(models.AttendanceRecord.session_id == session_id)
		.all()
	)
	present_count = 0
	suspicious_count = 0
	rejected_count = 0
	for record in records:
		if record.status == "valid":
			present_count += 1
		elif record.status == "suspicious":
			suspicious_count += 1
		elif record.status == "rejected":
			rejected_count += 1

	return {
		"message": "Session ended",
		"session_id": session_id,
		"subject": session.subject,
		"summary": {
			"total": len(records),
			"present": present_count,
			"suspicious": suspicious_count,
			"rejected": rejected_count,
		},
	}


@router.post("/validate-qr", response_model=schemas.SessionValidateResponse)
def validate_qr(
	payload: schemas.SessionValidateRequest,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	session = (
		db.query(models.Session)
		.filter(models.Session.qr_token == payload.qr_token)
		.first()
	)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Session not found",
		)
	if session.qr_expires_at and datetime.utcnow() > session.qr_expires_at:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="QR code expired",
		)
	if not session.is_active or (session.end_time and datetime.utcnow() > session.end_time):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Session expired or inactive",
		)

	return session


@router.get("/qr/{session_id}")
def refresh_qr(
	session_id: int,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	_require_faculty(current_user)

	session = db.query(models.Session).filter(models.Session.id == session_id).first()
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Session not found",
		)

	new_token = str(uuid.uuid4())
	qr_expires_at = datetime.utcnow() + timedelta(minutes=30)
	session.qr_token = new_token
	session.qr_expires_at = qr_expires_at
	db.commit()
	db.refresh(session)

	return {
		"session_id": session_id,
		"qr_token": new_token,
		"qr_expires_at": qr_expires_at,
		"message": "QR refreshed, valid for 30 minutes",
	}


@router.get("/qr-image/{session_id}")
def get_qr_image(
	session_id: int,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	session = db.query(models.Session).filter(
		models.Session.id == session_id
	).first()
	if not session:
		raise HTTPException(status_code=404, detail="Session not found")
	if not session.is_active:
		raise HTTPException(status_code=400, detail="Session not active")

	qr = qrcode.QRCode(
		version=1,
		error_correction=qrcode.constants.ERROR_CORRECT_L,
		box_size=10,
		border=4,
	)
	qr.add_data(session.qr_token)
	qr.make(fit=True)
	img = qr.make_image(fill_color="black", back_color="white")

	buf = io.BytesIO()
	img.save(buf, format="PNG")
	buf.seek(0)

	return StreamingResponse(buf, media_type="image/png")


@router.get("/active")
def list_active_sessions(
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	sessions = (
		db.query(models.Session)
		.filter(
			models.Session.is_active.is_(True),
			models.Session.end_time > datetime.utcnow(),
		)
		.all()
	)

	return [
		{
			"id": session.id,
			"subject": session.subject,
			"start_time": session.start_time,
			"end_time": session.end_time,
			"wifi_ssid": session.wifi_ssid,
			"classroom_lat": session.classroom_lat,
			"classroom_lon": session.classroom_lon,
		}
		for session in sessions
	]


qr_router = APIRouter(prefix="/qr", tags=["qr"])


@qr_router.post("/validate")
def validate_qr_alias(
	payload: schemas.SessionValidateRequest,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	return validate_qr(payload, db, current_user)
 
