"""
utils/email.py

Email via Brevo's HTTPS transactional API (https://api.brevo.com/v3/smtp/email).

Why not SMTP? Railway (and most cloud hosts) block outbound SMTP ports, so a
Gmail/SMTP send just times out. Brevo's HTTP API goes over port 443, which is
allowed — so email works from the deployed server.

If BREVO_API_KEY is unset, messages are logged to the console instead of sent
(so local dev / provisioning still works). Sending never raises into the request
path, and these functions are safe to pass to FastAPI BackgroundTasks.

Sender: settings.GMAIL_ADDRESS must be a VERIFIED sender in your Brevo account.
"""

import html
import json
import logging
import urllib.error
import urllib.request

from config import settings

log = logging.getLogger("email")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _configured() -> bool:
    return bool(settings.BREVO_API_KEY)


def is_configured() -> bool:
    """Public helper so routes can report whether email is set up."""
    return _configured()


def _brevo_post(to: str, subject: str, html_body: str):
    """POST one email to Brevo. Returns (ok: bool, detail: str). Never raises."""
    payload = json.dumps({
        "sender": {"email": settings.GMAIL_ADDRESS, "name": settings.MAIL_FROM_NAME},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html_body,
    }).encode("utf-8")
    req = urllib.request.Request(
        BREVO_URL, data=payload, method="POST",
        headers={
            "api-key": settings.BREVO_API_KEY,
            "accept": "application/json",
            "content-type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return True, f"{resp.status} OK"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        return False, f"HTTP {e.code}: {body}"
    except Exception as e:  # pragma: no cover
        return False, f"{type(e).__name__}: {e}"


def send_email(to: str, subject: str, html_body: str) -> None:
    """Send one HTML email. Never raises."""
    if not to:
        return
    if not _configured():
        msg = (
            f"\n-------- [EMAIL - mock / disabled] --------\n"
            f"  To      : {to}\n  Subject : {subject}\n"
            f"  Body    : {_strip(html_body)}\n"
            f"-------------------------------------------\n"
        )
        print(msg.encode("ascii", "replace").decode("ascii"))
        return
    ok, detail = _brevo_post(to, subject, html_body)
    if ok:
        log.info("Email sent to %s: %s", to, subject)
    else:
        log.warning("Email send failed (%s): %s", to, detail)
        print(f"[EMAIL send failed -> {to}] {detail}")


def test_send(to: str) -> dict:
    """Diagnostic send that RETURNS the real outcome (used by /admin/email-test)."""
    if not _configured():
        return {"ok": False, "configured": False,
                "detail": "BREVO_API_KEY is not set on the server."}
    ok, detail = _brevo_post(
        to, "Employee Report System — email diagnostic",
        _wrap("Email diagnostic", "If you can read this, the server sends email via Brevo."),
    )
    return {"ok": ok, "configured": True, "detail": detail}


def _strip(html_str: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", html_str).strip()


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
    e = html.escape
    send_email(
        to,
        "Your leave request has been approved",
        _wrap(
            "Leave Approved",
            f"Hi {e(employee_name)},<br/><br/>Your leave on <b>{e(leave_date)}</b> has been "
            f"<b>approved</b> by {e(manager_name)}.<br/><br/>Enjoy your day off!",
        ),
    )


def email_credentials(to: str, full_name: str, company_id: str, temp_password: str,
                      department: str, role: str) -> None:
    e = html.escape   # so a special char in a password or name can't break the HTML email
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
            f"Log in at <a href='{settings.FRONTEND_URL}/login'>{settings.FRONTEND_URL}/login</a> — "
            f"you'll be asked to set your own password on first sign-in.",
        ),
    )


def email_escalation(to: str, manager_name: str, employee_name: str,
                     report_date: str, message: str, link: str) -> None:
    e = html.escape
    send_email(
        to,
        f"Escalation raised by {employee_name}",
        _wrap(
            "Report Escalation",
            f"Hi {e(manager_name)},<br/><br/><b>{e(employee_name)}</b> has escalated a pending "
            f"report dated <b>{e(report_date)}</b>.<br/><br/>"
            f"<i>&ldquo;{e(message)}&rdquo;</i><br/><br/>"
            f"<a href='{e(link)}' style='display:inline-block;background:#6366F1;color:#fff;"
            f"padding:10px 18px;border-radius:8px;text-decoration:none'>Review the report</a>",
        ),
    )
