"""
seed.py — populate the database with realistic demo data.

Run from the backend directory (with your venv active):
    python seed.py

Creates 2 managers, several employees, and a spread of reports/leaves/
escalations so the dashboards and charts have something to show.

Idempotent: it skips seeding if demo managers already exist (use FORCE=1 to
add more anyway).
"""

import os
import random
from datetime import date, datetime, timedelta

from database import engine, Base, SessionLocal
import models
import crud

Base.metadata.create_all(bind=engine)

COLORS = ["indigo", "teal", "amber", "rose", "violet"]
DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Support"]
TASK_TITLES = [
    ("Standup & planning", "Attended daily standup and planned the day's work."),
    ("Feature development", "Implemented the new dashboard widgets and wired up the API."),
    ("Code review", "Reviewed 3 pull requests and left detailed feedback."),
    ("Bug fixing", "Investigated and fixed the timeline drag-selection edge case."),
    ("Client call", "Sync with the client on requirements and next milestones."),
    ("Documentation", "Wrote API docs and updated the onboarding guide."),
]


def make_tasks(report_id, db, n):
    start = 9 * 60  # 09:00 in minutes
    for i in range(n):
        dur = random.choice([60, 90, 120])
        s, e = start, min(start + dur, 21 * 60)
        title, desc = random.choice(TASK_TITLES)
        db.add(models.Task(
            report_id=report_id, title=title, description=desc,
            start_time=f"{s // 60:02d}:{s % 60:02d}",
            end_time=f"{e // 60:02d}:{e % 60:02d}",
            color=COLORS[i % len(COLORS)],
        ))
        start = e + 30
        if start >= 21 * 60:
            break


def seed():
    db = SessionLocal()
    try:
        crud.get_settings(db)
        existing = db.query(models.User).filter(models.User.role == "manager").count()
        if existing and not os.environ.get("FORCE"):
            print("Demo managers already exist — skipping. Set FORCE=1 to seed anyway.")
            return

        # -------- managers --------
        managers = []
        for name, email, dept in [
            ("Mona Manager", "mona@company.com", "Engineering"),
            ("Marcus Lead", "marcus@company.com", "Sales"),
        ]:
            if not crud.get_user_by_email(db, email):
                m = crud.create_user(db, name=name, email=email, password="Manager@123",
                                     department=dept, role="manager")
                managers.append(m)
                print(f"  manager: {email} / Manager@123")
            else:
                managers.append(crud.get_user_by_email(db, email))

        # -------- employees --------
        employees = []
        emp_defs = [
            ("Eddie Employee", "eddie@company.com", "Engineering", managers[0]),
            ("Emma Dev", "emma@company.com", "Engineering", managers[0]),
            ("Ravi Kumar", "ravi@company.com", "Engineering", managers[0]),
            ("Sara Sales", "sara@company.com", "Sales", managers[1]),
            ("Tom Support", "tom@company.com", "Support", managers[1]),
        ]
        for name, email, dept, mgr in emp_defs:
            if not crud.get_user_by_email(db, email):
                e = crud.create_user(db, name=name, email=email, password="Employee@123",
                                     department=dept, role="employee", manager_id=mgr.id)
                employees.append(e)
                print(f"  employee: {email} / Employee@123")
            else:
                employees.append(crud.get_user_by_email(db, email))

        db.commit()

        # -------- reports across the last ~25 days --------
        today = date.today()
        statuses_pool = ["approved", "approved", "approved", "pending", "unapproved", "leave"]
        for emp in employees:
            for delta in range(0, 25):
                d = today - timedelta(days=delta)
                if d.weekday() >= 5:      # skip weekends
                    continue
                if random.random() < 0.2:  # some days simply have no report
                    continue
                iso = d.isoformat()
                if crud.get_report_for_date(db, emp.id, iso):
                    continue
                status = random.choice(statuses_pool)
                created = datetime.combine(d, datetime.min.time()) + timedelta(hours=19)
                report = models.Report(
                    employee_id=emp.id, date=iso, status=status,
                    deadline="20:00", is_late=random.random() < 0.15,
                    created_at=created,
                )
                if status == "unapproved" and random.random() < 0.7:
                    report.correction_message = "Please add more detail about the client call outcome."
                db.add(report)
                db.flush()

                if status == "leave":
                    db.add(models.LeaveRequest(
                        report_id=report.id,
                        leave_type=random.choice(["Sick", "Casual", "Emergency"]),
                        reason="Personal reasons — will be back tomorrow.",
                        status=random.choice(["pending", "approved"]),
                    ))
                else:
                    make_tasks(report.id, db, random.randint(1, 4))
        db.commit()

        # -------- one escalatable + escalated report --------
        emp = employees[0]
        old_day = (today - timedelta(days=40)).isoformat()
        if not crud.get_report_for_date(db, emp.id, old_day):
            r = models.Report(employee_id=emp.id, date=old_day, status="escalated",
                              deadline="20:00",
                              created_at=datetime.now() - timedelta(days=40))
            db.add(r)
            db.flush()
            make_tasks(r.id, db, 2)
            db.add(models.Escalation(
                report_id=r.id, status="sent",
                message="This report has been pending for over a month. Please review."))
            crud.create_notification(
                db, user_id=emp.manager_id, title="Escalation from Eddie Employee",
                message="This report has been pending for over a month. Please review.",
                type="warning", link="/manager/escalations", commit=False)
            db.commit()

        print("\nSeed complete. Admin: admin@company.com / Admin@123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
