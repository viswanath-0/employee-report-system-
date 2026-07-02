"""
routers/notifications.py

In-app notification bell — available to every authenticated user.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from utils.jwt import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[schemas.NotificationOut])
def my_notifications(
    limit: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/unread-count", response_model=dict)
def unread_count(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    count = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id,
                models.Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {"count": count}


@router.put("/{notif_id}/read", response_model=dict)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.id == notif_id,
                models.Notification.user_id == user.id)
        .first()
    )
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}


@router.put("/read-all", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id,
                models.Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return {"ok": True}
