import math
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(prefix="/attendance", tags=["attendance"])

# --------------- Scoring weights (must sum to 100) ---------------
QR_SCORE = 25
GPS_SCORE_FULL = 20
GPS_SCORE_WARN = 15       # partial credit when GPS accuracy is poor
WIFI_SCORE = 20
MEDIA_SCORE = 20
DEVICE_SCORE = 15

# GPS geofence
GPS_PASS_DISTANCE = 1000.0          # metres — hard pass
GPS_WARN_DISTANCE_FACTOR = 1.1     # 10 % buffer for soft pass
GPS_ACCURACY_WARN = 50.0           # metres — max GPS error allowed for soft pass

# Attendance status thresholds
VALID_SCORE = 75
SUSPICIOUS_SCORE = 60

# Alert thresholds
MIN_ATTENDANCE_PCT = 75.0
SCORE_DROP_THRESHOLD = 25.0

# Timezone: India Standard Time offset from UTC
IST_OFFSET = timedelta(hours=5, minutes=30)
# -----------------------------------------------------------------


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
			marked_at=datetime.utcnow() + IST_OFFSET,
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
			"room_name": session.room_name or "Classroom",
			"allowed_range": int(GPS_PASS_DISTANCE)
		}

	score = 0
	qr_valid = False
	gps_valid = False
	gps_warning = False
	wifi_valid = False
	device_valid = False
	media_valid = bool(payload.media_url) if hasattr(payload, 'media_url') else True

	# 1) QR Validation
	if payload.qr_token and session.qr_token == payload.qr_token:
		if not session.qr_expires_at or datetime.utcnow() <= session.qr_expires_at:
			qr_valid = True
			score += QR_SCORE

	# 2) GPS Validation — always compared against the faculty's live classroom position
	distance = -1.0
	geofence = GPS_PASS_DISTANCE
	warn_fence = geofence * GPS_WARN_DISTANCE_FACTOR

	if payload.gps_lat == 0 and payload.gps_lon == 0:
		gps_valid = False
	elif not session.classroom_lat or not session.classroom_lon:
		# Faculty didn't capture GPS when starting session — skip check
		gps_valid = True
		score += GPS_SCORE_FULL
	else:
		distance = haversine(
			payload.gps_lat,
			payload.gps_lon,
			session.classroom_lat,
			session.classroom_lon,
		)
		if distance <= geofence:
			gps_valid = True
			score += GPS_SCORE_FULL
		elif distance <= warn_fence and payload.gps_accuracy and payload.gps_accuracy <= GPS_ACCURACY_WARN:
			gps_valid = True
			gps_warning = True
			score += GPS_SCORE_WARN

	# 3) WiFi Validation — always compared against the faculty's session WiFi
	if not session.wifi_ssid or session.wifi_ssid.strip() == '':
		# Faculty session has no WiFi configured — skip check
		wifi_valid = True
		score += WIFI_SCORE
	elif not payload.wifi_ssid or payload.wifi_ssid.lower() in ("unavailable", "unknown", ""):
		# Student on web or device can't read WiFi — award points (can't enforce)
		wifi_valid = True
		score += WIFI_SCORE
	elif payload.wifi_ssid.lower() == session.wifi_ssid.lower():
		wifi_valid = True
		score += WIFI_SCORE
	else:
		wifi_valid = False

	# 4) Media Validation & Liveness
	if not payload.media_url or payload.media_url == 'no_photo':
		media_valid = True  # don't fail, but skip score
	else:
		media_rec = db.query(models.MediaRecord).filter(
			models.MediaRecord.media_url == payload.media_url,
			models.MediaRecord.student_id == current_user.id
		).first()
		if media_rec:
			try:
				from app.services.face_service import verify_face, check_liveness
				face_service_available = True
			except Exception:
				face_service_available = False

			if not face_service_available:
				# deepface/cv2 not installed — award points so attendance isn't blocked
				media_valid = True
				score += MEDIA_SCORE
			elif not current_user.profile_photo_url:
				media_valid = False
			else:
				profile_path = current_user.profile_photo_url.lstrip("/")
				attendance_path = media_rec.filepath

				is_live = check_liveness(attendance_path)
				is_match, dist_face = verify_face(profile_path, attendance_path)

				if is_live and is_match:
					media_valid = True
					score += MEDIA_SCORE
				else:
					media_valid = False

	# 5) Device Validation — binding established at registration
	binding = (
		db.query(models.DeviceBinding)
		.filter(models.DeviceBinding.student_id == current_user.id)
		.first()
	)
	if not binding:
		# Legacy account (registered before device binding was enforced) — bind now
		db.add(models.DeviceBinding(student_id=current_user.id, device_id=payload.device_id))
		device_valid = True
		score += DEVICE_SCORE
	elif binding.device_id == payload.device_id:
		device_valid = True
		score += DEVICE_SCORE
	else:
		device_valid = False

	# Status determination:
	#   media failure → unconditional reject (identity cannot be confirmed)
	#   score >= VALID_SCORE and no GPS warning → valid
	#   score >= SUSPICIOUS_SCORE → suspicious (flagged for review)
	#   score < SUSPICIOUS_SCORE → rejected (too many failures)
	if not media_valid:
		status_value = "rejected"
		message = "Attendance rejected: Face verification failed. You are not the registered student."
	elif score >= VALID_SCORE and not gps_warning:
		status_value = "valid"
		message = "Attendance marked successfully"
	elif score >= SUSPICIOUS_SCORE:
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
		marked_at=datetime.utcnow() + IST_OFFSET,
	)
	db.add(record)

	# Auto-register student to faculty tracking list
	faculty = db.query(models.User).filter(models.User.id == session.faculty_id).first()
	if faculty and current_user not in faculty.faculty_of:
		faculty.faculty_of.append(current_user)

	db.commit()
	db.refresh(record)

	# --- Automatic Alerts Generation (Module 5) ---
	from app.services.alert_service import create_alert

	# Alert 1: Student Alert: Attendance Below threshold
	all_records = (
		db.query(models.AttendanceRecord)
		.filter(models.AttendanceRecord.student_id == current_user.id)
		.all()
	)
	total_count = len(all_records)
	present_count = len([r for r in all_records if r.status == "valid"])
	percentage = (present_count / total_count) * 100 if total_count > 0 else 0
	if percentage < MIN_ATTENDANCE_PCT:
		create_alert(
			db,
			current_user.id,
			"low_attendance",
			f"Your attendance has dropped below {int(MIN_ATTENDANCE_PCT)}%. Current attendance: {round(percentage, 1)}%"
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
		if avg_prev_score - score >= SCORE_DROP_THRESHOLD:
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
		"distance": round(distance, 1) if distance >= 0 else -1.0,
		"gps_warning": gps_warning,
		"room_name": session.room_name or "Classroom",
		"allowed_range": int(geofence)
	}
 
