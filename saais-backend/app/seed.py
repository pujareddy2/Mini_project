from app.database import SessionLocal
from app import models
from app.auth import hash_password


def seed_users():
    db = SessionLocal()
    try:
        # --- Faculty ---
        faculty = db.query(models.User).filter(
            models.User.email == "faculty@test.com"
        ).first()

        if not faculty:
            faculty = models.User(
                name="Test Faculty",
                email="faculty@test.com",
                password_hash=hash_password("faculty123"),
                role="faculty",
            )
            db.add(faculty)
            print("[seed] Faculty user created: faculty@test.com / faculty123")
        else:
            print("[seed] Faculty user already exists — skipping.")

        # --- Student ---
        student = db.query(models.User).filter(
            models.User.email == "test@test.com"
        ).first()

        if not student:
            student = models.User(
                name="Test Student",
                email="test@test.com",
                password_hash=hash_password("test123"),
                role="student",
            )
            db.add(student)
            print("[seed] Student user created: test@test.com / test123")
        else:
            print("[seed] Student user already exists — skipping.")

        # --- Timetable ---
        timetable_count = db.query(models.Timetable).count()
        if timetable_count == 0:
            mock_timetable = [
                {"day_of_week": "Monday", "start_time": "09:00", "subject": "Cloud Computing", "class_name": "Section A"},
                {"day_of_week": "Monday", "start_time": "10:00", "subject": "Compiler Design", "class_name": "CS-1"},
                {"day_of_week": "Monday", "start_time": "11:15", "subject": "DBMS", "class_name": "Lab 2"},
                {"day_of_week": "Monday", "start_time": "12:15", "subject": "Lunch Break", "class_name": "—"},
                {"day_of_week": "Monday", "start_time": "01:15", "subject": "Computer Networks", "class_name": "Section B"},
                
                {"day_of_week": "Tuesday", "start_time": "09:00", "subject": "DBMS", "class_name": "Lab 2"},
                {"day_of_week": "Tuesday", "start_time": "10:00", "subject": "Cloud Computing", "class_name": "Section A"},
                {"day_of_week": "Tuesday", "start_time": "11:15", "subject": "Compiler Design", "class_name": "CS-1"},
                {"day_of_week": "Tuesday", "start_time": "12:15", "subject": "Lunch Break", "class_name": "—"},
                {"day_of_week": "Tuesday", "start_time": "01:15", "subject": "Computer Networks", "class_name": "Section B"},
                
                {"day_of_week": "Wednesday", "start_time": "09:00", "subject": "Computer Networks", "class_name": "Section B"},
                {"day_of_week": "Wednesday", "start_time": "10:00", "subject": "DBMS", "class_name": "Lab 2"},
                {"day_of_week": "Wednesday", "start_time": "11:15", "subject": "Cloud Computing", "class_name": "Section A"},
                {"day_of_week": "Wednesday", "start_time": "12:15", "subject": "Lunch Break", "class_name": "—"},
                {"day_of_week": "Wednesday", "start_time": "01:15", "subject": "Compiler Design", "class_name": "CS-1"},
                
                {"day_of_week": "Thursday", "start_time": "09:00", "subject": "Compiler Design", "class_name": "CS-1"},
                {"day_of_week": "Thursday", "start_time": "10:00", "subject": "Computer Networks", "class_name": "Section B"},
                {"day_of_week": "Thursday", "start_time": "11:15", "subject": "DBMS", "class_name": "Lab 2"},
                {"day_of_week": "Thursday", "start_time": "12:15", "subject": "Lunch Break", "class_name": "—"},
                {"day_of_week": "Thursday", "start_time": "01:15", "subject": "Cloud Computing", "class_name": "Section A"},
                
                {"day_of_week": "Friday", "start_time": "09:00", "subject": "DBMS", "class_name": "Lab 2"},
                {"day_of_week": "Friday", "start_time": "10:00", "subject": "Compiler Design", "class_name": "CS-1"},
                {"day_of_week": "Friday", "start_time": "11:15", "subject": "Computer Networks", "class_name": "Section B"},
                {"day_of_week": "Friday", "start_time": "12:15", "subject": "Lunch Break", "class_name": "—"},
                {"day_of_week": "Friday", "start_time": "01:15", "subject": "Cloud Computing", "class_name": "Section A"},
            ]
            for item in mock_timetable:
                db_item = models.Timetable(**item)
                db.add(db_item)
            print("[seed] Timetable seeded.")
        else:
            print("[seed] Timetable already exists — skipping.")

        db.commit()
        print("[seed] Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR during seeding: {e}")
    finally:
        db.close()
