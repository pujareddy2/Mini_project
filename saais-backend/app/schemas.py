from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserRegister(BaseModel):
	name: str
	email: str
	password: str
	role: str = "student"
	profile_photo_url: Optional[str] = None


class UserLogin(BaseModel):
	email: str
	password: str


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"


class SessionCreate(BaseModel):
	subject: str
	end_time: datetime
	classroom_lat: float
	classroom_lon: float
	room_name: Optional[str] = "Classroom"
	wifi_ssid: Optional[str] = None


class SessionResponse(BaseModel):
	id: int
	subject: str
	qr_token: str
	start_time: datetime
	end_time: datetime
	room_name: Optional[str] = "Classroom"
	is_active: bool

	model_config = ConfigDict(from_attributes=True)


class SessionValidateRequest(BaseModel):
	qr_token: str


class SessionValidateResponse(BaseModel):
	id: int
	subject: str
	classroom_lat: float
	classroom_lon: float
	room_name: Optional[str] = "Classroom"
	wifi_ssid: Optional[str] = None
	end_time: datetime
	already_marked: bool = False
	marked_at: Optional[datetime] = None
	attendance_status: Optional[str] = None

	model_config = ConfigDict(from_attributes=True)


class AttendanceSubmit(BaseModel):
	session_id: int
	gps_lat: float
	gps_lon: float
	gps_accuracy: Optional[float] = None
	wifi_ssid: Optional[str] = None
	device_id: str
	qr_token: Optional[str] = None
	media_url: Optional[str] = None
	bssid: Optional[str] = None


class AttendanceResponse(BaseModel):
	id: int
	status: str
	confidence_score: float
	marked_at: datetime
	distance: Optional[float] = 0.0
	gps_warning: Optional[bool] = False
	flags: dict
	attendanceId: str
	message: str
	room_name: Optional[str] = "Classroom"
	allowed_range: Optional[int] = None

	model_config = ConfigDict(from_attributes=True)
 

class TimetableBase(BaseModel):
	day_of_week: str
	start_time: str
	subject: str
	class_name: str

class TimetableCreate(TimetableBase):
	pass

class TimetableResponse(TimetableBase):
	id: int
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)
