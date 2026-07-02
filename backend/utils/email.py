"""
utils/email.py

Thin, failure-tolerant email layer built on FastAPI-Mail.

If email is disabled (settings.EMAIL_ENABLED = False) or credentials are
missing, messages are logged to the console instead of being sent — so the
rest of the app keeps working in local dev. Email sending never raises into
the request path.

These functions are safe to pass to FastAPI `BackgroundTasks.add_task(...)`.
"""

import asyncio
import logging

from config import settings

log = logging.getLogger("email")


def _configured() -> bool:
    return bool(settings.EMAIL_ENABLED and settings.MAIL_USERNAME and settings.MAIL_PASSWORD)


def send_email(to: str, subject: str, html_body: str) -> None:
    """Send a single HTML email. Never raises."""
    if not to:
        return
    if not _configured():
        msg = (
            f"\n-------- [EMAIL - mock / disabled] --------\n"
            f"  To      : {to}\n  Subject : {subject}\n"
            f"  Body    : {_strip(html_body)}\n"
            f"-------------------------------------------\n"
        )
        # ascii-safe so it never crashes on a cp1252 console
        print(msg.encode("ascii", "replace").decode("ascii"))
        return
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        message = MessageSchema(
            subject=subject, recipients=[to], body=html_body, subtype=MessageType.html
        )
        # send_message is a coroutine; sync routes run in a threadpool so
        # asyncio.run() here is safe (no running loop in this thread).
        asyncio.run(FastMail(conf).send_message(message))
        log.info("Email sent to %s: %s", to, subject)
    except Exception as e:  # pragma: no cover
        log.warning("Email send failed (%s): %s", to, e)
        print(f"[EMAIL send failed → {to}] {e}")


def _strip(html: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", html).strip()


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;background:#f1f5f9;padding:24px">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;
                  overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:#0F172A;padding:20px 24px">
          <span style="color:#fff;font-size:18px;font-weight:700">Employee Report System</span>
        </div>
        <div style="padding:24px">
          <h2 style="margin:0 0 12px;color:#0F172A;font-size:18px">{title}</h2>
          <div style="color:#334155;font-size:14px;line-height:1.6">{body_html}</div>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
          This is an automated message — please do not reply.
        </div>
      </div>
    </div>
    """


# -------------------- High-level notifications -------------------- #
def email_leave_approved(to: str, employee_name: str, leave_date: str, manager_name: str) -> None:
    send_email(
        to,
        "Your leave request has been approved",
        _wrap(
            "Leave Approved ✅",
            f"Hi {employee_name},<br/><br/>Your leave on <b>{leave_date}</b> has been "
            f"<b>approved</b> by {manager_name}.<br/><br/>Enjoy your day off!",
        ),
    )


def email_escalation(to: str, manager_name: str, employee_name: str,
                     report_date: str, message: str, link: str) -> None:
    send_email(
        to,
        f"Escalation raised by {employee_name}",
        _wrap(
            "Report Escalation 🚩",
            f"Hi {manager_name},<br/><br/><b>{employee_name}</b> has escalated a pending "
            f"report dated <b>{report_date}</b>.<br/><br/>"
            f"<i>“{message}”</i><br/><br/>"
            f"<a href='{link}' style='display:inline-block;background:#6366F1;color:#fff;"
            f"padding:10px 18px;border-radius:8px;text-decoration:none'>Review the report</a>",
        ),
    )
