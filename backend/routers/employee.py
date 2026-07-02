"""
routers/employee.py

Employee-facing endpoints:
  POST /reports/submit          — submit today's report (tasks or leave)
  GET  /reports/my              — all my reports
  GET  /reports/my/{date}       — my report for a specific ISO date
  PUT  /reports/{id}/resubmit   — resubmit after a clarification request
  POST /leave/apply             — apply for leave on a date
  POST /escalations             — escalate a pending report
  GET  /escalations/my          — my escalations
"""

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import settings as app_settings
from database import get_db
import crud
import models
import schemas
from utils.jwt import get_current_employee
from utils.deadline import is_submission_late, can_escalate
from utils.email import email_escalation

router = APIRouter(tags=["Employee"])


# -------------------- helpers -------------------- #
def _valid_hhmm(s: str) -> bool:
    return bool(re.match(r"^\d{2}:\d{2}$", s or ""))


def _ddmmyyyy(iso: str) -> str:
    try:
        y, m, d = iso.split("-")
        return f"{d}-{m}-{y}"
    except Exception:
        return iso


def _clear_report_content(db: Session, report: models.Report):
    for t in list(report.tasks):
        db.delete(t)          # task_files cascade with the task
    if report.leave:
        db.delete(report.leave)
    db.flush()


def _apply_content(db: Session, report: models.Report, *, is_leave: bool,
                   tasks: list, leave):
    """(Re)build a report's tasks or leave from an incoming payload."""
    if is_leave:
        if not leave or not (leave.reason or "").strip():
            raise HTTPException(400, "A reason is required for leave")
        if not leave.file_path:
            raise HTTPException(400, "A supporting document is required for leave")
        report.status = "leave"
        db.add(models.LeaveRequest(
            report_id=report.id,
            leave_type=leave.leave_type,
            reason=leave.reason,
            file_path=leave.file_path,
            file_name=leave.file_name,
            status="pending",
        ))
    else:
        if not tasks:
            raise HTTPException(400, "Add at least one task, or apply for leave")
        for t in tasks:
            if not _valid_hhmm(t.start_time) or not _valid_hhmm(t.end_time):
                raise HTTPException(400, "Task times must be in HH:MM format")
            if t.start_time >= t.end_time:
                raise HTTPException(400, f"Task '{t.title}': start time must be before end time")
        report.status = "pending"
        for t in tasks:
            task = models.Task(
                report_id=report.id, title=t.title, description=t.description or "",
                start_time=t.start_time, end_time=t.end_time, color=t.color or "indigo",
            )
            db.add(task)
            db.flush()
            for f in t.files:
                db.add(models.TaskFile(
                    task_id=task.id, file_name=f.file_name,
                    file_path=f.file_path, file_size=f.file_size,
                ))


def _notify_manager(db, employee, date_iso, kind, link="/manager/pending"):
    if employee.manager_id:
        crud.create_notification(
            db, user_id=employee.manager_id,
            title=f"New {kind} from {employee.name}",
            message=f"{_ddmmyyyy(date_iso)} — awaiting your review",
            type="info", link=link,
        )


