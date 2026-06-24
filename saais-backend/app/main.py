import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.database import Base, engine
from app.routers import analytics, attendance, login, media, session, faculty
from app.routers.session import qr_router
from app.seed import seed_users


app = FastAPI(
	title="SAAIS — Smart Adaptive Attendance Intelligence System",
	description="""
	## Backend API for SAAIS

	A smart attendance system with:
	- JWT Authentication & Role-based Access
	- GPS-based Location Verification
	- Wi-Fi Network Validation
	- Device Binding & Trust Scoring
	- Auto-expiring QR Tokens (60s)
	- Confidence Score Engine
	- Suspicious Behavior Detection
	- Real-time Analytics Dashboard
	""",
	version="1.0.0",
	contact={
		"name": "SAAIS Team",
		"email": "saais@stanley.edu.in",
	},
	license_info={
		"name": "MIT",
	},
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=False,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
	Base.metadata.create_all(bind=engine)
	seed_users()


app.include_router(login.router)
app.include_router(session.router)
app.include_router(qr_router)
app.include_router(attendance.router)
app.include_router(analytics.router)
app.include_router(media.router)
app.include_router(faculty.router)
from app.routers import timetable
app.include_router(timetable.router)

import os
if not os.path.exists("uploads"):
    os.makedirs("uploads")
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/faculty")
def faculty_dashboard():
	return FileResponse("faculty_dashboard.html")

@app.get("/faculty_dashboard.html")
def faculty_dashboard_html():
	return FileResponse("faculty_dashboard.html")


@app.get("/")
def root():
	return {"message": "SAAIS Backend Running"}
 
