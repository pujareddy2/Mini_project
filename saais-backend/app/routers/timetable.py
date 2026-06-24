from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/timetable", tags=["timetable"])

@router.get("/{day_of_week}", response_model=List[schemas.TimetableResponse])
def get_timetable_by_day(day_of_week: str, db: Session = Depends(get_db)):
    timetable_items = db.query(models.Timetable).filter(
        models.Timetable.day_of_week.ilike(day_of_week)
    ).order_by(models.Timetable.start_time).all()
    
    return timetable_items

@router.get("/", response_model=List[schemas.TimetableResponse])
def get_all_timetable(db: Session = Depends(get_db)):
    timetable_items = db.query(models.Timetable).order_by(
        models.Timetable.day_of_week, models.Timetable.start_time
    ).all()
    
    return timetable_items

@router.post("/", response_model=schemas.TimetableResponse)
def create_timetable_entry(entry: schemas.TimetableCreate, db: Session = Depends(get_db)):
    db_entry = models.Timetable(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry
