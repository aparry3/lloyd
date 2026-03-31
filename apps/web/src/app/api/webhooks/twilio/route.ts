import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import { validateTwilioSignature, parseTwilioBody, sendSms } from '@/lib/messaging/twilio';
import { getRunner, getMemoryContext } from '@/lib/agents/runner';
import { normalizePhone } from '@lloyd/shared';

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

    // Find a good break point (sentence end, then newline, then space)
    let breakAt = -1;
    const searchWindow = remaining.slice(0, maxLen);

    // Prefer breaking at sentence boundaries
    for (const sep of ['. ', '.\n', '! ', '!\n', '? ', '?\n']) {
      const idx = searchWindow.lastIndexOf(sep);
      if (idx > maxLen * 0.3) {
        breakAt = idx + sep.length;
        break;
      }
    }

    // Fall back to newline
    if (breakAt === -1) {
      const nlIdx = searchWindow.lastIndexOf('\n');
      if (nlIdx > maxLen * 0.3) breakAt = nlIdx + 1;
    }

    // Fall back to space
    if (breakAt === -1) {
      const spIdx = searchWindow.lastIndexOf(' ');
      if (spIdx > maxLen * 0.3) breakAt = spIdx + 1;
    }

    // Hard break as last resort
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

    const from = normalizePhone(params.From || '');
    const body = params.Body || '';

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing From or Body' }, { status: 400 });
    }

    // Resolve the sender to a user
    const user = await resolveUser('sms', from);
    if (!user) {
      console.log(`[twilio] Unknown sender: ${from}`);
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Fetch user memory context
    const memoryCtx = await getMemoryContext(user.userId);

    // Invoke the agent with memory context appended
    const runner = getRunner();
    const result = await runner.invoke(user.arAgentId, body, {
      sessionId: user.arSessionId,
      toolContext: {
        userId: user.userId,
        userName: user.name,
        channel: 'sms',
      },
      ...(memoryCtx ? { extraContext: memoryCtx } : {}),
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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
