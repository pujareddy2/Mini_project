import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(prefix="/attendance", tags=["attendance"])


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	radius = 6371000
	phi1 = math.radians(lat1)
	phi2 = math.radians(lat2)
	delta_phi = math.radians(lat2 - lat1)
	delta_lambda = math.radians(lon2 - lon1)

	a = (
		math.sin(delta_phi / 2) ** 2
		+ math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
	)
	c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
	return radius * c


@router.post("/submit", response_model=schemas.AttendanceResponse)
def submit_attendance(
	payload: schemas.AttendanceSubmit,
	db: Session = Depends(get_db),
	current_user: models.User = Depends(get_current_user),
):
	session = (
		db.query(models.Session)
		.filter(models.Session.id == payload.session_id)
		.first()
	)
	if not session:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Session not found",
		)
	if not session.is_active:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Session is not active",
		)

	existing = (
		db.query(models.AttendanceRecord)
		.filter(
			models.AttendanceRecord.session_id == payload.session_id,
			models.AttendanceRecord.student_id == current_user.id,
		)
		.first()
	)
	if existing:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Attendance already marked",
		)

	score = 0
	qr_valid = False
	gps_valid = False
	wifi_valid = False
	device_valid = False
	media_valid = bool(payload.media_url) if hasattr(payload, 'media_url') else True

	# QR validation - check if qr_token matches session token
	if payload.qr_token and session.qr_token == payload.qr_token:
		if not session.qr_expires_at or datetime.utcnow() <= session.qr_expires_at:
			qr_valid = True
			score += 25

	# Session time window
	if session.end_time and datetime.utcnow() <= session.end_time:
		score += 0  # already validated above, just track window

	# GPS validation - 50m radius threshold
	if payload.gps_lat == 0 and payload.gps_lon == 0:
		gps_valid = True
		score += 10
		distance = 0.0
	else:
		distance = haversine(
			payload.gps_lat,
			payload.gps_lon,
			session.classroom_lat,
			session.classroom_lon,
		)
		if distance <= 50:
			gps_valid = True
			score += 20

	# WiFi validation
	if not session.wifi_ssid:
		# No WiFi required for this session
		wifi_valid = True
		score += 20
	elif not payload.wifi_ssid or payload.wifi_ssid.lower() in ("unavailable", "unknown", ""):
		# WiFi not available on this device (Android restriction), skip validation
		wifi_valid = True
		score += 20
	elif session.wifi_ssid and payload.wifi_ssid.lower() == session.wifi_ssid.lower():
		wifi_valid = True
		score += 20
	else:
		wifi_valid = False

	# Media validation
	if not payload.media_url:
		media_valid = True # don't fail, but skip score
	elif media_valid:
		score += 20

	# Device validation
	binding = (
		db.query(models.DeviceBinding)
		.filter(models.DeviceBinding.student_id == current_user.id)
		.first()
	)
	if binding:
		if binding.device_id == payload.device_id:
			device_valid = True
			score += 15
	else:
		binding = models.DeviceBinding(
			student_id=current_user.id,
			device_id=payload.device_id,
		)
		db.add(binding)
		device_valid = True
		score += 15

	# Status thresholds - Strict Multi-Factor requirement
	# To be 'valid', student must pass ALL primary checks (QR, GPS, WiFi, Media)
	all_primary_passed = qr_valid and gps_valid and wifi_valid and media_valid
	
	if score >= 95 and all_primary_passed:
		status_value = "valid"
		message = "Attendance marked successfully (All factors verified)"
	elif score >= 60:
		status_value = "suspicious"
		message = "Attendance flagged: One or more security factors (GPS/WiFi/Media) failed"
	else:
		status_value = "rejected"
		message = "Attendance rejected: Multiple validation failures"

	record = models.AttendanceRecord(
		student_id=current_user.id,
		session_id=payload.session_id,
		gps_lat=payload.gps_lat,
		gps_lon=payload.gps_lon,
		wifi_ssid=payload.wifi_ssid,
		device_id=payload.device_id,
		confidence_score=score,
		status=status_value,
		marked_at=datetime.utcnow() + timedelta(hours=5, minutes=30),
	)
	db.add(record)

	# Auto-register student to faculty tracking list
	faculty = db.query(models.User).filter(models.User.id == session.faculty_id).first()
	if faculty and current_user not in faculty.faculty_of:
		faculty.faculty_of.append(current_user)

	db.commit()
	db.refresh(record)

	failed_checks = []
	if not qr_valid: failed_checks.append("qr")
	if not gps_valid: failed_checks.append("gps")
	if not wifi_valid: failed_checks.append("wifi")
	if not media_valid: failed_checks.append("media")
	if not device_valid: failed_checks.append("device")

	log = models.ValidationLog(
		record_id=record.id,
		reason=", ".join(failed_checks) if failed_checks else "none",
		risk_flag=(status_value != "valid"),
		details=f"score={score}, distance={distance:.1f}m"
	)
	db.add(log)
	db.commit()

	return {
		"id": record.id,
		"status": record.status,
		"confidence_score": record.confidence_score,
		"marked_at": record.marked_at,
		"flags": {
			"location": gps_valid,
			"wifi": wifi_valid,
			"media": media_valid,
			"device": device_valid
		},
		"attendanceId": f"ATT-{record.id}",
		"message": message,
		"distance": round(distance, 1) if 'distance' in locals() else 0.0,
		"room_name": session.room_name or "Classroom"
	}
 
