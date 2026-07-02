"""
routers/admin.py

Admin API Routes
-----------------
R  POST   /admin/login              → Admin login
R  GET    /admin/employees          → View all employees
R  GET    /admin/reports/{email}    → View all reports of one employee
R  GET    /admin/count              → Total employee count
D  DELETE /admin/employee/{email}   → Delete an employee
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import LoginRequest
import crud

router = APIRouter(prefix="/admin", tags=["Admin"])


# Hardcoded admin credentials (same as original project)
ADMINS = {
    "admin@gmail.com": {
        "name":     "Admin",
        "password": "Admin@1"
    }
}


# ==================== READ ==================== #

@router.post("/login", summary="Admin login")
def login(data: LoginRequest):

    adm = ADMINS.get(data.email.lower())

    if not adm:
        raise HTTPException(404, "Admin not found.")

    if adm["password"] != data.password:
        raise HTTPException(401, "Incorrect Password.")

    return {"message": f"Welcome {adm['name']}"}


@router.get("/employees", summary="View all registered employees")
def view_all_employees(db: Session = Depends(get_db)):

    employees = crud.get_all_employees(db)

    return {
        "total":     len(employees),
        "employees": [
            {
                "name":       e.name,
                "email":      e.email,
                "department": e.department
            }
            for e in employees
        ]
    }


@router.get("/reports/{email}", summary="View all reports of a specific employee")
def view_employee_reports(email: str, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, email.lower())

    if not user:
        raise HTTPException(404, "Employee not found.")

    reports = crud.get_all_reports(db, email.lower())

    return {
        "email":   user.email,
        "name":    user.name,
        "reports": [crud.serialize_report(r) for r in reports]
    }


@router.get("/count", summary="Get total number of registered employees")
def employee_count(db: Session = Depends(get_db)):

    count = crud.get_employee_count(db)

    return {"total_employees": count}


# ==================== DELETE ==================== #

@router.delete("/employee/{email}", summary="Delete an employee and all their reports")
def delete_employee(email: str, db: Session = Depends(get_db)):

    user = crud.get_user_by_email(db, email.lower())

    if not user:
        raise HTTPException(404, "Employee not found.")

    crud.delete_employee(db, email.lower())

    return {"message": f"Employee {email} and all their reports deleted successfully."}
