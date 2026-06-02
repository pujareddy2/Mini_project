from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth import get_current_user
from app import models

router = APIRouter(tags=["faculty"])

# Register a student to a faculty
@router.post("/faculty/{faculty_id}/students")
def add_student_to_faculty(
    faculty_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Only the faculty themselves (or an admin) may add
    if current_user.id != faculty_id or current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")

    student_id = payload.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")

    student = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    faculty = db.query(models.User).filter(models.User.id == faculty_id, models.User.role == "faculty").first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Avoid duplication
    if student in faculty.faculty_of:
        return {"ok": True, "message": "Student already registered"}

    faculty.faculty_of.append(student)
    db.commit()
    return {"ok": True, "message": "Student registered to faculty"}

# Get list of students for a faculty with latest attendance summary
@router.get("/faculty/{faculty_id}/students")
def get_faculty_students(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != faculty_id or current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")

    faculty = (
        db.query(models.User)
        .options(joinedload(models.User.faculty_of))
        .filter(models.User.id == faculty_id)
        .first()
    )
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    result = []
    for stu in faculty.faculty_of:
        latest = (
            db.query(models.AttendanceRecord)
            .filter(models.AttendanceRecord.student_id == stu.id)
            .order_by(models.AttendanceRecord.marked_at.desc())
            .first()
        )
        total_present = (
            db.query(models.AttendanceRecord)
            .filter(models.AttendanceRecord.student_id == stu.id, models.AttendanceRecord.status == "valid")
            .count()
        )
        total_records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == stu.id).count()
        result.append(
            {
                "student_id": stu.id,
                "name": stu.name,
                "latest_status": latest.status if latest else None,
                "latest_marked_at": latest.marked_at.isoformat() if latest else None,
                "total_present": total_present,
                "total_records": total_records,
            }
        )
    return result
