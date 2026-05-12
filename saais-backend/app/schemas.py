from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserRegister(BaseModel):
	name: str
	email: str
	password: str
	role: str = "student"


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

	model_config = ConfigDict(from_attributes=True)


class AttendanceSubmit(BaseModel):
	session_id: int
	gps_lat: float
	gps_lon: float
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
	flags: dict
	attendanceId: str
	message: str
	distance: Optional[float] = 0.0
	room_name: Optional[str] = "Classroom"

	model_config = ConfigDict(from_attributes=True)
 
