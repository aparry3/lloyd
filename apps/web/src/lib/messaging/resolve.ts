import { getDb } from '@lloyd/shared/server';
import { randomUUID } from 'crypto';

export type Channel = 'sms' | 'whatsapp' | 'email' | 'rcs';

export interface ResolvedUser {
  userId: string;
  name: string;
  arAgentId: string;
  arSessionId: string;
  conversationId: string;
}

/**
 * Resolves an incoming message sender to a Lloyd user and conversation.
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
    ])
    .where('lloyd_channel_identifiers.channel', '=', channel)
    .where('lloyd_channel_identifiers.identifier', '=', identifier)
    .executeTakeFirst();

  if (!ci) return null;

  // Find or create a conversation for this user + channel
  let conversation = await db
    .selectFrom('lloyd_conversations')
    .select(['id', 'ar_session_id'])
    .where('user_id', '=', ci.userId)
    .where('channel', '=', channel)
    .orderBy('last_message_at', 'desc')
    .executeTakeFirst();

  if (!conversation) {
    const newId = randomUUID();
    const arSessionId = `lloyd_${ci.userId}_${channel}_${Date.now()}`;

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
    // Update last_message_at
    await db
      .updateTable('lloyd_conversations')
      .set({ last_message_at: new Date() })
      .where('id', '=', conversation.id)
      .execute();
  }

  return {
    userId: ci.userId,
    name: ci.name,
    arAgentId: ci.arAgentId,
    arSessionId: conversation.ar_session_id,
    conversationId: conversation.id,
  };
}
