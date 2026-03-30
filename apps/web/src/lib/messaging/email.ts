/**
 * Send an email reply via SendGrid Mail Send API.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || `lloyd@${process.env.SENDGRID_INBOUND_DOMAIN}`;

  if (!apiKey) throw new Error('SENDGRID_API_KEY required');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'Lloyd' },
      subject: subject || 'Re: Your message',
      content: [{ type: 'text/plain', value: body }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${err}`);
  }
}

/**
 * Parse a SendGrid Inbound Parse webhook (multipart/form-data).
 */
export function parseInboundEmail(formData: FormData): {
  from: string;
  to: string;
  subject: string;
  body: string;
} | null {
  try {
    const from = String(formData.get('from') || '');
    const to = String(formData.get('to') || '');
    const subject = String(formData.get('subject') || '');
    // Prefer plain text over HTML
    const text = String(formData.get('text') || '');
    const html = String(formData.get('html') || '');

    // Extract email address from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/) || [null, from.trim()];
    const fromEmail = emailMatch[1] || from;

    if (!fromEmail) return null;

    return {
      from: fromEmail.toLowerCase(),
      to: to.toLowerCase(),
      subject,
      body: text || html.replace(/<[^>]*>/g, ' ').trim(),
    };
  } catch {
    return null;
  }
}
