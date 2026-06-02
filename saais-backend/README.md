# 🎯 SAAIS Backend — Smart Adaptive Attendance Intelligence System

> The backend engine that decides whether attendance is **valid**, **suspicious**, or **rejected** using multi-factor verification.

Built with **FastAPI + SQLAlchemy + SQLite** — receives data from the student app, validates it through 5 independent checks, and returns a confidence-scored attendance result.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Prerequisites](#4-prerequisites)
5. [Setup and Installation](#5-setup-and-installation)
6. [Running the Server](#6-running-the-server)
7. [API Endpoints](#7-api-endpoints)
8. [Multi-Factor Validation Pipeline](#8-multi-factor-validation-pipeline)
9. [Confidence Scoring](#9-confidence-scoring)
10. [Database Schema](#10-database-schema)
11. [Project Structure](#11-project-structure)
12. [Testing](#12-testing)
13. [Faculty Dashboard](#13-faculty-dashboard)
14. [Environment Variables](#14-environment-variables)
15. [Security Features](#15-security-features)

---

## 1) Overview

SAAIS is a backend system designed to combat fraudulent attendance marking in educational institutions. Instead of relying on a single check, it uses a **multi-signal validation pipeline** that cross-checks five independent factors:

| Factor | What It Checks |
|---|---|
| **Dynamic QR Code** | Cryptographically signed token, refreshes every 10 seconds |
| **GPS Geofencing** | Student is within 50 meters of the classroom (Haversine formula) |
| **WiFi Fingerprint** | Student's WiFi SSID matches the classroom access point |
| **Device Binding** | Student is using their registered device (prevents phone sharing) |
| **Context Capture** | Student uploaded a photo as proof of physical presence |

Each factor contributes points to a **confidence score (0–100)**, and attendance is classified as:
- ✅ **Valid** (score ≥ 95 with all primary checks passed)
- ⚠️ **Suspicious** (score 60–94)
- ❌ **Rejected** (score < 60)

---

## 2) Architecture

```
┌──────────────────┐       ┌──────────────────────────────────────────┐
│   Student App    │       │          SAAIS Backend (FastAPI)         │
│  (Mobile/Web)    │       │                                         │
│                  │  HTTP │  ┌─────────┐   ┌────────────────────┐   │
│  Scan QR Code ───┼──────►│  │  Routes  │──►│   Validation       │   │
│  Send GPS coords │       │  │  (Auth,  │   │   Pipeline         │   │
│  Send WiFi SSID  │       │  │ Session, │   │  (QR → GPS → WiFi  │   │
│  Send device ID  │       │  │Attendance│   │   → Device → Media)│   │
│  Upload photo    │       │  │Analytics)│   └────────┬───────────┘   │
│                  │       │  └─────────┘            │               │
│  ◄── Result ─────┼───────│                         ▼               │
│  (valid/suspect/ │       │              ┌──────────────────┐       │
│   rejected)      │       │              │   SQLite Database │       │
└──────────────────┘       │              │   (saais.db)      │       │
                           │              └──────────────────┘       │
┌──────────────────┐       │                                         │
│ Faculty Dashboard│  HTTP │  ┌─────────────────────────────────┐   │
│  (Web Browser)   │──────►│  │  Analytics & Live Monitoring    │   │
│  Start Session   │       │  │  APIs                           │   │
│  View QR Code    │       │  └─────────────────────────────────┘   │
│  Monitor Live    │       │                                         │
└──────────────────┘       └──────────────────────────────────────────┘
```

---

## 3) Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Programming language |
| FastAPI | latest | Async web framework for REST APIs |
| SQLAlchemy | latest | ORM for database modeling |
| SQLite | built-in | Lightweight relational database |
| Pydantic | latest | Request/response data validation |
| python-jose | latest | JWT token creation and verification |
| passlib + bcrypt | latest | Secure password hashing |
| qrcode + Pillow | latest | QR code image generation |
| python-dotenv | latest | Environment variable management |
| Uvicorn | latest | ASGI server |
| Jinja2 | latest | HTML template rendering |

---

## 4) Prerequisites

| Requirement | Details |
|---|---|
| **Python** | 3.10 or higher |
| **pip** | Python package manager (comes with Python) |

Check your Python version:

```bash
python --version
pip --version
```

---

## 5) Setup and Installation

### Step 1: Navigate to the backend folder

```bash
cd saais-backend
```

### Step 2: Create a virtual environment

```bash
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS/Linux
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure environment

Create a `.env` file (or verify the existing one):

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./saais.db
```

### Step 5: Database initialization

The database is **automatically created** on first run. Two default users are seeded:

| Role | Email | Password |
|---|---|---|
| Faculty | `faculty@test.com` | `faculty123` |
| Student | `test@test.com` | `test123` |

---

## 6) Running the Server

### Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Access points

| URL | Description |
|---|---|
| `http://localhost:8080` | API root (health check) |
| `http://localhost:8080/docs` | Swagger API documentation (interactive) |
| `http://localhost:8080/redoc` | ReDoc API documentation |
| `http://localhost:8080/faculty` | Faculty dashboard (web UI) |

---

## 7) API Endpoints

### 🔐 Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user (student/faculty) | No |
| `POST` | `/auth/login` | OAuth2 form login (with brute-force lockout) | No |
| `POST` | `/auth/student/login` | JSON login — returns JWT + user info | No |

### 📅 Session Management (`/session`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/session/start` | Faculty creates attendance session | Faculty only |
| `POST` | `/session/end/{session_id}` | Faculty ends session (returns summary) | Faculty only |
| `POST` | `/session/validate-qr` | Validate a QR token | Yes |
| `GET` | `/session/qr/{session_id}` | Refresh and get new QR token | Faculty only |
| `GET` | `/session/qr-image/{session_id}` | Get QR code as PNG image | Yes |
| `GET` | `/session/active` | List all active sessions | Faculty only |

### ✅ Attendance (`/attendance`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/attendance/submit` | Submit attendance (runs full validation pipeline) | Yes |

### 📊 Analytics and Dashboard

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/dashboard/student/{id}` | Student attendance overview | Yes |
| `GET` | `/dashboard/faculty/{id}` | Faculty dashboard with session stats | Yes |
| `GET` | `/dashboard/session/{id}/live` | Live session monitoring (real-time) | Yes |
| `GET` | `/analytics/session/{id}` | Detailed attendance records per session | Yes |
| `GET` | `/analytics/student/{id}` | Detailed student attendance history | Yes |
| `GET` | `/alerts/student/{id}` | Suspicious/rejected attendance alerts | Yes |
| `POST` | `/alerts/read` | Mark alert as read | Yes |

### 📁 Media (`/media`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/media/upload` | Upload context-capture photo | Yes |

### 👥 Faculty Management

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/faculty/{id}/students` | Register student to faculty's list | Faculty only |
| `GET` | `/faculty/{id}/students` | Get faculty's students with summary | Faculty only |

**Total: 23 API endpoints**

---

## 8) Multi-Factor Validation Pipeline

When `POST /attendance/submit` is called, the backend runs these checks in order:

```
Student submits attendance
       │
       ▼
┌─────────────────────┐
│ 1. Duplicate Check  │──► Already submitted for this session? → HTTP 400
└────────┬────────────┘
         │ (first time)
         ▼
┌─────────────────────┐
│ 2. QR Token Check   │──► Is token valid? Signature matches? Not expired?
│                     │    ✅ +25 points
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ 3. GPS Geofence     │──► Is student within 50m of classroom?
│                     │    Haversine distance formula
│                     │    ✅ +20 points
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ 4. WiFi SSID Match  │──► Does WiFi match classroom AP?
│                     │    Case-insensitive comparison
│                     │    ✅ +20 points
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ 5. Media Check      │──► Did student upload a context photo?
│                     │    ✅ +20 points
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ 6. Device Binding   │──► Does device match registered device?
│                     │    Auto-binds on first use
│                     │    ✅ +15 points
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ 7. Score & Classify │──► Sum all points → determine status
│                     │    Store record + validation log
└────────┬────────────┘
         ▼
    Return result
```

---

## 9) Confidence Scoring

### Points Breakdown

| Factor | Points | How It's Validated |
|---|---|---|
| QR Token | **25** | HMAC-SHA256 signature + expiry check |
| GPS Location | **20** | Haversine distance ≤ 50 meters |
| WiFi SSID | **20** | Case-insensitive string match |
| Context Capture | **20** | Media URL exists (photo uploaded) |
| Device Binding | **15** | Device ID matches registered device |
| **Maximum** | **100** | |

### Status Thresholds

| Score | Status | Meaning |
|---|---|---|
| ≥ 95 (all primary checks pass) | ✅ `valid` | Attendance confirmed |
| 60 – 94 | ⚠️ `suspicious` | Recorded but flagged for review |
| < 60 | ❌ `rejected` | Attendance denied |

### Example API Response

```json
{
  "status": "valid",
  "confidence_score": 95,
  "flags": {
    "qr": true,
    "location": true,
    "wifi": true,
    "media": true,
    "device": true
  },
  "attendanceId": "ATT-42",
  "message": "Attendance marked successfully",
  "distance": 18.5,
  "room_name": "Room 301"
}
```

---

## 10) Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | All users (students and faculty) with role-based access |
| `sessions` | Faculty-created attendance sessions with QR tokens and classroom metadata |
| `attendance_records` | Individual submissions with all validation flags and scores |
| `validation_logs` | Audit trail — reasons, risk flags, and details for every decision |
| `device_bindings` | Maps each student to their registered device |
| `faculty_students` | Many-to-many link between faculty and tracked students |

### Entity Relationships

```
users (1) ──────── (N) sessions              (faculty creates sessions)
users (1) ──────── (N) attendance_records     (student submits attendance)
users (1) ──────── (1) device_bindings        (one device per student)
sessions (1) ───── (N) attendance_records     (session has many records)
attendance_records (1) ── (N) validation_logs (each record has audit logs)
users (N) ──────── (N) users                  (faculty ↔ students via faculty_students)
```

---

## 11) Project Structure

```
saais-backend/
├── app/
│   ├── __init__.py              # Package marker
│   ├── main.py                  # FastAPI app — CORS, routers, startup
│   ├── database.py              # SQLAlchemy engine, session factory
│   ├── models.py                # ORM models (User, Session, AttendanceRecord, etc.)
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── auth.py                  # JWT auth, password hashing, OAuth2
│   ├── seed.py                  # Seeds default faculty/student on startup
│   └── routers/
│       ├── __init__.py
│       ├── login.py             # /auth — register, login, student login
│       ├── session.py           # /session — start, end, QR token, QR image
│       ├── attendance.py        # /attendance — submit (core pipeline)
│       ├── analytics.py         # /dashboard, /analytics, /alerts
│       ├── media.py             # /media — photo upload
│       └── faculty.py           # /faculty — student management
│
├── uploads/                     # Uploaded context-capture photos
├── faculty_dashboard.html       # Web-based faculty dashboard
├── test_all.py                  # Integration test suite (10 scenarios)
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables
└── saais.db                     # SQLite database (auto-created)
```

---

## 12) Testing

The project includes a comprehensive integration test suite with 10 scenarios.

### Run Tests

```bash
# Terminal 1 — Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8081

# Terminal 2 — Run tests
python test_all.py
```

### Test Scenarios

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Valid attendance (all factors correct) | `status=valid`, score ≥ 80 |
| 2 | Wrong/expired QR token | `flags.qr = false` |
| 3 | Wrong GPS location (far from classroom) | `flags.location = false` |
| 4 | Wrong WiFi SSID | `flags.wifi = false` |
| 5 | Missing media/photo upload | `flags.media = false` |
| 6 | Duplicate submission (same student, same session) | HTTP 400 |
| 7 | Invalid JWT token | HTTP 401 |
| 8 | Non-existent session | HTTP 404 |
| 9 | All checks fail simultaneously | `status=rejected`, score < 60 |
| 10 | Faculty analytics dashboard | Returns valid analytics data |

---

## 13) Faculty Dashboard

A web-based dashboard is served at `/faculty` (from `faculty_dashboard.html`).

### Features

- **Login** — Faculty email/password authentication
- **Start Session** — Create session with subject, end time, classroom coordinates, WiFi SSID
- **Live QR Code** — Auto-displayed QR code image for students to scan
- **Real-Time Monitoring** — Live present/suspicious/rejected counts (polls every 10 seconds)
- **Suspicious Alerts** — List of flagged students
- **End Session** — Closes session and shows attendance summary

---

## 14) Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | `supersecretkey123` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./saais.db` |

---

## 15) Security Features

| Feature | Description |
|---|---|
| **JWT Authentication** | All protected endpoints require a valid Bearer token |
| **bcrypt Hashing** | Passwords are never stored in plain text |
| **Brute-Force Lockout** | 5 failed login attempts → 5-minute account lockout |
| **HMAC-Signed QR Tokens** | QR codes are cryptographically signed and cannot be forged |
| **Device Binding** | One registered device per student — prevents phone sharing |
| **Duplicate Prevention** | Students cannot submit attendance twice for the same session |
| **JWT-Extracted Student ID** | Student ID comes from the token, not the request body — prevents ID spoofing |

---

<p align="center">
  Built with ❤️ using FastAPI + SQLAlchemy + SQLite
</p>
