import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import { validateTwilioSignature, parseTwilioBody, sendSms } from '@/lib/messaging/twilio';
import { getRunner, getMemoryContext } from '@/lib/agents/runner';
import { normalizePhone } from '@lloyd/shared';
import { checkRateLimit } from '@/lib/rate-limit';

/** Split a long message into SMS-friendly segments (~1500 chars, break at sentence boundaries) */
function splitMessage(text: string, maxLen = 1500): string[] {
  if (text.length <= maxLen) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      segments.push(remaining);
      break;
    }

    let breakAt = -1;
    const searchWindow = remaining.slice(0, maxLen);

    for (const sep of ['. ', '.\n', '! ', '!\n', '? ', '?\n']) {
      const idx = searchWindow.lastIndexOf(sep);
      if (idx > maxLen * 0.3) {
        breakAt = idx + sep.length;
        break;
      }
    }

    if (breakAt === -1) {
      const nlIdx = searchWindow.lastIndexOf('\n');
      if (nlIdx > maxLen * 0.3) breakAt = nlIdx + 1;
    }

    if (breakAt === -1) {
      const spIdx = searchWindow.lastIndexOf(' ');
      if (spIdx > maxLen * 0.3) breakAt = spIdx + 1;
    }

    if (breakAt === -1) breakAt = maxLen;

    segments.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }

  return segments;
}

/**
 * POST /api/webhooks/twilio
 * Handles incoming SMS/RCS messages from Twilio.
 */
export async function POST(request: NextRequest) {
  let from = '';

  try {
    const formData = await request.formData();
    const params = parseTwilioBody(formData);

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature') || '';
      const url = `${process.env.BASE_URL}/api/webhooks/twilio`;
      if (!validateTwilioSignature(url, params, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    from = normalizePhone(params.From || '');
    const body = params.Body || '';

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing From or Body' }, { status: 400 });
    }

    // Handle STOP/HELP keywords (Twilio compliance)
    const normalized = body.trim().toUpperCase();
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(normalized)) {
      // Twilio auto-handles STOP at platform level, but we acknowledge it
      // and disable any recurring schedules for this user
      const user = await resolveUser('sms', from);
      if (user) {
        const db = (await import('@lloyd/shared/server')).getDb();
        await db
          .updateTable('lloyd_recurring_schedules')
          .set({ enabled: false, updated_at: new Date() })
          .where('user_id', '=', user.userId)
          .execute();
      }
      // Don't send a reply — Twilio sends its own STOP confirmation
      return NextResponse.json({ status: 'opt_out' });
    }

    if (['HELP', 'INFO'].includes(normalized)) {
      await sendSms(
        from,
        'Lloyd — your personal assistant. Text anything to chat. Reply STOP to opt out. For support, visit heylloyd.co or email support@heylloyd.co. Msg & data rates may apply.'
      );
      return NextResponse.json({ status: 'help' });
    }

    if (normalized === 'START') {
      // Re-enable messaging after STOP
      await sendSms(from, "Welcome back! You've been re-subscribed to Lloyd. Text anything to get started.");
      return NextResponse.json({ status: 'opt_in' });
    }

    // Rate limit: 10 messages per minute per phone number
    const rl = checkRateLimit(`sms:${from}`, 10, 60_000);
    if (!rl.allowed) {
      await sendSms(from, "You're sending messages too quickly. Please wait a moment and try again.");
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Resolve the sender to a user
    const user = await resolveUser('sms', from);
    if (!user) {
      console.log(`[twilio] Unknown sender: ${from}`);
      await sendSms(from, "Hey! I don't recognize this number yet. Sign up at heylloyd.co to get started.");
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Fetch user memory context
    const memoryCtx = await getMemoryContext(user.userId);

    // Invoke the agent with memory context
    const runner = getRunner();
    const result = await runner.invoke(user.arAgentId, body, {
      sessionId: user.arSessionId,
      toolContext: {
        userId: user.userId,
        userName: user.name,
        channel: 'sms',
      },
      extraContext: `[Channel: SMS]${memoryCtx || ''}`,
    });

    // Send the response back via SMS (split long messages)
    if (result.output) {
      const segments = splitMessage(result.output);
      for (const segment of segments) {
        await sendSms(from, segment);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[twilio] Webhook error:', error);

    // Send a user-friendly error message if we have the sender's number
    if (from) {
      try {
        await sendSms(from, "Sorry, I hit a snag processing your message. Please try again in a moment.");
      } catch {
        // Don't let the error reply itself fail the response
      }
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
