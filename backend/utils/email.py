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
import html
import logging

from config import settings

log = logging.getLogger("email")


def _configured() -> bool:
    # Gmail App Password path (Phase 2): send only when a real app password is present.
    return bool(settings.GMAIL_APP_PASSWORD and settings.GMAIL_ADDRESS)


def is_configured() -> bool:
    """Public helper so routes can report whether an email actually went out."""
    return _configured()


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
            MAIL_USERNAME=settings.GMAIL_ADDRESS,
            MAIL_PASSWORD=settings.GMAIL_APP_PASSWORD.replace(" ", ""),  # Gmail shows it spaced
            MAIL_FROM=settings.GMAIL_ADDRESS,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=587,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
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


def email_credentials(to: str, full_name: str, company_id: str, temp_password: str,
                      department: str, role: str) -> None:
    from config import settings as _s
    e = html.escape   # so a '&' / '<' in a password or name can't break the HTML email
    send_email(
        to,
        "Your Employee Report System account is ready",
        _wrap(
            "Welcome — here are your login details",
            f"Hi {e(full_name)},<br/><br/>An account has been created for you.<br/><br/>"
            f"<b>Department:</b> {e(department)}<br/>"
            f"<b>Role:</b> {e(role.title())}<br/>"
            f"<b>Login ID (Company ID):</b> <code>{e(company_id)}</code><br/>"
            f"<b>Temporary password:</b> <code>{e(temp_password)}</code><br/><br/>"
            f"Log in at <a href='{_s.FRONTEND_URL}/login'>{_s.FRONTEND_URL}/login</a> — "
            f"you'll be asked to set your own password on first sign-in.",
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
