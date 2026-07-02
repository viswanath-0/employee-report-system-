"""
utils/deadline.py

Deadline + escalation business rules.
"""

import calendar
from datetime import datetime, date


def hhmm_to_minutes(hhmm: str) -> int:
    """'20:00' -> 1200 minutes from midnight."""
    try:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 20 * 60


def is_submission_late(report_date: str, deadline_hhmm: str, submitted_at: datetime) -> bool:
    """
    A report is 'late' if it was submitted after `deadline_hhmm` on its report date.
    report_date is ISO 'YYYY-MM-DD'.
    """
    try:
        rd = datetime.strptime(report_date, "%Y-%m-%d").date()
    except Exception:
        return False
    try:
        dl_time = datetime.strptime(deadline_hhmm, "%H:%M").time()
    except Exception:
        dl_time = datetime.strptime("20:00", "%H:%M").time()

    deadline_dt = datetime.combine(rd, dl_time)
    return submitted_at > deadline_dt


def is_last_day_of_month(today: date | None = None) -> bool:
    today = today or date.today()
    last = calendar.monthrange(today.year, today.month)[1]
    return today.day == last


def can_escalate(status: str, created_at: datetime, today: date | None = None) -> bool:
    """
    An employee may escalate a report only if:
      a) status is still 'pending', AND
      b) it is the last day of the current month, OR
         30+ days have passed since submission with no manager action.
    """
    if status != "pending":
        return False
    today = today or date.today()
    if is_last_day_of_month(today):
        return True
    age_days = (today - created_at.date()).days
    return age_days >= 30
