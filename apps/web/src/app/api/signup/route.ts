import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';
import { normalizePhone } from '@lloyd/shared';
import { randomUUID } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendWelcomeMessage } from '@/lib/messaging/welcome';

/**
 * POST /api/signup
 * Creates a new Lloyd user with phone and email channel identifiers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, additionalEmails, smsConsent } = body as {
      name: string;
      email: string;
      phone?: string;
      additionalEmails?: string[];
      smsConsent?: boolean;
    };

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Require explicit SMS consent when a phone number is provided (10DLC compliance)
    if (phone && !smsConsent) {
      return NextResponse.json(
        { error: 'SMS consent is required when providing a phone number' },
        { status: 400 }
      );
    }

    // Rate limit: 5 signups per IP per hour
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`signup:${ip}`, 5, 3600_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signups. Please try again later.' },
        { status: 429 }
      );
    }

    const db = getDb();
    const userId = randomUUID();
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Create the user
    await db
      .insertInto('lloyd_users')
      .values({
        id: userId,
        name,
        email: email.toLowerCase(),
        phone: normalizedPhone,
        preferred_channel: normalizedPhone ? 'sms' : 'email',
        ar_agent_id: 'lloyd-assistant',
      })
      .execute();

    // Create channel identifiers
    const identifiers: Array<{
      id: string;
      user_id: string;
      channel: string;
      identifier: string;
      verified: boolean;
    }> = [];

    // Primary email
    identifiers.push({
      id: randomUUID(),
      user_id: userId,
      channel: 'email',
      identifier: email.toLowerCase(),
      verified: false,
    });

    // Additional forwarding emails
    if (additionalEmails?.length) {
      for (const extra of additionalEmails) {
        identifiers.push({
          id: randomUUID(),
          user_id: userId,
          channel: 'email',
          identifier: extra.toLowerCase(),
          verified: false,
        });
      }
    }

    // Phone → SMS + WhatsApp identifiers
    if (normalizedPhone) {
      identifiers.push({
        id: randomUUID(),
        user_id: userId,
        channel: 'sms',
        identifier: normalizedPhone,
        verified: false,
      });
      identifiers.push({
        id: randomUUID(),
        user_id: userId,
        channel: 'whatsapp',
        identifier: normalizedPhone,
        verified: false,
      });
    }

    if (identifiers.length > 0) {
      await db
        .insertInto('lloyd_channel_identifiers')
        .values(identifiers)
        .execute();
    }

    // Send welcome message (best-effort, don't block response)
    sendWelcomeMessage({
      name,
      phone: normalizedPhone,
      email: email.toLowerCase(),
      preferredChannel: normalizedPhone ? 'sms' : 'email',
    }).catch((err) => console.error('[signup] Welcome message failed:', err));

    return NextResponse.json({
      success: true,
      userId,
      message: `Welcome, ${name}! You can now message Lloyd via ${normalizedPhone ? 'text or ' : ''}email.`,
    });
  } catch (error: any) {
    // Handle unique constraint violations
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'An account with this email or phone already exists' },
        { status: 409 }
      );
    }
    console.error('[signup] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
