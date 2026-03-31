import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import { parseInboundEmail, sendEmail } from '@/lib/messaging/email';
import { getRunner, getMemoryContext } from '@/lib/agents/runner';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/webhooks/email
 * Handles incoming emails via SendGrid Inbound Parse.
 */
export async function POST(request: NextRequest) {
  let senderEmail = '';

  try {
    const formData = await request.formData();
    const email = parseInboundEmail(formData);

    if (!email || !email.body) {
      return NextResponse.json({ status: 'ok' });
    }

    senderEmail = email.from;

    // Rate limit: 20 emails per minute per sender
    const rl = checkRateLimit(`email:${senderEmail}`, 20, 60_000);
    if (!rl.allowed) {
      await sendEmail(senderEmail, 'Slow down!', "You're sending emails too quickly. Please wait a moment and try again.");
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Resolve user by their email address
    const user = await resolveUser('email', senderEmail);

    if (!user) {
      console.log(`[email] Unknown sender: ${senderEmail}`);
      await sendEmail(
        senderEmail,
        "Hey from Lloyd!",
        "I don't recognize this email address yet. Sign up at heylloyd.co to get started!"
      );
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Fetch user memory context
    const memoryCtx = await getMemoryContext(user.userId);

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
      extraContext: `[Channel: Email]${memoryCtx || ''}`,
    });

    // Reply via SendGrid
    if (result.output) {
      const replySubject = email.subject?.startsWith('Re:')
        ? email.subject
        : `Re: ${email.subject || 'Your message'}`;
      await sendEmail(senderEmail, replySubject, result.output);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[email] Webhook error:', error);

    if (senderEmail) {
      try {
        await sendEmail(
          senderEmail,
          'Oops!',
          "Sorry, I had trouble processing your email. Please try again in a moment."
        );
      } catch {
        // Don't let error reply fail the response
      }
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
