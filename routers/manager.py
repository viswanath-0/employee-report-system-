"""
routers/manager.py

Manager API Routes
-------------------
R  POST /manager/login                      → Manager login
R  GET  /manager/employees                  → View all employees
R  GET  /manager/report/{email}/{date}      → View employee report by date
U  PUT  /manager/report/{report_id}/verify  → Approve / Unapprove report
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import LoginRequest, ReportVerify
import crud

router = APIRouter(prefix="/manager", tags=["Manager"])


# Hardcoded manager credentials (same as original project)
MANAGERS = {
    "manager@gmail.com": {
        "name":     "Manager",
        "password": "Manager@1"
    }
}


# ==================== READ ==================== #

@router.post("/login", summary="Manager login")
def login(data: LoginRequest):

    mgr = MANAGERS.get(data.email.lower())

    if not mgr:
        raise HTTPException(404, "Manager not found.")

    if mgr["password"] != data.password:
        raise HTTPException(401, "Incorrect Password.")

    return {"message": f"Welcome {mgr['name']}"}


@router.get("/employees", summary="View all registered employees")
def view_all_employees(db: Session = Depends(get_db)):

    employees = crud.get_all_employees(db)

    if not employees:
        return {"message": "No employees registered.", "employees": []}

    return {
        "employees": [
            {
                "name":          e.name,
                "email":         e.email,
                "department":    e.department,
                "reports_count": len(e.reports)
            }
            for e in employees
        ]
    }


@router.get("/report/{email}/{date}", summary="View an employee's report for a specific date")
def view_report_by_date(email: str, date: str, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, email.lower())

    if not user:
        raise HTTPException(404, "Employee not found.")

    report = crud.get_report_by_date(db, email.lower(), date)

    if not report:
        raise HTTPException(404, f"No report found for {email} on {date}.")

    return crud.serialize_report(report)


# ==================== UPDATE ==================== #

@router.put("/report/{report_id}/verify", summary="Approve, Pending or Unapprove a report")
def verify_report(report_id: int, data: ReportVerify, db: Session = Depends(get_db)):

    valid_statuses = ["Approved", "Pending", "Unapproved"]

    if data.status not in valid_statuses:
        raise HTTPException(400, "Status must be: Approved, Pending, or Unapproved.")

    if data.status == "Unapproved" and not data.correction:
        raise HTTPException(400, "Correction reason is required when marking Unapproved.")

    report = crud.verify_report(db, report_id, data.status, data.correction)

    if not report:
        raise HTTPException(404, "Report not found.")

    return {
        "message":   f"Report #{report_id} marked as {data.status}.",
        "report_id": report_id,
        "status":    data.status
    }
