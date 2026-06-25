import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Ensure we're in the right directory and have path setup
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 1. Connect to default postgres DB to create the minproject db
default_url = "postgresql://postgres:puja%40555@localhost:5555/postgres"
engine = create_engine(default_url)

try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("CREATE DATABASE minproject"))
    print("Database 'minproject' created successfully.")
except Exception as e:
    print(f"Info: {e} (Database might already exist)")

# 2. Now use the app's database engine (which connects to minproject via updated .env) to create tables
from app.database import engine as app_engine, Base
import app.models  # importing models to ensure they are registered with Base

try:
    Base.metadata.create_all(bind=app_engine)
    print("All tables created successfully.")
except Exception as e:
    print(f"Error creating tables: {e}")
