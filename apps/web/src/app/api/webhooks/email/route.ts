import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/email
 * Handles incoming emails via SendGrid Inbound Parse
 */
export async function POST(request: NextRequest) {
  // TODO: Validate SendGrid webhook
  // TODO: Parse inbound email (from, to, subject, text/html, attachments)
  // TODO: Resolve user + conversation via channel_identifiers
  // TODO: runner.invoke(user.arAgentId, emailBody, { sessionId: conversation.arSessionId, toolContext: { userId, channel: "email" } })
  // TODO: Send result.output back via SendGrid Mail Send API

  return NextResponse.json({ status: 'ok' });
}
