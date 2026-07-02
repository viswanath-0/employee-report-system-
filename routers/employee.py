"""
routers/employee.py

Employee API Routes
-------------------
C  POST   /employee/register           → Register new employee
R  POST   /employee/login              → Employee login
R  GET    /employee/reports/{email}    → View all own reports
U  PUT    /employee/report/{email}/{date} → Submit / update daily session
D  DELETE /employee/report/{report_id} → Delete a report
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import EmployeeRegister, LoginRequest, ReportSubmit
from validation import Validation
import crud

router = APIRouter(prefix="/employee", tags=["Employee"])


# ==================== CREATE ==================== #

@router.post("/register", summary="Register a new employee")
def register(data: EmployeeRegister, db: Session = Depends(get_db)):

    email = data.email.lower()

    if not Validation.validate_email(email):
        raise HTTPException(400, "Invalid Gmail address.")

    if crud.get_user_by_email(db, email):
        raise HTTPException(400, "User already exists.")

    if len(data.name.strip()) < 3:
        raise HTTPException(400, "Name must be at least 3 characters.")

    if not Validation.validate_department(data.department):
        raise HTTPException(400, "Invalid department. Choose: AI, HR, IT, Finance, Testing, Development, Sales, Marketing")

    if not Validation.validate_password(data.password):
        raise HTTPException(400, "Password must be exactly 8 characters with Uppercase, Lowercase, Number, Special character.")

    user = crud.create_employee(db, email, data.name.title(), data.department.strip(), data.password)

    return {
        "message":    "Registration Successful!",
        "email":      user.email,
        "name":       user.name,
        "department": user.department
    }


# ==================== READ ==================== #

@router.post("/login", summary="Employee login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, data.email.lower())

    if not user or user.role != "employee":
        raise HTTPException(404, "Employee not found.")

    if user.password != data.password:
        raise HTTPException(401, "Incorrect Password.")

    return {
        "message": f"Welcome {user.name}",
        "email":   user.email,
        "role":    user.role
    }


@router.get("/reports/{email}", summary="View all reports of an employee")
def view_reports(email: str, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, email.lower())

    if not user:
        raise HTTPException(404, "Employee not found.")

    reports = crud.get_all_reports(db, email.lower())

    return {
        "email":   user.email,
        "name":    user.name,
        "reports": [crud.serialize_report(r) for r in reports]
    }


# ==================== UPDATE ==================== #

@router.put("/report/{email}/{date}", summary="Submit or update a session in the daily report")
def submit_report(email: str, date: str, data: ReportSubmit, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, email.lower())

    if not user:
        raise HTTPException(404, "Employee not found.")

    if not Validation.validate_date(date):
        raise HTTPException(400, "Invalid date format. Use DD-MM-YYYY.")

    session = data.session.title()

    if not Validation.validate_session(session):
        raise HTTPException(400, "Invalid session. Use Morning / Afternoon / Evening / Leave.")

    # Get today's report or create a fresh one
    report = crud.get_report_by_date(db, email.lower(), date)
    if not report:
        report = crud.create_report(db, email.lower(), date)

    # ---------- Handle Leave ---------- #
    if session == "Leave":
        if report.morning not in ("", None):
            raise HTTPException(400, "Report already submitted for today.")
        crud.update_report_session(db, report, "morning",   "Leave")
        crud.update_report_session(db, report, "afternoon", "Leave")
        crud.update_report_session(db, report, "evening",   "Leave")
        return {"message": "Leave applied successfully.", "report_id": report.id, "date": date}

    # ---------- Handle Normal Session ---------- #
    field = session.lower()

    if getattr(report, field) not in ("", None):
        raise HTTPException(400, f"{session} report already submitted for {date}.")

    updated = crud.update_report_session(db, report, field, data.task)

    return {
        "message":   f"{session} Report Submitted Successfully.",
        "report_id": updated.id,
        "date":      date
    }


# ==================== DELETE ==================== #

@router.delete("/report/{report_id}", summary="Delete a report by ID")
def delete_report(report_id: int, db: Session = Depends(get_db)):

    success = crud.delete_report(db, report_id)

    if not success:
        raise HTTPException(404, "Report not found.")

    return {"message": f"Report #{report_id} deleted successfully."}
