"""
routers/admin.py

Admin-only endpoints (role = admin): company-wide stats, user management,
global settings, and CSV export.
"""

import csv
import io
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from database import get_db
import crud
import models
import schemas
from utils.jwt import get_current_admin, hash_password
from utils.company_id import (
    generate_company_id, generate_temp_password, valid_dept_code, dept_name,
)
from utils.email import email_credentials, is_configured
from utils.emailcheck import email_domain_error

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== Directory provisioning (Phase 2) ==================== #
@router.post("/directory", response_model=schemas.AdminCreateUserOut, status_code=201)
def create_directory_user(
    payload: schemas.AdminCreateUserIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    """Admin-initiated creation (spec 3a): auto-generate the Company ID + a temp
    password, store the row as `password_reset_required`, and email the credentials."""
    if not valid_dept_code(payload.department_code):
        raise HTTPException(400, f"Unknown department code '{payload.department_code}'")
    try:
        joining_year = int(payload.joining_date.split("-")[0])
    except Exception:
        raise HTTPException(400, "joining_date must be an ISO date (YYYY-MM-DD)")

    personal_email = payload.personal_email.lower().strip()
    domain_error = email_domain_error(personal_email)
    if domain_error:
        raise HTTPException(400, domain_error)
    if crud.get_user_by_email(db, personal_email):
        raise HTTPException(400, "A user with this personal email already exists")

    manager_id = None
    if payload.role == "employee" and payload.manager_id:
        mgr = crud.get_user(db, payload.manager_id)
        if not mgr or mgr.role != "manager":
            raise HTTPException(400, "Selected manager is not valid")
        manager_id = mgr.id

    company_id = generate_company_id(db, payload.role, payload.department_code, joining_year)
    department = dept_name(payload.department_code)
    temp = generate_temp_password()

    user = models.User(
        name=payload.full_name.strip(),
        email=personal_email,            # login is by company_id; email kept for records/uniqueness
        personal_email=personal_email,
        company_id=company_id,
        department=department,
        role=payload.role,
        manager_id=manager_id,
        password_hash=hash_password(temp),
        account_status="password_reset_required",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    background.add_task(
        email_credentials, personal_email, user.name, company_id, temp, department, user.role,
    )
    return schemas.AdminCreateUserOut(
        company_id=company_id,
        full_name=user.name,
        department=department,
        role=user.role,
        personal_email=personal_email,
        temp_password=temp,
        email_sent=is_configured(),
    )


# ==================== Email diagnostic ==================== #
@router.get("/email-test", response_model=dict)
def email_test(to: str, _: models.User = Depends(get_current_admin)):
    """Attempt a real SMTP send and return the actual outcome/error (for debugging)."""
    from utils.email import test_send
    return test_send(to)


@router.put("/report/{report_id}/reopen", response_model=dict)
def reopen_report(report_id: int, db: Session = Depends(get_db),
                  _: models.User = Depends(get_current_admin)):
    """Re-open a locked (finally-unapproved) report so its manager can review it again."""
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    report.locked = False
    report.status = "pending"
    report.correction_message = None
    emp = report.employee
    if emp and emp.manager_id:
        crud.create_notification(
            db, user_id=emp.manager_id,
            title="A report was re-opened by admin",
            message=f"{emp.name}'s report for {report.date} is open for review again.",
            type="info", link="/manager/pending", commit=False,
        )
    db.commit()
    return {"ok": True, "status": "pending"}


# ==================== Dashboard stats ==================== #
@router.get("/stats", response_model=dict)
def stats(db: Session = Depends(get_db), _: models.User = Depends(get_current_admin)):
    today = date.today()
    today_iso = today.isoformat()
    month_prefix = today.strftime("%Y-%m")

    total_employees = db.query(models.User).filter(
        models.User.role == "employee", models.User.is_active == True).count()  # noqa: E712
    total_managers = db.query(models.User).filter(models.User.role == "manager").count()
    reports_today = db.query(models.Report).filter(models.Report.date == today_iso).count()
    pending = db.query(models.Report).filter(models.Report.status == "pending").count()
    approved_today = db.query(models.Report).filter(
        models.Report.status == "approved", models.Report.date == today_iso).count()
    unapproved_month = db.query(models.Report).filter(
        models.Report.status == "unapproved",
        models.Report.date.like(f"{month_prefix}-%")).count()

    # --- charts ---
    # reports per day (last 30 days)
    start = today - timedelta(days=29)
    recent = db.query(models.Report).filter(models.Report.date >= start.isoformat()).all()
    per_day = defaultdict(int)
    for r in recent:
        per_day[r.date] += 1
    reports_per_day = [
        {"date": (start + timedelta(days=i)).isoformat(),
         "count": per_day.get((start + timedelta(days=i)).isoformat(), 0)}
        for i in range(30)
    ]

    # status distribution
    dist = defaultdict(int)
    for (st,) in db.query(models.Report.status).all():
        dist[st] += 1
    status_distribution = [{"status": k, "count": v} for k, v in dist.items()]

    # department distribution
    dept = defaultdict(int)
    rows = (
        db.query(models.User.department)
        .join(models.Report, models.Report.employee_id == models.User.id)
        .all()
    )
    for (d,) in rows:
        dept[d or "Unassigned"] += 1
    department_distribution = [{"department": k, "count": v} for k, v in dept.items()]

    return {
        "cards": {
            "total_employees": total_employees,
            "total_managers": total_managers,
            "reports_today": reports_today,
            "pending_company_wide": pending,
            "approved_today": approved_today,
            "unapproved_this_month": unapproved_month,
        },
        "reports_per_day": reports_per_day,
        "status_distribution": status_distribution,
        "department_distribution": department_distribution,
    }


# ==================== Employees ==================== #
@router.get("/employees", response_model=list[dict])
def all_employees(
    search: str | None = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    q = db.query(models.User).filter(models.User.role == "employee")
    if search:
        like = f"%{search}%"
        q = q.filter((models.User.name.like(like)) | (models.User.email.like(like)))
    employees = q.order_by(models.User.name).all()

    out = []
    for e in employees:
        mgr = crud.get_user(db, e.manager_id) if e.manager_id else None
        counts = defaultdict(int)
        for (st,) in db.query(models.Report.status).filter(
                models.Report.employee_id == e.id).all():
            counts[st] += 1
        out.append({
            "id": e.id, "name": e.name, "email": e.email,
            "department": e.department, "is_active": e.is_active,
            "manager_id": e.manager_id, "manager_name": mgr.name if mgr else None,
            "total_reports": sum(counts.values()),
            "status_summary": dict(counts),
        })
    return out


class ReassignIn(BaseModel):
    manager_id: int


@router.put("/employee/{employee_id}/reassign", response_model=dict)
def reassign_manager(employee_id: int, payload: ReassignIn,
                     db: Session = Depends(get_db),
                     _: models.User = Depends(get_current_admin)):
    emp = crud.get_user(db, employee_id)
    if not emp or emp.role != "employee":
        raise HTTPException(404, "Employee not found")
    mgr = crud.get_user(db, payload.manager_id)
    if not mgr or mgr.role != "manager":
        raise HTTPException(400, "Target manager is not valid")
    emp.manager_id = mgr.id
    db.commit()
    return {"ok": True, "manager_id": mgr.id, "manager_name": mgr.name}


@router.delete("/employee/{employee_id}", response_model=dict)
def deactivate_employee(employee_id: int, db: Session = Depends(get_db),
                        _: models.User = Depends(get_current_admin)):
    emp = crud.get_user(db, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    emp.is_active = False
    db.commit()
    return {"ok": True, "message": "Account deactivated"}


# ==================== Managers ==================== #
@router.get("/managers", response_model=list[dict])
def all_managers(db: Session = Depends(get_db), _: models.User = Depends(get_current_admin)):
    managers = db.query(models.User).filter(models.User.role == "manager").order_by(
        models.User.name).all()
    out = []
    for m in managers:
        team_size = db.query(models.User).filter(models.User.manager_id == m.id).count()
        out.append({
            "id": m.id, "name": m.name, "email": m.email,
            "department": m.department, "team_size": team_size,
            "is_active": m.is_active,
        })
    return out


# ==================== Reports (filterable) ==================== #
def _filtered_reports(db, employee_id, manager_id, department, status, date_from, date_to):
    q = db.query(models.Report).join(models.User, models.Report.employee_id == models.User.id)
    if employee_id:
        q = q.filter(models.Report.employee_id == employee_id)
    if manager_id:
        q = q.filter(models.User.manager_id == manager_id)
    if department:
        q = q.filter(models.User.department == department)
    if status == "pending":
        # "Pending" groups everything still awaiting a decision: task reports
        # (pending/escalated) plus not-yet-decided leaves (stored as status "leave").
        q = q.filter(models.Report.status.in_(["pending", "escalated", "leave"]))
    elif status:
        q = q.filter(models.Report.status == status)
    if date_from:
        q = q.filter(models.Report.date >= date_from)
    if date_to:
        q = q.filter(models.Report.date <= date_to)
    return q.order_by(models.Report.date.desc())


@router.get("/reports", response_model=list[schemas.ReportOut])
def all_reports(
    employee_id: int | None = None,
    manager_id: int | None = None,
    department: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return _filtered_reports(db, employee_id, manager_id, department, status,
                             date_from, date_to).limit(limit).all()


@router.get("/export/reports")
def export_reports(
    employee_id: int | None = None,
    manager_id: int | None = None,
    department: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    reports = _filtered_reports(db, employee_id, manager_id, department, status,
                                date_from, date_to).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Report ID", "Employee", "Email", "Department", "Date",
                     "Status", "Late", "Tasks", "Deadline", "Correction"])
    for r in reports:
        emp = r.employee
        writer.writerow([
            r.id, emp.name if emp else "", emp.email if emp else "",
            emp.department if emp else "", r.date, r.status,
            "Yes" if r.is_late else "No", len(r.tasks), r.deadline,
            (r.correction_message or "").replace("\n", " "),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reports_export.csv"},
    )


# ==================== Departments ==================== #
@router.get("/departments", response_model=list[dict])
def departments(db: Session = Depends(get_db), _: models.User = Depends(get_current_admin)):
    counts = defaultdict(lambda: {"employees": 0, "managers": 0})
    for u in db.query(models.User).all():
        d = u.department or "Unassigned"
        if u.role == "employee":
            counts[d]["employees"] += 1
        elif u.role == "manager":
            counts[d]["managers"] += 1
    return [{"name": k, **v} for k, v in sorted(counts.items())]


# ==================== Settings ==================== #
@router.get("/settings", response_model=schemas.SettingsOut)
def get_settings(db: Session = Depends(get_db), _: models.User = Depends(get_current_admin)):
    return crud.get_settings(db)


@router.put("/settings", response_model=schemas.SettingsOut)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db),
                    _: models.User = Depends(get_current_admin)):
    s = crud.get_settings(db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s
