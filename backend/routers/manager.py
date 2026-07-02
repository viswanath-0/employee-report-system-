"""
routers/manager.py

Manager-facing endpoints (role = manager). Every report/leave/escalation is
scoped to the manager's own team (employees whose manager_id == manager.id).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
import crud
import models
import schemas
from utils.jwt import get_current_manager
from utils.email import email_leave_approved

router = APIRouter(prefix="/manager", tags=["Manager"])


# -------------------- helpers -------------------- #
def _team_ids(db: Session, manager: models.User) -> list[int]:
    rows = db.query(models.User.id).filter(models.User.manager_id == manager.id).all()
    return [r[0] for r in rows]


def _team_report(db: Session, manager: models.User, report_id: int) -> models.Report:
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    if not report.employee or report.employee.manager_id != manager.id:
        raise HTTPException(403, "This report does not belong to your team")
    return report


def _resolve_escalations(db: Session, report: models.Report):
    for e in report.escalations:
        if e.status == "sent":
            e.status = "resolved"


# -------------------- Dashboard / team -------------------- #
@router.get("/stats", response_model=dict)
def manager_stats(db: Session = Depends(get_db),
                  manager: models.User = Depends(get_current_manager)):
    ids = _team_ids(db, manager)
    today = date.today().isoformat()
    if not ids:
        return {"team_size": 0, "pending_approvals": 0, "approved_today": 0,
                "pending_escalations": 0}

    pending = db.query(models.Report).filter(
        models.Report.employee_id.in_(ids), models.Report.status == "pending").count()
    approved_today = db.query(models.Report).filter(
        models.Report.employee_id.in_(ids), models.Report.status == "approved",
        models.Report.date == today).count()
    escalations = (
        db.query(models.Escalation)
        .join(models.Report, models.Escalation.report_id == models.Report.id)
        .filter(models.Report.employee_id.in_(ids), models.Escalation.status == "sent")
        .count()
    )
    return {
        "team_size": len(ids),
        "pending_approvals": pending,
        "approved_today": approved_today,
        "pending_escalations": escalations,
    }


@router.get("/team", response_model=list[dict])
def team(db: Session = Depends(get_db),
         manager: models.User = Depends(get_current_manager)):
    members = (
        db.query(models.User)
        .filter(models.User.manager_id == manager.id)
        .order_by(models.User.name)
        .all()
    )
    today = date.today().isoformat()
    out = []
    for m in members:
        today_report = crud.get_report_for_date(db, m.id, today)
        last = (
            db.query(models.Report)
            .filter(models.Report.employee_id == m.id)
            .order_by(models.Report.date.desc())
            .first()
        )
        out.append({
            "id": m.id, "name": m.name, "email": m.email,
            "department": m.department,
            "today_status": today_report.status if today_report else "none",
            "last_submission": last.date if last else None,
        })
    return out


@router.get("/employee/{employee_id}/reports", response_model=list[schemas.ReportOut])
def employee_reports(employee_id: int, db: Session = Depends(get_db),
                     manager: models.User = Depends(get_current_manager)):
    emp = crud.get_user(db, employee_id)
    if not emp or emp.manager_id != manager.id:
        raise HTTPException(403, "This employee is not on your team")
    return (
        db.query(models.Report)
        .filter(models.Report.employee_id == employee_id)
        .order_by(models.Report.date.desc())
        .all()
    )


# -------------------- Pending approvals -------------------- #
@router.get("/pending", response_model=list[schemas.ReportOut])
def pending_reports(db: Session = Depends(get_db),
                    manager: models.User = Depends(get_current_manager)):
    ids = _team_ids(db, manager)
    if not ids:
        return []
    return (
        db.query(models.Report)
        .filter(models.Report.employee_id.in_(ids),
                models.Report.status.in_(["pending", "escalated"]))
        .order_by(models.Report.date.desc())
        .all()
    )


@router.get("/report/{report_id}", response_model=schemas.ReportOut)
def report_detail(report_id: int, db: Session = Depends(get_db),
                  manager: models.User = Depends(get_current_manager)):
    return _team_report(db, manager, report_id)


@router.put("/report/{report_id}/approve", response_model=schemas.ReportOut)
def approve_report(report_id: int, background: BackgroundTasks,
                   db: Session = Depends(get_db),
                   manager: models.User = Depends(get_current_manager)):
    report = _team_report(db, manager, report_id)
    report.status = "approved"
    report.correction_message = None
    _resolve_escalations(db, report)

    # Leave day → also approve the leave request + email the employee
    if report.leave:
        report.leave.status = "approved"
        background.add_task(
            email_leave_approved, report.employee.email,
            report.employee.name, report.date, manager.name,
        )
        crud.create_notification(
            db, user_id=report.employee_id,
            title="Leave approved ✅",
            message=f"Your leave on {report.date} was approved by {manager.name}",
            type="success", link="/employee/leave", commit=False,
        )
    else:
        crud.create_notification(
            db, user_id=report.employee_id,
            title="Report approved ✅",
            message=f"Your report for {report.date} was approved by {manager.name}",
            type="success", link="/employee/reports", commit=False,
        )
    db.commit()
    db.refresh(report)
    return report


@router.put("/report/{report_id}/unapprove", response_model=schemas.ReportOut)
def unapprove_report(report_id: int, payload: schemas.UnapproveIn,
                     db: Session = Depends(get_db),
                     manager: models.User = Depends(get_current_manager)):
    report = _team_report(db, manager, report_id)
    report.status = "unapproved"
    _resolve_escalations(db, report)

    msg = (payload.message or "").strip()
    if msg:
        report.correction_message = msg
        crud.create_notification(
            db, user_id=report.employee_id,
            title="Clarification requested ✍️",
            message=f"{manager.name}: {msg}",
            type="clarification", link="/employee/reports", commit=False,
        )
    else:
        report.correction_message = None
        crud.create_notification(
            db, user_id=report.employee_id,
            title="Report marked unapproved",
            message=f"Your report for {report.date} was marked unapproved by {manager.name}",
            type="warning", link="/employee/reports", commit=False,
        )
    db.commit()
    db.refresh(report)
    return report


# -------------------- Leave requests -------------------- #
@router.get("/leaves", response_model=list[dict])
def leave_requests(db: Session = Depends(get_db),
                   manager: models.User = Depends(get_current_manager)):
    ids = _team_ids(db, manager)
    if not ids:
        return []
    rows = (
        db.query(models.LeaveRequest)
        .join(models.Report, models.LeaveRequest.report_id == models.Report.id)
        .filter(models.Report.employee_id.in_(ids))
        .order_by(models.LeaveRequest.created_at.desc())
        .all()
    )
    out = []
    for lv in rows:
        emp = lv.report.employee
        out.append({
            "id": lv.id, "report_id": lv.report_id,
            "employee_id": emp.id, "employee_name": emp.name,
            "department": emp.department, "date": lv.report.date,
            "leave_type": lv.leave_type, "reason": lv.reason,
            "file_path": lv.file_path, "file_name": lv.file_name,
            "status": lv.status, "created_at": lv.created_at.isoformat(),
        })
    return out


def _get_team_leave(db, manager, leave_id) -> models.LeaveRequest:
    lv = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if not lv:
        raise HTTPException(404, "Leave request not found")
    if lv.report.employee.manager_id != manager.id:
        raise HTTPException(403, "This leave request does not belong to your team")
    return lv


@router.put("/leave/{leave_id}/approve", response_model=dict)
def approve_leave(leave_id: int, background: BackgroundTasks,
                  db: Session = Depends(get_db),
                  manager: models.User = Depends(get_current_manager)):
    lv = _get_team_leave(db, manager, leave_id)
    lv.status = "approved"
    lv.report.status = "approved"
    emp = lv.report.employee
    crud.create_notification(
        db, user_id=emp.id, title="Leave approved ✅",
        message=f"Your {lv.leave_type} leave on {lv.report.date} was approved",
        type="success", link="/employee/leave", commit=False,
    )
    db.commit()
    background.add_task(email_leave_approved, emp.email, emp.name, lv.report.date, manager.name)
    return {"ok": True, "status": "approved"}


@router.put("/leave/{leave_id}/reject", response_model=dict)
def reject_leave(leave_id: int, db: Session = Depends(get_db),
                 manager: models.User = Depends(get_current_manager)):
    lv = _get_team_leave(db, manager, leave_id)
    lv.status = "rejected"
    crud.create_notification(
        db, user_id=lv.report.employee_id, title="Leave rejected",
        message=f"Your {lv.leave_type} leave on {lv.report.date} was rejected",
        type="warning", link="/employee/leave", commit=False,
    )
    db.commit()
    return {"ok": True, "status": "rejected"}


# -------------------- Escalation inbox -------------------- #
@router.get("/escalations", response_model=list[schemas.EscalationDetailOut])
def escalation_inbox(db: Session = Depends(get_db),
                     manager: models.User = Depends(get_current_manager)):
    ids = _team_ids(db, manager)
    if not ids:
        return []
    rows = (
        db.query(models.Escalation)
        .join(models.Report, models.Escalation.report_id == models.Report.id)
        .filter(models.Report.employee_id.in_(ids))
        .order_by(models.Escalation.sent_at.desc())
        .all()
    )
    return [
        schemas.EscalationDetailOut(
            id=e.id, report_id=e.report_id, message=e.message, status=e.status,
            sent_at=e.sent_at, employee_id=e.report.employee_id,
            employee_name=e.report.employee.name, report_date=e.report.date,
        )
        for e in rows
    ]


@router.put("/escalation/{escalation_id}/resolve", response_model=dict)
def resolve_escalation(escalation_id: int, db: Session = Depends(get_db),
                       manager: models.User = Depends(get_current_manager)):
    e = db.query(models.Escalation).filter(models.Escalation.id == escalation_id).first()
    if not e:
        raise HTTPException(404, "Escalation not found")
    if e.report.employee.manager_id != manager.id:
        raise HTTPException(403, "Not your team")
    e.status = "resolved"
    db.commit()
    return {"ok": True, "status": "resolved"}
