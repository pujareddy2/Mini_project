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

        db.commit()
        print("[seed] Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR during seeding: {e}")
    finally:
        db.close()
