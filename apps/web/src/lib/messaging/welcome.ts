import { sendSms } from './twilio';
import { sendEmail } from './email';

/**
 * Send a welcome message to a newly signed up user.
 * Reaches out via their preferred channel so they know Lloyd is ready.
 */
export async function sendWelcomeMessage(user: {
  name: string;
  phone: string | null;
  email: string;
  preferredChannel: string;
}): Promise<void> {
  const firstName = user.name.split(' ')[0] || user.name;

  const smsWelcome = `Hey ${firstName}! 👋 I'm Lloyd, your personal assistant. You can text me anytime — questions, reminders, brainstorming, whatever you need. I'll remember things about you across our conversations so I get more helpful over time. Try me out!`;

  const emailWelcome = `Hey ${firstName}! 👋

I'm Lloyd, your personal assistant. You can reach me right here via email — just reply to this message anytime.

I can help with:
• Questions and research
• Reminders and planning
• Writing and editing
• Brainstorming ideas
• Quick calculations

I'll remember things about you across our conversations, so I get more helpful over time.

Try me out — just reply with anything!

— Lloyd`;

  try {
    // Send via preferred channel first
    if (user.preferredChannel === 'sms' && user.phone) {
      await sendSms(user.phone, smsWelcome);
    } else {
      await sendEmail(user.email, "Hey! I'm Lloyd 👋", emailWelcome);
    }
  } catch (error) {
    // Welcome message is best-effort — don't fail signup if it doesn't send
    console.error('[welcome] Failed to send welcome message:', error);
  }
}
