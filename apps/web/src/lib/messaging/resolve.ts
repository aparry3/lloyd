import { getDb } from '@lloyd/shared/server';
import { randomUUID } from 'crypto';

export type Channel = 'sms' | 'whatsapp' | 'email' | 'rcs';

export interface ResolvedUser {
  userId: string;
  name: string;
  arAgentId: string;
  /** Unified session ID shared across all channels for this user */
  arSessionId: string;
  conversationId: string;
  channel: Channel;
  timezone: string;
}

/**
 * Generates a stable, unified session ID for a user.
 * All channels share the same session so Lloyd has cross-channel context.
 */
function unifiedSessionId(userId: string): string {
  return `lloyd_user_${userId}`;
}

/**
 * Resolves an incoming message sender to a Lloyd user and conversation.
 * Uses a unified session per user (cross-channel context).
 * If no user/conversation exists, returns null (unknown sender).
 */
export async function resolveUser(
  channel: Channel,
  identifier: string
): Promise<ResolvedUser | null> {
  const db = getDb();

  // Look up the channel identifier
  const ci = await db
    .selectFrom('lloyd_channel_identifiers')
    .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_channel_identifiers.user_id')
    .select([
      'lloyd_users.id as userId',
      'lloyd_users.name',
      'lloyd_users.ar_agent_id as arAgentId',
      'lloyd_users.timezone',
    ])
    .where('lloyd_channel_identifiers.channel', '=', channel)
    .where('lloyd_channel_identifiers.identifier', '=', identifier)
    .executeTakeFirst();

  if (!ci) return null;

  // Unified session ID — same across all channels for this user
  const arSessionId = unifiedSessionId(ci.userId);

  // Find or create a conversation record for this user + channel
  // (Conversations track per-channel metadata; the ar_session_id is shared)
  let conversation = await db
    .selectFrom('lloyd_conversations')
    .select(['id', 'ar_session_id'])
    .where('user_id', '=', ci.userId)
    .where('channel', '=', channel)
    .orderBy('last_message_at', 'desc')
    .executeTakeFirst();

  if (!conversation) {
    const newId = randomUUID();

    await db
      .insertInto('lloyd_conversations')
      .values({
        id: newId,
        user_id: ci.userId,
        channel,
        ar_session_id: arSessionId,
      })
      .execute();

    conversation = { id: newId, ar_session_id: arSessionId };
  } else {
    // Migrate old per-channel sessions to unified session + update timestamp
    const updates: Record<string, any> = { last_message_at: new Date() };
    if (conversation.ar_session_id !== arSessionId) {
      updates.ar_session_id = arSessionId;
    }

    await db
      .updateTable('lloyd_conversations')
      .set(updates)
      .where('id', '=', conversation.id)
      .execute();
  }

  return {
    userId: ci.userId,
    name: ci.name,
    arAgentId: ci.arAgentId,
    arSessionId,
    conversationId: conversation.id,
    channel,
    timezone: ci.timezone || 'America/New_York',
  };
}
