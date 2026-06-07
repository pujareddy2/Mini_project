from sqlalchemy.orm import Session
from app import models

def create_alert(db: Session, user_id: int, alert_type: str, message: str):
	# Check if an unread alert of this type already exists for this user
	existing = (
		db.query(models.Alert)
		.filter(
			models.Alert.user_id == user_id,
			models.Alert.alert_type == alert_type,
			models.Alert.is_read == False
		)
		.first()
	)
	if existing:
		return existing
	
	new_alert = models.Alert(
		user_id=user_id,
		alert_type=alert_type,
		message=message
	)
	db.add(new_alert)
	db.commit()
	db.refresh(new_alert)
	return new_alert
