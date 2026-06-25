"""
Run this once to drop all tables and recreate them with the updated schema.
All existing user accounts will be removed — re-register after running this.

Usage:
    cd saais-backend
    venv\Scripts\python reset_db.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base
import app.models  # noqa: F401 — ensures all models are registered before create_all

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Recreating tables with updated schema...")
Base.metadata.create_all(bind=engine)
print("Done. You can now re-register accounts with the new flow.")
