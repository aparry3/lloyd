import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import { validateTwilioSignature, parseTwilioBody, sendSms } from '@/lib/messaging/twilio';
import { getRunner } from '@/lib/agents/runner';
import { normalizePhone } from '@lloyd/shared';

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
      // Unknown sender — could add auto-signup later
      console.log(`[twilio] Unknown sender: ${from}`);
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Invoke the agent
    const runner = getRunner();
    const result = await runner.invoke(user.arAgentId, body, {
      sessionId: user.arSessionId,
      toolContext: {
        userId: user.userId,
        userName: user.name,
        channel: 'sms',
      },
    });

    // Send the response back via SMS
    if (result.output) {
      await sendSms(from, result.output);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[twilio] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
