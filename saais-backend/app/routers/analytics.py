from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app import models

router = APIRouter(tags=["analytics"])

@router.get("/dashboard/student/{student_id}")
def get_student_dashboard(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "faculty":
        # Aggregate data for all sessions created by this faculty
        sessions = db.query(models.Session).filter(models.Session.faculty_id == student_id).all()
        session_ids = [s.id for s in sessions]
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id.in_(session_ids)).all()
        
        total = len(records)
        present = len([r for r in records if r.status == "valid"])
        suspicious = len([r for r in records if r.status == "suspicious"])
        rejected = len([r for r in records if r.status == "rejected"])
        percentage = round((present / total) * 100, 1) if total > 0 else 0
        
        last_record = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id.in_(session_ids)).order_by(models.AttendanceRecord.marked_at.desc()).first()
        last_marked_label = last_record.marked_at.strftime("%I:%M %p, %b %d") if last_record else "Never"

        return {
            "student_id": student_id,
            "name": user.name,
            "lastMarkedLabel": last_marked_label,
            "total_classes": total,
            "present": present,
            "suspicious": suspicious,
            "rejected": rejected,
            "attendance_percentage": percentage,
            "below_75": percentage < 75,
            "role": "faculty"
        }

    # Student logic (existing)
    records = (
        db.query(models.AttendanceRecord)
        .filter(models.AttendanceRecord.student_id == student_id)
        .all()
    )
    total = len(records)
    present = len([r for r in records if r.status == "valid"])
    suspicious = len([r for r in records if r.status == "suspicious"])
    rejected = len([r for r in records if r.status == "rejected"])
    percentage = round((present / total) * 100, 1) if total > 0 else 0

    last_record = (
        db.query(models.AttendanceRecord)
        .filter(models.AttendanceRecord.student_id == student_id)
        .order_by(models.AttendanceRecord.marked_at.desc())
        .first()
    )
    last_marked_label = last_record.marked_at.strftime("%I:%M %p, %b %d") if last_record else "Never"

    return {
        "student_id": student_id,
        "name": user.name,
        "lastMarkedLabel": last_marked_label,
        "total_classes": total,
        "present": present,
        "suspicious": suspicious,
        "rejected": rejected,
        "attendance_percentage": percentage,
        "below_75": percentage < 75,
        "role": "student"
    }

@router.get("/alerts/student/{student_id}")
def get_student_alerts(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alerts = (
        db.query(models.Alert)
        .filter(models.Alert.user_id == student_id, models.Alert.is_read == False)
        .all()
    )
    return [
        {
            "id": a.id,
            "type": "warning" if a.alert_type == "low_attendance" else a.alert_type,
            "title": "Low Attendance" if a.alert_type == "low_attendance" else "Notification",
            "message": a.message,
            "timestamp": a.created_at.isoformat(),
            "read": a.is_read,
        }
        for a in alerts
    ]

@router.post("/alerts/read")
def mark_alert_read(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alert_id = payload.get("id")
    if alert_id:
        alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
        if alert:
            alert.is_read = True
            db.commit()
    return {"ok": True, "message": "Alert marked as read"}

@router.get("/alerts/faculty/{faculty_id}")
def get_faculty_alerts(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alerts = (
        db.query(models.Alert)
        .filter(models.Alert.user_id == faculty_id, models.Alert.is_read == False)
        .all()
    )
    return [
        {
            "id": a.id,
            "type": "warning" if a.alert_type == "device_change" else "error" if a.alert_type in ("suspicious_attendance", "risk_score_increase") else a.alert_type,
            "title": "Multiple Device Changes" if a.alert_type == "device_change" else "Risk Score Increased" if a.alert_type == "risk_score_increase" else "Suspicious Attendance" if a.alert_type == "suspicious_attendance" else "Security Alert",
            "message": a.message,
            "timestamp": a.created_at.isoformat(),
            "read": a.is_read,
        }
        for a in alerts
    ]

@router.get("/dashboard/faculty/{faculty_id}")
def get_faculty_dashboard(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sessions = db.query(models.Session).filter(
        models.Session.faculty_id == faculty_id
    ).all()
    result = []
    for s in sessions:
        records = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.session_id == s.id
        ).all()
        result.append({
            "session_id": s.id,
            "subject": s.subject,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "is_active": s.is_active,
            "total": len(records),
            "present": len([r for r in records if r.status == "valid"]),
            "suspicious": len([r for r in records if r.status == "suspicious"]),
            "rejected": len([r for r in records if r.status == "rejected"]),
        })
    return result

@router.get("/dashboard/session/{session_id}/live")
def get_live_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.session_id == session_id
    ).all()
    suspicious = [r for r in records if r.status == "suspicious"]
    return {
        "session_id": session_id,
        "total_submitted": len(records),
        "present": len([r for r in records if r.status == "valid"]),
        "suspicious": len(suspicious),
        "rejected": len([r for r in records if r.status == "rejected"]),
        "suspicious_list": [
            {
                "student_id": r.student_id,
                "confidence_score": r.confidence_score,
                "marked_at": r.marked_at,
            }
            for r in suspicious
        ],
    }

@router.get("/analytics/session/{session_id}")
def get_session_analytics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.session_id == session_id
    ).all()
    return [
        {
            "record_id": r.id,
            "student_id": r.student_id,
            "status": r.status,
            "confidence_score": r.confidence_score,
            "marked_at": r.marked_at,
            "gps_lat": r.gps_lat,
            "gps_lon": r.gps_lon,
            "wifi_ssid": r.wifi_ssid,
            "device_id": r.device_id,
        }
        for r in records
    ]

@router.get("/analytics/student/{student_id}")
def get_student_analytics(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "faculty":
        sessions = db.query(models.Session).filter(models.Session.faculty_id == student_id).all()
        session_ids = [s.id for s in sessions]
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id.in_(session_ids)).all()
    else:
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student_id).all()

    total = len(records)
    present = len([r for r in records if r.status == "valid"])
    return {
        "student_id": student_id,
        "total": total,
        "present": present,
        "suspicious": len([r for r in records if r.status == "suspicious"]),
        "rejected": len([r for r in records if r.status == "rejected"]),
        "attendance_percentage": round((present/total)*100, 1) if total > 0 else 0,
        "below_75": (present/total)*100 < 75 if total > 0 else True,
        "records": [
            {
                "record_id": r.id,
                "session_id": r.session_id,
                "subject": db.query(models.Session).filter(models.Session.id == r.session_id).first().subject if db.query(models.Session).filter(models.Session.id == r.session_id).first() else "Unknown",
                "status": r.status,
                "confidence_score": r.confidence_score,
                "marked_at": r.marked_at,
            }
            for r in records
        ]
    }
