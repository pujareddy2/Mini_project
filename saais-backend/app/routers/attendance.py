import math
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(prefix="/attendance", tags=["attendance"])


def get_client_ip(request: Request) -> str:
	x_forwarded_for = request.headers.get("x-forwarded-for")
	if x_forwarded_for:
		return x_forwarded_for.split(",")[0].strip()
	return request.client.host


def is_same_network(ip1: str, ip2: str) -> bool:
	if ip1 == ip2:
		return True
	
	# Check if both are private IPs (e.g. 192.168.x.x)
	# If they are on the same local Wi-Fi network, their first 3 octets will match.
	if ip1.startswith("192.168.") and ip2.startswith("192.168."):
		parts1 = ip1.split(".")
		parts2 = ip2.split(".")
		if len(parts1) >= 3 and len(parts2) >= 3:
			return parts1[:3] == parts2[:3]

	if ip1.startswith("10.") and ip2.startswith("10."):
		parts1 = ip1.split(".")
		parts2 = ip2.split(".")
		if len(parts1) >= 3 and len(parts2) >= 3:
			return parts1[:3] == parts2[:3]

	if ip1.startswith("172.") and ip2.startswith("172."):
		parts1 = ip1.split(".")
		parts2 = ip2.split(".")
		if len(parts1) >= 2 and len(parts2) >= 2:
			try:
				if 16 <= int(parts1[1]) <= 31 and 16 <= int(parts2[1]) <= 31:
					return parts1[:2] == parts2[:2]
			except ValueError:
				pass

	return False


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
	request: Request,
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

	# 1. IP Matching Verification (Faculty vs Student IP, supporting proxies)
	student_ip = get_client_ip(request)
	if session.faculty_ip and not is_same_network(student_ip, session.faculty_ip):
		# Mismatch! Immediately reject
		status_value = "rejected"
		message = f"Attendance rejected: IP address mismatch. Student IP ({student_ip}) does not match Faculty IP ({session.faculty_ip}). Please connect to the same Wi-Fi."
		
		record = models.AttendanceRecord(
			student_id=current_user.id,
			session_id=payload.session_id,
			gps_lat=payload.gps_lat,
			gps_lon=payload.gps_lon,
			wifi_ssid=payload.wifi_ssid,
			device_id=payload.device_id,
			confidence_score=0.0,
			status=status_value,
			marked_at=datetime.utcnow() + timedelta(hours=5, minutes=30),
		)
		db.add(record)
		db.commit()
		db.refresh(record)

		log = models.ValidationLog(
			record_id=record.id,
			reason="ip_mismatch",
			risk_flag=True,
			details=f"student_ip={student_ip}, faculty_ip={session.faculty_ip}"
		)
		db.add(log)
		db.commit()

		return {
			"id": record.id,
			"status": record.status,
			"confidence_score": record.confidence_score,
			"marked_at": record.marked_at,
			"flags": {
				"location": False,
				"wifi": False,
				"media": False,
				"device": False
			},
			"attendanceId": f"ATT-{record.id}",
			"message": message,
			"distance": 0.0,
			"room_name": session.room_name or "Classroom"
		}

	score = 0
	qr_valid = False
	gps_valid = False
	gps_warning = False
	wifi_valid = False
	device_valid = False
	media_valid = bool(payload.media_url) if hasattr(payload, 'media_url') else True

	# 1) QR Validation (25 pts)
	if payload.qr_token and session.qr_token == payload.qr_token:
		if not session.qr_expires_at or datetime.utcnow() <= session.qr_expires_at:
			qr_valid = True
			score += 25

	# Check if StudentReference exists
	reference = (
		db.query(models.StudentReference)
		.filter(models.StudentReference.student_id == current_user.id)
		.first()
	)

	# 2) GPS Validation (20 pts)
	distance = -1.0
	if reference:
		# Subsequent check: validate against registered reference location
		if payload.gps_lat == 0 and payload.gps_lon == 0:
			gps_valid = False
			distance = -1.0
		else:
			distance = haversine(
				payload.gps_lat,
				payload.gps_lon,
				reference.latitude,
				reference.longitude,
			)

			if distance <= 1000.0:  # 1km geofence
				gps_valid = True
				score += 20
			elif distance <= 1100.0 and payload.gps_accuracy and payload.gps_accuracy <= 50.0:
				gps_valid = True
				gps_warning = True
				score += 15
	else:
		# First check: validate against classroom location
		if payload.gps_lat == 0 and payload.gps_lon == 0:
			gps_valid = False
			distance = -1.0
		else:
			distance = haversine(
				payload.gps_lat,
				payload.gps_lon,
				session.classroom_lat,
				session.classroom_lon,
			)
			
			if distance <= 1000.0:  # 1km geofence
				gps_valid = True
				score += 20
			elif distance <= 1100.0 and payload.gps_accuracy and payload.gps_accuracy <= 50.0:
				gps_valid = True
				gps_warning = True
				score += 15

	# 3) WiFi Validation (20 pts)
	if reference:
		# Subsequent check: validate against reference WiFi
		if not reference.wifi_ssid:
			wifi_valid = True
			score += 20
		elif not payload.wifi_ssid or payload.wifi_ssid.lower() in ("unavailable", "unknown", ""):
			wifi_valid = True
			score += 20
		else:
			ssid_match = (payload.wifi_ssid.lower() == reference.wifi_ssid.lower())
			bssid_match = False
			if payload.bssid and reference.wifi_bssid:
				bssid_match = (payload.bssid.lower() == reference.wifi_bssid.lower())
			
			if ssid_match or bssid_match:
				wifi_valid = True
				score += 20
	else:
		# First check: validate against session WiFi
		if not session.wifi_ssid:
			wifi_valid = True
			score += 20
		elif not payload.wifi_ssid or payload.wifi_ssid.lower() in ("unavailable", "unknown", ""):
			wifi_valid = True
			score += 20
		elif session.wifi_ssid and payload.wifi_ssid.lower() == session.wifi_ssid.lower():
			wifi_valid = True
			score += 20
		else:
			wifi_valid = False

	# 4) Media Validation & Liveness (20 pts)
	if not payload.media_url:
		media_valid = True  # don't fail, but skip score
	else:
		media_rec = db.query(models.MediaRecord).filter(
			models.MediaRecord.media_url == payload.media_url,
			models.MediaRecord.student_id == current_user.id
		).first()
		if media_rec:
			from app.services.face_service import verify_face, check_liveness
			if not current_user.profile_photo_url:
				# Cannot verify if student has no profile photo
				media_valid = False
			else:
				profile_path = current_user.profile_photo_url.lstrip("/")
				attendance_path = media_rec.filepath
				
				is_live = check_liveness(attendance_path)
				is_match, dist_face = verify_face(profile_path, attendance_path)
				
				if is_live and is_match:
					media_valid = True
					score += 20
				else:
					media_valid = False

	# 5) Device Validation (15 pts)
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
			# Strict lockout device verification mismatch
			device_valid = False
	else:
		binding = models.DeviceBinding(
			student_id=current_user.id,
			device_id=payload.device_id,
		)
		db.add(binding)
		device_valid = True
		score += 15

	# Status thresholds
	# 75-100: valid
	# 60-74: suspicious
	# Below 60: rejected
	if not media_valid:
		status_value = "rejected"
		message = "Attendance rejected: Face verification failed. You are not the registered student."
	elif score >= 75 and not gps_warning:
		status_value = "valid"
		message = "Attendance marked successfully"
	elif score >= 60:
		status_value = "suspicious"
		message = "Attendance flagged: One or more security factors failed or low GPS accuracy"
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

	# 7) Locked-in Parameters Creation (On first successful attendance)
	if not reference and status_value == "valid":
		new_reference = models.StudentReference(
			student_id=current_user.id,
			wifi_ssid=payload.wifi_ssid,
			wifi_bssid=payload.bssid,
			latitude=payload.gps_lat,
			longitude=payload.gps_lon,
			geofence_radius=600.0,
			faculty_wifi_ssid=session.wifi_ssid,
			student_wifi_ssid=payload.wifi_ssid
		)
		db.add(new_reference)

	db.commit()
	db.refresh(record)

	# --- Automatic Alerts Generation (Module 5) ---
	from app.services.alert_service import create_alert

	# Alert 1: Student Alert: Attendance Below 75%
	all_records = (
		db.query(models.AttendanceRecord)
		.filter(models.AttendanceRecord.student_id == current_user.id)
		.all()
	)
	total_count = len(all_records)
	present_count = len([r for r in all_records if r.status == "valid"])
	percentage = (present_count / total_count) * 100 if total_count > 0 else 0
	if percentage < 75.0:
		create_alert(
			db,
			current_user.id,
			"low_attendance",
			f"Your attendance has dropped below 75%. Current attendance: {round(percentage, 1)}%"
		)

	# Alert 2: Faculty Alert: Suspicious Attendance Detected
	if status_value in ("suspicious", "rejected"):
		create_alert(
			db,
			session.faculty_id,
			"suspicious_attendance",
			f"Suspicious attendance detected from student {current_user.name} in session {payload.session_id}"
		)

	# Alert 3: Admin/Faculty Alert: Multiple Device Changes
	if not device_valid:
		create_alert(
			db,
			session.faculty_id,
			"device_change",
			f"Multiple device changes detected for student {current_user.name}. Possible phone sharing."
		)

	# Alert 4: Faculty Alert: Risk Score Increased (Confidence Score Drop)
	prev_records = (
		db.query(models.AttendanceRecord)
		.filter(
			models.AttendanceRecord.student_id == current_user.id,
			models.AttendanceRecord.id != record.id
		)
		.order_by(models.AttendanceRecord.marked_at.desc())
		.limit(3)
		.all()
	)
	if prev_records:
		avg_prev_score = sum(r.confidence_score for r in prev_records) / len(prev_records)
		if avg_prev_score - score >= 25.0:
			create_alert(
				db,
				session.faculty_id,
				"risk_score_increase",
				f"Student {current_user.name}'s risk score has increased"
			)

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
		"gps_warning": gps_warning,
		"room_name": session.room_name or "Classroom"
	}
 
