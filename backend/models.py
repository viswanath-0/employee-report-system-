"""
models.py

SQLAlchemy ORM models for the Employee Report System.

Tables:
    users            employees, managers and admins (single table w/ role column)
    reports          one daily report per employee per date
    tasks            individual time-blocked tasks belonging to a report
    task_files       file attachments for a task
    leave_requests   a leave application attached to a report
    escalations      escalation messages raised by an employee
    notifications    in-app notifications (bell icon)
    settings         single-row global admin settings
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
)
from sqlalchemy.orm import relationship

from database import Base


# Status constants (kept as plain strings for easy migration/extension)
REPORT_STATUSES = ("pending", "approved", "unapproved", "escalated", "leave")
LEAVE_STATUSES = ("pending", "approved", "rejected")
ESCALATION_STATUSES = ("sent", "resolved")
USER_ROLES = ("employee", "manager", "admin")


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(120), nullable=False)
    email         = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)   # null until the account is claimed
    department    = Column(String(80), nullable=True)
    role          = Column(String(20), default="employee", nullable=False)
    manager_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.now, nullable=False)

    # ---- Company-ID provisioning (Phase 2; columns created by migration 001) ----
    company_id     = Column(String(40), unique=True, nullable=True, index=True)  # the login ID
    personal_email = Column(String(160), nullable=True)
    account_status = Column(String(30), default="active", nullable=False)  # unclaimed|active|password_reset_required

    # self-referential manager relationship
    manager   = relationship("User", remote_side=[id], backref="team_members")
    reports   = relationship("Report", back_populates="employee",
                             cascade="all, delete-orphan", foreign_keys="Report.employee_id")
    notifications = relationship("Notification", back_populates="user",
                                 cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    employee_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                nullable=False, index=True)
    date               = Column(String(10), nullable=False, index=True)   # YYYY-MM-DD (stored ISO)
    status             = Column(String(20), default="pending", nullable=False, index=True)
    deadline           = Column(String(5), default="20:00", nullable=False)  # HH:MM
    is_late            = Column(Boolean, default=False, nullable=False)
    correction_message = Column(Text, nullable=True)
    clarification_response = Column(Text, nullable=True)   # employee's explanation on resubmit
    proof_files            = Column(Text, nullable=True)   # JSON list of proof attachments
    locked                 = Column(Boolean, default=False, nullable=False)  # final-unapprove lock
    created_at         = Column(DateTime, default=datetime.now, nullable=False)
    updated_at         = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee     = relationship("User", back_populates="reports", foreign_keys=[employee_id])
    tasks        = relationship("Task", back_populates="report", cascade="all, delete-orphan")
    leave        = relationship("LeaveRequest", back_populates="report",
                                uselist=False, cascade="all, delete-orphan")
    escalations  = relationship("Escalation", back_populates="report",
                                cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    report_id   = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    title       = Column(String(200), nullable=False)
    description = Column(Text, default="")
    start_time  = Column(String(5), nullable=False)   # HH:MM (24h)
    end_time    = Column(String(5), nullable=False)   # HH:MM (24h)
    color       = Column(String(20), default="indigo")
    created_at  = Column(DateTime, default=datetime.now, nullable=False)

    report = relationship("Report", back_populates="tasks")
    files  = relationship("TaskFile", back_populates="task", cascade="all, delete-orphan")


class TaskFile(Base):
    __tablename__ = "task_files"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    task_id     = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    file_name   = Column(String(255), nullable=False)
    file_path   = Column(String(500), nullable=False)
    file_size   = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.now, nullable=False)

    task = relationship("Task", back_populates="files")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    report_id  = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    leave_type = Column(String(30), default="Casual")  # Sick / Casual / Emergency / Other
    reason     = Column(Text, nullable=False)
    file_path  = Column(String(500), nullable=True)
    file_name  = Column(String(255), nullable=True)
    status     = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    report = relationship("Report", back_populates="leave")


class Escalation(Base):
    __tablename__ = "escalations"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    message   = Column(Text, nullable=False)
    status    = Column(String(20), default="sent", nullable=False)
    sent_at   = Column(DateTime, default=datetime.now, nullable=False)

    report = relationship("Report", back_populates="escalations")


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    type       = Column(String(40), default="info")   # info/success/warning/clarification/...
    title      = Column(String(200), nullable=False)
    message    = Column(Text, default="")
    link       = Column(String(255), nullable=True)    # frontend route to open on click
    is_read    = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("User", back_populates="notifications")


class Setting(Base):
    """Single-row table (id=1) holding global admin-configurable settings."""
    __tablename__ = "settings"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    deadline_time  = Column(String(5), default="20:00")   # HH:MM
    company_name   = Column(String(120), default="Acme Corp")
    logo_path      = Column(String(500), nullable=True)
    email_enabled  = Column(Boolean, default=True)
    work_day_start = Column(String(5), default="09:00")
    work_day_end   = Column(String(5), default="21:00")
    updated_at     = Column(DateTime, default=datetime.now, onupdate=datetime.now)
