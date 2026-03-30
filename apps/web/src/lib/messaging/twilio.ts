import twilio from 'twilio';

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required');
    _client = twilio(sid, token);
  }
  return _client;
}

/**
 * Validate an incoming Twilio webhook request signature.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  return twilio.validateRequest(token, signature, url, params);
}

/**
 * Send an SMS reply via Twilio REST API.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const client = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('TWILIO_PHONE_NUMBER required');

  await client.messages.create({
    to,
    from,
    body,
  });
}

/**
 * Parse form-encoded Twilio webhook body into a record.
 */
export function parseTwilioBody(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}
