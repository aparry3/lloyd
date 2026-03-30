import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import { parseInboundEmail, sendEmail } from '@/lib/messaging/email';
import { getRunner } from '@/lib/agents/runner';

/**
 * POST /api/webhooks/email
 * Handles incoming emails via SendGrid Inbound Parse.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = parseInboundEmail(formData);

    if (!email || !email.body) {
      return NextResponse.json({ status: 'ok' });
    }

    // Resolve user by their email address
    const user = await resolveUser('email', email.from);

    if (!user) {
      console.log(`[email] Unknown sender: ${email.from}`);
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Invoke the agent — include subject for context
    const runner = getRunner();
    const messageText = email.subject
      ? `Subject: ${email.subject}\n\n${email.body}`
      : email.body;

    const result = await runner.invoke(user.arAgentId, messageText, {
      sessionId: user.arSessionId,
      toolContext: {
        userId: user.userId,
        userName: user.name,
        channel: 'email',
      },
    });

    // Reply via SendGrid
    if (result.output) {
      const replySubject = email.subject?.startsWith('Re:')
        ? email.subject
        : `Re: ${email.subject || 'Your message'}`;
      await sendEmail(email.from, replySubject, result.output);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[email] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
