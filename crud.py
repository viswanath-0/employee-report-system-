"""
crud.py

All CRUD operations for User and Report.
Each function maps to one database action — clean and reusable.
"""

from sqlalchemy.orm import Session
from models import User, Report


# ============================================================
#                      SERIALIZERS
# Convert ORM objects → plain dicts for JSON response
# ============================================================

def serialize_user(user):
    return {
        "id":         user.id,
        "email":      user.email,
        "name":       user.name,
        "department": user.department,
        "role":       user.role
    }


def serialize_report(report):
    return {
        "id":             report.id,
        "employee_email": report.employee_email,
        "date":           report.date,
        "morning":        report.morning   or "",
        "afternoon":      report.afternoon or "",
        "evening":        report.evening   or "",
        "status":         report.status,
        "correction":     report.correction
    }


# ============================================================
#                      USER CRUD
# ============================================================

# CREATE — Add new employee to DB
def create_employee(db: Session, email: str, name: str, department: str, password: str):
    user = User(
        email      = email,
        name       = name,
        department = department,
        password   = password,
        role       = "employee"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# READ — Find one user by email
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


# READ — Get all employees
def get_all_employees(db: Session):
    return db.query(User).filter(User.role == "employee").all()


# READ — Count total employees
def get_employee_count(db: Session):
    return db.query(User).filter(User.role == "employee").count()


# DELETE — Remove employee and their reports (cascade)
def delete_employee(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


# ============================================================
#                      REPORT CRUD
# ============================================================

# CREATE — Create a new blank report entry for today
def create_report(db: Session, employee_email: str, date: str):
    report = Report(employee_email=employee_email, date=date)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# READ — Get one report by employee + date
def get_report_by_date(db: Session, employee_email: str, date: str):
    return db.query(Report).filter(
        Report.employee_email == employee_email,
        Report.date           == date
    ).first()


# READ — Get all reports of one employee
def get_all_reports(db: Session, employee_email: str):
    return db.query(Report).filter(Report.employee_email == employee_email).all()


# UPDATE — Fill in one session field (morning / afternoon / evening)
def update_report_session(db: Session, report: Report, session: str, task: str):
    setattr(report, session, task)
    db.commit()
    db.refresh(report)
    return report


# UPDATE — Manager updates report status + optional correction
def verify_report(db: Session, report_id: int, status: str, correction: str = None):
    report = db.query(Report).filter(Report.id == report_id).first()
    if report:
        report.status = status
        if correction:
            report.correction = correction
        db.commit()
        db.refresh(report)
    return report


# DELETE — Remove one report by ID
def delete_report(db: Session, report_id: int):
    report = db.query(Report).filter(Report.id == report_id).first()
    if report:
        db.delete(report)
        db.commit()
        return True
    return False
