import logging
from pathlib import Path
from typing import Any, Protocol

from jinja2 import Environment, FileSystemLoader

from app.config import settings

logger = logging.getLogger(__name__)

# Setup Jinja2 templates environment
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)


class EmailProvider(Protocol):
    """Protocol for sending transactional emails."""

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str | None = None,
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""
        ...


class ResendEmailProvider:
    """Production email provider wrapping Resend SDK."""

    def __init__(self, api_key: str | None = None, default_from: str | None = None):
        self.api_key = api_key or settings.RESEND_API_KEY
        self.default_from = default_from or settings.RESEND_FROM_EMAIL

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str | None = None,
    ) -> bool:
        sender = from_email or self.default_from
        api_key = self.api_key

        if not api_key:
            logger.warning(
                "RESEND_API_KEY not configured. Simulating email send to %s (subject: '%s')",
                to_email,
                subject,
            )
            return True

        try:
            import resend

            resend.api_key = api_key
            params = {
                "from": sender,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            resend.Emails.send(params)
            logger.info("Successfully sent email to %s via Resend (Subject: '%s')", to_email, subject)
            return True
        except Exception as e:
            logger.error("Failed to send email to %s via Resend: %s", to_email, e)
            return False


class FakeEmailProvider:
    """Test fake email provider that records calls in memory without network requests."""

    def __init__(self):
        self.sent_emails: list[dict[str, Any]] = []

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str | None = None,
    ) -> bool:
        self.sent_emails.append(
            {
                "to_email": to_email,
                "subject": subject,
                "html_content": html_content,
                "from_email": from_email or settings.RESEND_FROM_EMAIL,
            }
        )
        return True

    def clear(self):
        self.sent_emails.clear()


# Default singleton instance (can be swapped in tests)
_current_provider: EmailProvider = ResendEmailProvider()


def get_email_provider() -> EmailProvider:
    return _current_provider


def set_email_provider(provider: EmailProvider) -> None:
    global _current_provider
    _current_provider = provider


def render_email_template(template_name: str, **context: Any) -> str:
    """Renders a Jinja2 email template with context."""
    template = jinja_env.get_template(template_name)
    return template.render(**context)
