import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/twilio
 * Handles incoming SMS/RCS messages from Twilio
 */
export async function POST(request: NextRequest) {
  // TODO: Validate Twilio signature
  // TODO: Parse incoming message
  // TODO: Route to agent-runner
  // TODO: Send response back via Twilio

  return NextResponse.json({ status: 'ok' });
}
