import os
from sqlalchemy.orm import Session
from app.database import engine
from app import models

def delete_specific_users():
    user_ids_to_delete = [6, 7, 8, 9, 10]
    
    with Session(engine) as session:
        # Delete dependent records first to avoid foreign key constraint errors
        print("Deleting dependent records...")
        
        # 1. Media Records
        session.query(models.MediaRecord).filter(models.MediaRecord.student_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 2. Alerts
        session.query(models.Alert).filter(models.Alert.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 3. Student References
        session.query(models.StudentReference).filter(models.StudentReference.student_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 4. Device Bindings
        session.query(models.DeviceBinding).filter(models.DeviceBinding.student_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 5. Validation Logs (depend on AttendanceRecord)
        attendance_records = session.query(models.AttendanceRecord.id).filter(models.AttendanceRecord.student_id.in_(user_ids_to_delete)).all()
        attendance_ids = [r[0] for r in attendance_records]
        if attendance_ids:
            session.query(models.ValidationLog).filter(models.ValidationLog.record_id.in_(attendance_ids)).delete(synchronize_session=False)
        
        # 6. Attendance Records
        session.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 7. Sessions (if any of them was a faculty)
        session.query(models.Session).filter(models.Session.faculty_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        # 8. faculty_students (many-to-many) - need raw SQL or delete via association table
        session.execute(
            models.faculty_students.delete().where(
                (models.faculty_students.c.faculty_id.in_(user_ids_to_delete)) |
                (models.faculty_students.c.student_id.in_(user_ids_to_delete))
            )
        )
        
        # Finally delete the users
        print(f"Deleting users {user_ids_to_delete}...")
        deleted_count = session.query(models.User).filter(models.User.id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        
        session.commit()
        print(f"Deleted {deleted_count} users successfully.")

if __name__ == "__main__":
    delete_specific_users()
