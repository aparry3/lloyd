import { createHmac } from 'crypto';

/**
 * Validate WhatsApp Cloud API webhook signature.
 */
export function validateWhatsAppSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return `sha256=${expected}` === signature;
}

/**
 * Extract the first text message from a WhatsApp webhook payload.
 */
export function extractWhatsAppMessage(payload: any): {
  from: string;
  body: string;
  messageId: string;
  phoneNumberId: string;
} | null {
  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return null;

    return {
      from: message.from,         // sender's phone number
      body: message.text?.body || '',
      messageId: message.id,
      phoneNumberId: value.metadata?.phone_number_id,
    };
  } catch {
    return null;
  }
}

/**
 * Send a WhatsApp text reply via Cloud API.
 */
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!phoneNumberId || !token) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN required');
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} ${err}`);
  }
}
