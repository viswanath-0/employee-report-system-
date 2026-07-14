"""
utils/deadline.py

Deadline + escalation business rules.
"""

import calendar
from datetime import datetime, date, time, timedelta, timezone

from config import settings


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

    Timezone-aware: the deadline (e.g. "20:00") is a LOCAL wall-clock time, but the
    server runs in UTC. We anchor the deadline to the company timezone
    (settings.TZ_OFFSET_MINUTES) and treat a naive `submitted_at` as UTC — so a report
    filed at 10:53 PM local correctly counts as after an 8:00 PM local deadline.
    """
    try:
        rd = datetime.strptime(report_date, "%Y-%m-%d").date()
    except Exception:
        return False
    try:
        dl_time = datetime.strptime(deadline_hhmm, "%H:%M").time()
    except Exception:
        dl_time = time(20, 0)

    local_tz = timezone(timedelta(minutes=settings.TZ_OFFSET_MINUTES))
    deadline_dt = datetime.combine(rd, dl_time, tzinfo=local_tz)
    if submitted_at.tzinfo is None:          # naive timestamps are UTC (server convention)
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    return submitted_at > deadline_dt


def is_last_day_of_month(today: date | None = None) -> bool:
    today = today or date.today()
    last = calendar.monthrange(today.year, today.month)[1]
    return today.day == last


def can_escalate(status: str, created_at: datetime, report_date: str | None = None,
                 today: date | None = None) -> bool:
    """
    An employee may escalate a report only if it is still 'pending', AND any one of:
      a) it is the last day of the current month, OR
      b) 30+ days have passed since submission with no manager action, OR
      c) the report belongs to a previous month (e.g. a June report while it is July).
    report_date is ISO 'YYYY-MM-DD'.
    """
    if status != "pending":
        return False
    today = today or date.today()
    if is_last_day_of_month(today):
        return True
    if (today - created_at.date()).days >= 30:
        return True
    if report_date:
        try:
            rd = datetime.strptime(report_date, "%Y-%m-%d").date()
            if (rd.year, rd.month) < (today.year, today.month):   # a past month
                return True
        except Exception:
            pass
    return False
