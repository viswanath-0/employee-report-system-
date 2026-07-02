"""
models.py

SQLAlchemy ORM Models.
Defines 2 tables: users, reports
"""

from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ======================== USERS TABLE ======================== #

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    email      = Column(String(100), unique=True, nullable=False)
    name       = Column(String(100), nullable=False)
    password   = Column(String(100), nullable=False)
    department = Column(String(50),  nullable=True)
    role       = Column(Enum("employee", "manager", "admin"), default="employee", nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # One user → many reports
    reports = relationship("Report", back_populates="employee", cascade="all, delete-orphan")


# ======================== REPORTS TABLE ======================== #

class Report(Base):
    __tablename__ = "reports"

    id             = Column(Integer,     primary_key=True, autoincrement=True)
    employee_email = Column(String(100), ForeignKey("users.email", ondelete="CASCADE"), nullable=False)
    date           = Column(String(12),  nullable=False)    # Format: DD-MM-YYYY
    morning        = Column(Text, default="")
    afternoon      = Column(Text, default="")
    evening        = Column(Text, default="")
    status         = Column(Enum("Pending", "Approved", "Unapproved"), default="Pending")
    correction     = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.now)

    # Many reports → one user
    employee = relationship("User", back_populates="reports")
