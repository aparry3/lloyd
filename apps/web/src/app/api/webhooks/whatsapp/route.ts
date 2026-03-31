import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/messaging/resolve';
import {
  validateWhatsAppSignature,
  extractWhatsAppMessage,
  sendWhatsApp,
} from '@/lib/messaging/whatsapp';
import { getRunner, getMemoryContext } from '@/lib/agents/runner';
import { normalizePhone } from '@lloyd/shared';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/webhooks/whatsapp
 * WhatsApp webhook verification (subscribe handshake).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Handles incoming WhatsApp messages via Cloud API.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Validate signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-hub-signature-256') || '';
      if (!validateWhatsAppSignature(rawBody, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(rawBody);
    const message = extractWhatsAppMessage(payload);

    if (!message) {
      // Not a text message or status update — acknowledge and move on
      return NextResponse.json({ status: 'ok' });
    }

    const phone = normalizePhone(message.from);

    // Rate limit: 10 messages per minute per phone
    const rl = checkRateLimit(`wa:${phone}`, 10, 60_000);
    if (!rl.allowed) {
      await sendWhatsApp(phone, "You're sending messages too quickly. Please wait a moment and try again.");
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const user = await resolveUser('whatsapp', phone);

    if (!user) {
      console.log(`[whatsapp] Unknown sender: ${phone}`);
      await sendWhatsApp(phone, "Hey! I don't recognize this number. Sign up at heylloyd.co to get started.");
      return NextResponse.json({ status: 'unknown_sender' });
    }

    // Fetch user memory context
    const memoryCtx = await getMemoryContext(user.userId);

    // Invoke the agent
    const runner = getRunner();
    const result = await runner.invoke(user.arAgentId, message.body, {
      sessionId: user.arSessionId,
      toolContext: {
        userId: user.userId,
        userName: user.name,
        channel: 'whatsapp',
      },
      extraContext: `[Channel: WhatsApp]${memoryCtx || ''}`,
    });

    // Reply via WhatsApp Cloud API
    if (result.output) {
      await sendWhatsApp(phone, result.output);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[whatsapp] Webhook error:', error);
    // WhatsApp doesn't easily let us send error replies without the phone parsed,
    // so just log and return 500
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
