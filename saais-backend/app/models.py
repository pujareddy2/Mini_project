from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.database import Base

# Association table for faculty ↔︎ student many‑to‑many
faculty_students = Table(
    "faculty_students",
    Base.metadata,
    Column("faculty_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("student_id", Integer, ForeignKey("users.id"), primary_key=True),
)



class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String)
	email = Column(String, unique=True, index=True)
	password_hash = Column(String)
	role = Column(String, default="student")
	device_id = Column(String)
	# Many-to-many: faculty ↔︎ students
	faculty_of = relationship(
		"User",
		secondary=faculty_students,
		primaryjoin=id == faculty_students.c.faculty_id,
		secondaryjoin=id == faculty_students.c.student_id,
		backref="students_of",
	)



class Session(Base):
	__tablename__ = "sessions"

	id = Column(Integer, primary_key=True, index=True)
	faculty_id = Column(Integer, ForeignKey("users.id"))
	subject = Column(String)
	qr_token = Column(String, unique=True, index=True)
	qr_expires_at = Column(DateTime, nullable=True)
	start_time = Column(DateTime, default=datetime.utcnow)
	end_time = Column(DateTime)
	classroom_lat = Column(Float)
	classroom_lon = Column(Float)
	room_name = Column(String, default="Classroom")
	wifi_ssid = Column(String)
	is_active = Column(Boolean, default=True)
	faculty_ip = Column(String, nullable=True)


class AttendanceRecord(Base):
	__tablename__ = "attendance_records"

	id = Column(Integer, primary_key=True, index=True)
	student_id = Column(Integer, ForeignKey("users.id"))
	session_id = Column(Integer, ForeignKey("sessions.id"))
	marked_at = Column(DateTime, default=datetime.utcnow)
	gps_lat = Column(Float)
	gps_lon = Column(Float)
	wifi_ssid = Column(String)
	device_id = Column(String)
	confidence_score = Column(Float)
	status = Column(String)


class ValidationLog(Base):
	__tablename__ = "validation_logs"
	id = Column(Integer, primary_key=True, index=True)
	record_id = Column(Integer, ForeignKey("attendance_records.id"))
	reason = Column(String)
	risk_flag = Column(Boolean, default=False)
	details = Column(String)
	created_at = Column(DateTime, default=datetime.utcnow)


class DeviceBinding(Base):
	__tablename__ = "device_bindings"

	id = Column(Integer, primary_key=True, index=True)
	student_id = Column(Integer, ForeignKey("users.id"), unique=True)
	device_id = Column(String)
	bound_at = Column(DateTime, default=datetime.utcnow)


class StudentReference(Base):
	__tablename__ = "student_references"

	id = Column(Integer, primary_key=True, index=True)
	student_id = Column(Integer, ForeignKey("users.id"), unique=True)
	wifi_ssid = Column(String, nullable=True)
	wifi_bssid = Column(String, nullable=True)
	latitude = Column(Float, nullable=True)
	longitude = Column(Float, nullable=True)
	geofence_radius = Column(Float, default=5000.0)
	faculty_wifi_ssid = Column(String, nullable=True)
	student_wifi_ssid = Column(String, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
	__tablename__ = "alerts"

	id = Column(Integer, primary_key=True, index=True)
	user_id = Column(Integer, ForeignKey("users.id"))
	alert_type = Column(String)  # "low_attendance", "suspicious_attendance", "device_change"
	message = Column(String)
	is_read = Column(Boolean, default=False)
	created_at = Column(DateTime, default=datetime.utcnow)


class MediaRecord(Base):
	__tablename__ = "media_records"

	id = Column(Integer, primary_key=True, index=True)
	student_id = Column(Integer, ForeignKey("users.id"))
	filepath = Column(String)
	media_url = Column(String, unique=True, index=True)
	file_type = Column(String)  # "image" or "video"
	file_size = Column(Integer)
	hash_value = Column(String)  # phash for images, SHA-256 for videos
	capture_time = Column(DateTime)
	created_at = Column(DateTime, default=datetime.utcnow)


 
