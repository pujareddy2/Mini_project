import os
from sqlalchemy import text
from app.database import engine

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR;"))
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
