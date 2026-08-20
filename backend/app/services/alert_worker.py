"""
Background Worker for Alert Dispatch.

Periodically queries `AlertService.get_active_alerts()`, checks the
`AlertDispatch` table to see if an alert has already been sent, and if not,
emails it to configured recipients using `smtplib` and logs the dispatch.
"""
import logging
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.alert_dispatch import AlertDispatch
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)


class AlertWorker:
    @staticmethod
    def _send_email(subject: str, body: str, recipients: List[str]) -> bool:
        """Helper to send email via SMTP."""
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            logger.info("SMTP not fully configured; skipping email for '%s'", subject)
            return False

        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = ", ".join(recipients)

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            logger.error("Failed to send alert email: %s", e)
            return False

    @classmethod
    def dispatch_pending_alerts(cls, db: Session) -> None:
        """
        Polls active alerts, compares against dispatch history, and sends emails
        for new ones.
        """
        logger.info("Running alert dispatch worker...")
        alerts = AlertService.get_active_alerts(db)

        if not settings.ALERT_EMAIL_RECIPIENTS:
            logger.info("No ALERT_EMAIL_RECIPIENTS configured, dispatch will just log to DB.")
            recipients = []
        else:
            recipients = [r.strip() for r in settings.ALERT_EMAIL_RECIPIENTS.split(",") if r.strip()]

        for alert in alerts:
            # Skip if already dispatched
            existing = db.query(AlertDispatch).filter(AlertDispatch.alert_id == alert["id"]).first()
            if existing:
                continue

            # It's a new alert, attempt delivery
            subject = f"[{alert['severity'].upper()}] {alert['title']}"
            body = (
                f"Wildlife System Alert\n"
                f"=====================\n\n"
                f"Severity: {alert['severity']}\n"
                f"Title: {alert['title']}\n"
                f"Message: {alert['message']}\n"
                f"Location: {alert['location']}\n"
                f"Timestamp: {alert['timestamp']}\n\n"
                f"Please log in to the dashboard to review this alert."
            )

            # Only send if severity is high/critical to avoid spamming
            if alert["severity"] in ["high", "critical"] and recipients:
                success = cls._send_email(subject, body, recipients)
            else:
                success = True  # We consider it "delivered" (ignored) for low-severity or no-recipients

            # Log the dispatch so we don't send it again
            dispatch_record = AlertDispatch(
                alert_id=alert["id"],
                alert_type=alert["type"],
                recipient=settings.ALERT_EMAIL_RECIPIENTS,
                success=success,
                error_detail="SMTP not configured" if not recipients and alert["severity"] in ["high", "critical"] else None
            )
            db.add(dispatch_record)

        db.commit()

    @classmethod
    def run_worker_task(cls) -> None:
        """Synchronous wrapper to run the worker in a background thread."""
        db = SessionLocal()
        try:
            cls.dispatch_pending_alerts(db)
        finally:
            db.close()
