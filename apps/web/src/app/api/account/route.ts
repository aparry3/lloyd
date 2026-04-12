import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';
import { normalizePhone } from '@lloyd/shared';
import { randomUUID } from 'crypto';
import { isValidTimezone } from '@/lib/timezone';

/**
 * GET /api/account?email=xxx or ?phone=xxx
 * Look up a user by email or phone and return their account details.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.toLowerCase();
  const phone = searchParams.get('phone');

  if (!email && !phone) {
    return NextResponse.json(
      { error: 'Provide email or phone to look up your account' },
      { status: 400 }
    );
  }

  const db = getDb();

  try {
    let user;

    if (email) {
      // Look up by email in channel_identifiers
      const identifier = await db
        .selectFrom('lloyd_channel_identifiers')
        .where('channel', '=', 'email')
        .where('identifier', '=', email)
        .select('user_id')
        .executeTakeFirst();

      if (identifier) {
        user = await db
          .selectFrom('lloyd_users')
          .where('id', '=', identifier.user_id)
          .selectAll()
          .executeTakeFirst();
      }
    } else if (phone) {
      const normalized = normalizePhone(phone);
      user = await db
        .selectFrom('lloyd_users')
        .where('phone', '=', normalized)
        .selectAll()
        .executeTakeFirst();
    }

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get all channel identifiers for this user
    const identifiers = await db
      .selectFrom('lloyd_channel_identifiers')
      .where('user_id', '=', user.id)
      .selectAll()
      .execute();

    const emails = identifiers
      .filter((i) => i.channel === 'email')
      .map((i) => i.identifier);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emails,
      preferredChannel: user.preferred_channel,
      timezone: user.timezone || 'America/New_York',
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('[account] GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PUT /api/account
 * Update user account: add/remove emails, change phone, update name.
 * Requires userId in the body (no auth system yet — this is a first pass).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone, timezone, addEmails, removeEmails } = body as {
      userId: string;
      name?: string;
      phone?: string | null;
      timezone?: string;
      addEmails?: string[];
      removeEmails?: string[];
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify user exists
    const user = await db
      .selectFrom('lloyd_users')
      .where('id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Update user fields
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (name) updates.name = name;
    if (timezone) {
      if (!isValidTimezone(timezone)) {
        return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
      }
      updates.timezone = timezone;
    }

    let normalizedPhone: string | null = null;
    if (phone !== undefined) {
      normalizedPhone = phone ? normalizePhone(phone) : null;
      updates.phone = normalizedPhone;
      updates.preferred_channel = normalizedPhone ? 'sms' : 'email';
    }

    await db
      .updateTable('lloyd_users')
      .set(updates)
      .where('id', '=', userId)
      .execute();

    // Add new email identifiers
    if (addEmails?.length) {
      for (const email of addEmails) {
        const normalized = email.toLowerCase();
        // Check for duplicates
        const existing = await db
          .selectFrom('lloyd_channel_identifiers')
          .where('channel', '=', 'email')
          .where('identifier', '=', normalized)
          .executeTakeFirst();

        if (!existing) {
          await db
            .insertInto('lloyd_channel_identifiers')
            .values({
              id: randomUUID(),
              user_id: userId,
              channel: 'email',
              identifier: normalized,
              verified: false,
            })
            .execute();
        }
      }
    }

    // Remove email identifiers
    if (removeEmails?.length) {
      // Don't allow removing the last email
      const currentEmails = await db
        .selectFrom('lloyd_channel_identifiers')
        .where('user_id', '=', userId)
        .where('channel', '=', 'email')
        .select('identifier')
        .execute();

      const remaining = currentEmails.filter(
        (e) => !removeEmails.includes(e.identifier)
      );

      if (remaining.length === 0) {
        return NextResponse.json(
          { error: 'Cannot remove all emails. Keep at least one.' },
          { status: 400 }
        );
      }

      for (const email of removeEmails) {
        await db
          .deleteFrom('lloyd_channel_identifiers')
          .where('user_id', '=', userId)
          .where('channel', '=', 'email')
          .where('identifier', '=', email.toLowerCase())
          .execute();
      }

      // Update primary email on user record if it was removed
      if (removeEmails.includes(user.email)) {
        await db
          .updateTable('lloyd_users')
          .set({ email: remaining[0].identifier })
          .where('id', '=', userId)
          .execute();
      }
    }

    // Update phone-based identifiers if phone changed
    if (phone !== undefined) {
      // Remove old SMS/WhatsApp identifiers
      await db
        .deleteFrom('lloyd_channel_identifiers')
        .where('user_id', '=', userId)
        .where('channel', 'in', ['sms', 'whatsapp'])
        .execute();

      // Add new ones if phone is set
      if (normalizedPhone) {
        await db
          .insertInto('lloyd_channel_identifiers')
          .values([
            {
              id: randomUUID(),
              user_id: userId,
              channel: 'sms',
              identifier: normalizedPhone,
              verified: false,
            },
            {
              id: randomUUID(),
              user_id: userId,
              channel: 'whatsapp',
              identifier: normalizedPhone,
              verified: false,
            },
          ])
          .execute();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'That email or phone is already in use by another account' },
        { status: 409 }
      );
    }
    console.error('[account] PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
