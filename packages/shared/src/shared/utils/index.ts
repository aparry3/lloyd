/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/**
 * Detect channel from incoming identifier
 */
export function detectChannel(from: string): 'sms' | 'whatsapp' | 'email' {
  if (from.includes('@')) return 'email';
  if (from.startsWith('whatsapp:')) return 'whatsapp';
  return 'sms';
}
