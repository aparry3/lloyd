import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/email
 * Handles incoming emails via SendGrid Inbound Parse
 */
export async function POST(request: NextRequest) {
  // TODO: Validate SendGrid webhook
  // TODO: Parse inbound email (from, subject, body)
  // TODO: Route to agent-runner
  // TODO: Send response back via SendGrid

  return NextResponse.json({ status: 'ok' });
}
