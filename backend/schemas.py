"""
schemas.py

Pydantic v2 request/response models (the API contract).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict, computed_field


# ==================== Users / Auth ==================== #
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    department: Optional[str] = None
    role: str
    manager_id: Optional[int] = None
    is_active: bool = True
    company_id: Optional[str] = None
    account_status: str = "active"
    created_at: datetime


class ManagerOption(BaseModel):
    """Public manager info used to populate the employee registration dropdown."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    department: Optional[str] = None


class LoginRequest(BaseModel):
    # Accepts a Company ID (new provisioned users) or an email (existing users).
    login_id: Optional[str] = None
    email: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


# ---------- Provisioning / activation (Phase 2) ---------- #
class AdminCreateUserIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    department_code: str
    joining_date: str = Field(description="ISO date YYYY-MM-DD")
    role: Literal["employee", "manager"]
    personal_email: EmailStr
    manager_id: Optional[int] = None   # optional: assign a new employee to a manager


class AdminCreateUserOut(BaseModel):
    company_id: str
    full_name: str
    department: str
    role: str
    personal_email: EmailStr
    temp_password: str      # returned to the admin so they always have it
    email_sent: bool


class ActivateIn(BaseModel):
    company_id: str
    personal_email: EmailStr


class ActivateOut(BaseModel):
    ok: bool
    message: str
    admin_contact: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=1, max_length=128)


# ==================== Files ==================== #
class UploadResponse(BaseModel):
    file_name: str
    file_path: str
    file_size: int
    url: str


class TaskFileIn(BaseModel):
    file_name: str
    file_path: str
    file_size: int = 0


class TaskFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    file_name: str
    file_path: str
    file_size: int
    uploaded_at: datetime


# ==================== Tasks ==================== #
class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    start_time: str = Field(description="HH:MM 24h")
    end_time: str = Field(description="HH:MM 24h")
    color: str = "indigo"
    files: List[TaskFileIn] = []


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    start_time: str
    end_time: str
    color: str
    files: List[TaskFileOut] = []


# ==================== Leave ==================== #
class LeaveIn(BaseModel):
    leave_type: str = "Casual"     # Sick / Casual / Emergency / Other
    reason: str = Field(min_length=1)
    file_path: Optional[str] = None
    file_name: Optional[str] = None


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    leave_type: str
    reason: str
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    status: str
    created_at: datetime


# ==================== Reports ==================== #
class ReportEmployee(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    department: Optional[str] = None


class ReportSubmitIn(BaseModel):
    date: str = Field(description="ISO date YYYY-MM-DD")
    is_leave: bool = False
    tasks: List[TaskIn] = []
    leave: Optional[LeaveIn] = None


class ReportResubmitIn(BaseModel):
    is_leave: bool = False
    tasks: List[TaskIn] = []
    leave: Optional[LeaveIn] = None
    note: Optional[str] = None    # employee's explanation on resubmission


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: str
    status: str
    deadline: str
    is_late: bool
    correction_message: Optional[str] = None
    created_at: datetime
    tasks: List[TaskOut] = []
    leave: Optional[LeaveOut] = None
    employee: Optional[ReportEmployee] = None

    @computed_field
    @property
    def tasks_count(self) -> int:
        return len(self.tasks)


# ==================== Escalations ==================== #
class EscalationIn(BaseModel):
    report_id: int
    message: str = Field(min_length=1)


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_id: int
    message: str
    status: str
    sent_at: datetime


class EscalationDetailOut(BaseModel):
    id: int
    report_id: int
    message: str
    status: str
    sent_at: datetime
    employee_id: int
    employee_name: str
    report_date: str


# ==================== Manager actions ==================== #
class ClarificationIn(BaseModel):
    message: str = Field(min_length=1, description="Correction required from the employee")


class UnapproveIn(BaseModel):
    message: Optional[str] = None


# ==================== Notifications ==================== #
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime


# ==================== Admin: settings ==================== #
class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    deadline_time: str
    company_name: str
    logo_path: Optional[str] = None
    email_enabled: bool
    work_day_start: str
    work_day_end: str


class SettingsUpdate(BaseModel):
    deadline_time: Optional[str] = None
    company_name: Optional[str] = None
    logo_path: Optional[str] = None
    email_enabled: Optional[bool] = None
    work_day_start: Optional[str] = None
    work_day_end: Optional[str] = None


# Public (unauthenticated) config surfaced to the login/register pages
class PublicConfig(BaseModel):
    company_name: str
    work_day_start: str
    work_day_end: str
    deadline_time: str
    admin_contact_email: str = ""
    department_catalog: list[dict] = []
