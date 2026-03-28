import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/webhooks/whatsapp
 * WhatsApp webhook verification
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
 * Handles incoming WhatsApp messages via Cloud API
 */
export async function POST(request: NextRequest) {
  // TODO: Validate webhook signature
  // TODO: Parse incoming message
  // TODO: Route to agent-runner
  // TODO: Send response back via WhatsApp Cloud API

  return NextResponse.json({ status: 'ok' });
}
