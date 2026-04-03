import logging
from typing import Optional
from config.env import get_settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.resend_api_key
        self.sender = "founder@omniacreata.com"  # Updated to user domain
        
        if self.api_key:
            try:
                import resend
                resend.api_key = self.api_key
                self.client = resend
                self.is_enabled = True
            except ImportError:
                logger.warning("Resend package not installed. Emails won't be sent.")
                self.is_enabled = False
        else:
            logger.info("resend_api_key not configured. Emails will be skipped.")
            self.is_enabled = False

    async def send_welcome_email(self, to_email: str, name: str) -> None:
        """Send a welcome email upon signup."""
        if not self.is_enabled:
            return
            
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to OmniaCreata Studio, {name}!</h2>
            <p>We're thrilled to have you on board. You can now start creating stunning images and exploring unlimited inspiration.</p>
            <p>If you have any questions, just reply to this email.</p>
            <br/>
            <p><strong>The OmniaCreata Team</strong></p>
        </div>
        """
        
        try:
            self.client.Emails.send({
                "from": f"OmniaCreata <{self.sender}>",
                "to": to_email,
                "subject": "Welcome to OmniaCreata Studio",
                "html": html_content
            })
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {e}")

    async def send_subscription_update(self, to_email: str, plan_name: str) -> None:
        """Send an email when subscription changes."""
        if not self.is_enabled:
            return
            
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Subscription has been updated</h2>
            <p>Your workspace is now on the <strong>{plan_name}</strong> plan.</p>
            <p>Your generation limits and monthly credits have been refreshed. Thank you for supporting us!</p>
            <br/>
            <p><strong>The OmniaCreata Team</strong></p>
        </div>
        """
        
        try:
            self.client.Emails.send({
                "from": f"OmniaCreata Billing <{self.sender}>",
                "to": to_email,
                "subject": "OmniaCreata Subscription Update",
                "html": html_content
            })
        except Exception as e:
            logger.error(f"Failed to send subscription update email to {to_email}: {e}")

# Global singleton instance
mailer = EmailService()
