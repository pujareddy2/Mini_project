import os
import sys
from datetime import datetime

# Ensure we're in the right directory and have path setup
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User, Session

def seed_db():
    db = SessionLocal()
    try:
        # Check if users exist
        if not db.query(User).first():
            print("Seeding initial users...")
            faculty1 = User(
                name="Prof. John Doe",
                email="john.doe@example.com",
                password_hash="hashed_password_123",
                role="faculty",
                device_id="device_fac_01"
            )
            student1 = User(
                name="Alice Smith",
                email="alice@example.com",
                password_hash="hashed_password_456",
                role="student",
                device_id="device_stu_01"
            )
            db.add(faculty1)
            db.add(student1)
            db.commit()
            
            # Setup relationship
            student1.faculty_of.append(faculty1)
            db.commit()
            
            # Create a mock session
            new_session = Session(
                faculty_id=faculty1.id,
                subject="Computer Science 101",
                qr_token="sample-qr-token-123",
                start_time=datetime.utcnow(),
                classroom_lat=12.9716,
                classroom_lon=77.5946,
                room_name="Room A",
                wifi_ssid="Campus_WiFi",
                is_active=True
            )
            db.add(new_session)
            db.commit()
            print("Sample data seeded successfully!")
        else:
            print("Database already contains users. Skipping seed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