# -------------------- Submit / list -------------------- #
@router.post("/reports/submit", response_model=schemas.ReportOut)
def submit_report(
    payload: schemas.ReportSubmitIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    s = crud.get_settings(db)

    report = crud.get_report_for_date(db, user.id, payload.date)
    if report and report.status == "approved":
        raise HTTPException(400, "This report is already approved and can no longer be changed")

    if not report:
        report = models.Report(employee_id=user.id, date=payload.date)
        db.add(report)
        db.flush()
    else:
        _clear_report_content(db, report)

    report.deadline = s.deadline_time
    report.correction_message = None
    report.is_late = is_submission_late(payload.date, s.deadline_time, datetime.now())

    _apply_content(db, report, is_leave=payload.is_leave,
                   tasks=payload.tasks, leave=payload.leave)

    db.commit()
    db.refresh(report)

    _notify_manager(db, user, payload.date,
                    "leave request" if payload.is_leave else "daily report")
    return report


@router.get("/reports/my", response_model=list[schemas.ReportOut])
def my_reports(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    return (
        db.query(models.Report)
        .filter(models.Report.employee_id == user.id)
        .order_by(models.Report.date.desc())
        .all()
    )


@router.get("/reports/my/{date}", response_model=schemas.ReportOut)
def my_report_for_date(
    date: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    report = crud.get_report_for_date(db, user.id, date)
    if not report:
        raise HTTPException(404, "No report found for this date")
    return report


@router.put("/reports/{report_id}/resubmit", response_model=schemas.ReportOut)
def resubmit_report(
    report_id: int,
    payload: schemas.ReportResubmitIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    report = crud.get_report(db, report_id)
    if not report or report.employee_id != user.id:
        raise HTTPException(404, "Report not found")
    if report.status not in ("unapproved", "escalated"):
        raise HTTPException(400, "Only reports awaiting clarification can be resubmitted")

    _clear_report_content(db, report)
    report.correction_message = None
    report.is_late = is_submission_late(report.date, report.deadline, datetime.now())
    _apply_content(db, report, is_leave=payload.is_leave,
                   tasks=payload.tasks, leave=payload.leave)
    db.commit()
    db.refresh(report)

    if user.manager_id:
        crud.create_notification(
            db, user_id=user.manager_id,
            title=f"{user.name} resubmitted a report",
            message=(payload.note or f"Report for {_ddmmyyyy(report.date)} was updated"),
            type="info", link="/manager/pending",
        )
    return report


# -------------------- Leave -------------------- #
class LeaveApplyIn(BaseModel):
    date: str
    leave_type: str = "Casual"
    reason: str = Field(min_length=1)
    file_path: str
    file_name: str | None = None


@router.post("/leave/apply", response_model=schemas.ReportOut)
def apply_leave(
    payload: LeaveApplyIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    s = crud.get_settings(db)
    report = crud.get_report_for_date(db, user.id, payload.date)
    if report and report.status == "approved":
        raise HTTPException(400, "This day already has an approved report")

    if not report:
        report = models.Report(employee_id=user.id, date=payload.date)
        db.add(report)
        db.flush()
    else:
        _clear_report_content(db, report)

    report.deadline = s.deadline_time
    report.correction_message = None
    report.is_late = is_submission_late(payload.date, s.deadline_time, datetime.now())

    leave_obj = schemas.LeaveIn(
        leave_type=payload.leave_type, reason=payload.reason,
        file_path=payload.file_path, file_name=payload.file_name,
    )
    _apply_content(db, report, is_leave=True, tasks=[], leave=leave_obj)
    db.commit()
    db.refresh(report)

    _notify_manager(db, user, payload.date, "leave request", link="/manager/leaves")
    return report


# -------------------- Escalations -------------------- #
@router.post("/escalations", response_model=schemas.EscalationOut)
def escalate(
    payload: schemas.EscalationIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    report = crud.get_report(db, payload.report_id)
    if not report or report.employee_id != user.id:
        raise HTTPException(404, "Report not found")

    if not can_escalate(report.status, report.created_at):
        raise HTTPException(
            400,
            "This report cannot be escalated yet. Escalation is available for pending "
            "reports on the last day of the month, or after 30 days without action.",
        )

    esc = models.Escalation(report_id=report.id, message=payload.message, status="sent")
    db.add(esc)
    report.status = "escalated"
    db.commit()
    db.refresh(esc)

    manager = crud.get_user(db, user.manager_id) if user.manager_id else None
    if manager:
        crud.create_notification(
            db, user_id=manager.id,
            title=f"🚩 Escalation from {user.name}",
            message=payload.message,
            type="warning", link="/manager/escalations",
        )
        link = f"{app_settings.FRONTEND_URL}/manager/pending"
        background.add_task(
            email_escalation, manager.email, manager.name, user.name,
            _ddmmyyyy(report.date), payload.message, link,
        )
    return esc


@router.get("/escalations/my", response_model=list[schemas.EscalationDetailOut])
def my_escalations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_employee),
):
    rows = (
        db.query(models.Escalation)
        .join(models.Report, models.Escalation.report_id == models.Report.id)
        .filter(models.Report.employee_id == user.id)
        .order_by(models.Escalation.sent_at.desc())
        .all()
    )
    return [
        schemas.EscalationDetailOut(
            id=e.id, report_id=e.report_id, message=e.message, status=e.status,
            sent_at=e.sent_at, employee_id=user.id, employee_name=user.name,
            report_date=e.report.date,
        )
        for e in rows
    ]
