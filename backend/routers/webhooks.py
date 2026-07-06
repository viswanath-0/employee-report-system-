"""
routers/webhooks.py

Inbound webhooks. Currently just Brevo's transactional-email events: when a
credentials / reset / notification email bounces ("address not found"), Brevo
POSTs an event here and we alert the admin in-app so a bad address doesn't go
unnoticed. This is the reliable way to know an email doesn't exist — the send
itself tells us (asynchronously), which no free real-time check can do for Gmail.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import crud
import models

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

def _is_undeliverable(event: str) -> bool:
    """True for Brevo's delivery-failure events, matched loosely so it works
    regardless of exact spelling (hard_bounce / hardBounce / invalid_email /
    invalid / blocked). Soft bounces (temporary) are intentionally excluded."""
    e = (event or "").lower().replace("_", "").replace("-", "").replace(" ", "")
    return any(k in e for k in ("hardbounce", "invalid", "blocked"))


@router.post("/brevo")
async def brevo_events(request: Request, db: Session = Depends(get_db)):
    # Optional shared-secret gate (?token=... or an X-Webhook-Token header).
    if settings.WEBHOOK_SECRET:
        token = request.query_params.get("token") or request.headers.get("x-webhook-token")
        if token != settings.WEBHOOK_SECRET:
            raise HTTPException(403, "Invalid webhook token")

    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}   # ignore non-JSON pings / test calls

    event = str(payload.get("event") or "")
    email = str(payload.get("email") or "").strip().lower()
    if not email or not _is_undeliverable(event):
        return {"ok": True}   # we only act on undeliverable events

    reason = payload.get("reason") or "Address not found — the mailbox doesn't exist."

    # Was this a provisioned account? (helps the admin identify who to fix)
    user = (
        db.query(models.User)
        .filter((func.lower(models.User.email) == email)
                | (func.lower(models.User.personal_email) == email))
        .first()
    )
    who = f"{user.name} · {user.company_id}" if user and user.company_id else email

    admin = crud.get_user_by_email(db, settings.ADMIN_EMAIL.lower().strip())
    if admin:
        crud.create_notification(
            db, user_id=admin.id,
            title="✉️ Email undeliverable",
            message=f"Mail to {email} bounced — {reason} ({who}). "
                    "Fix or re-request the correct email address.",
            type="warning", link="/admin/employees",
        )
    return {"ok": True, "handled": event}
