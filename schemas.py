"""
schemas.py

Pydantic Schemas — Request Body Validation.
Used by FastAPI to validate incoming JSON data.
"""

from pydantic import BaseModel
from typing import Optional


# ======================== USER SCHEMAS ======================== #

class EmployeeRegister(BaseModel):
    email:      str
    name:       str
    department: str
    password:   str


class LoginRequest(BaseModel):
    email:    str
    password: str


# ======================== REPORT SCHEMAS ======================== #

class ReportSubmit(BaseModel):
    session: str    # Morning / Afternoon / Evening / Leave
    task:    str    # Task description


class ReportVerify(BaseModel):
    status:     str                 # Approved / Pending / Unapproved
    correction: Optional[str] = None
