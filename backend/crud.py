"""
crud.py

Shared database helper functions used across routers.
Heavier, route-specific logic lives in the routers themselves.
"""

from typing import Optional
from sqlalchemy.orm import Session

import models
from config import settings as cfg
from utils.jwt import hash_password


# -------------------- Users -------------------- #
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_managers(db: Session):
    return (
        db.query(models.User)
        .filter(models.User.role == "manager", models.User.is_active == True)  # noqa: E712
        .order_by(models.User.name)
        .all()
    )


def create_user(db: Session, *, name, email, password, department, role, manager_id=None):
    user = models.User(
        name=name,
        email=email.lower().strip(),
        password_hash=hash_password(password),
        department=department,
        role=role,
        manager_id=manager_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# -------------------- Settings (single row, id=1) -------------------- #
def get_settings(db: Session) -> models.Setting:
    s = db.query(models.Setting).filter(models.Setting.id == 1).first()
    if not s:
        s = models.Setting(
            id=1,
            deadline_time=cfg.DEFAULT_DEADLINE,
            manager_code=cfg.DEFAULT_MANAGER_CODE,
            company_name="Acme Corp",
            email_enabled=cfg.EMAIL_ENABLED,
            work_day_start=cfg.WORK_DAY_START,
            work_day_end=cfg.WORK_DAY_END,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


# -------------------- Notifications -------------------- #
def create_notification(db: Session, *, user_id: int, title: str,
                        message: str = "", type: str = "info",
                        link: Optional[str] = None, commit: bool = True):
    n = models.Notification(
        user_id=user_id, title=title, message=message, type=type, link=link
    )
    db.add(n)
    if commit:
        db.commit()
        db.refresh(n)
    return n


# -------------------- Reports -------------------- #
def get_report(db: Session, report_id: int) -> Optional[models.Report]:
    return db.query(models.Report).filter(models.Report.id == report_id).first()


def get_report_for_date(db: Session, employee_id: int, date: str) -> Optional[models.Report]:
    return (
        db.query(models.Report)
        .filter(models.Report.employee_id == employee_id, models.Report.date == date)
        .first()
    )
