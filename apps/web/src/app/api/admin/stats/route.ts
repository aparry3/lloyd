import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';

/**
 * GET /api/admin/stats
 * Returns dashboard stats: user count, conversation count, memory count, recent activity.
 * Protected by ADMIN_SECRET header.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // User count
  const userCount = await db
    .selectFrom('lloyd_users')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirstOrThrow();

  // Conversation count
  const conversationCount = await db
    .selectFrom('lloyd_conversations')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirstOrThrow();

  // Memory count
  const memoryCount = await db
    .selectFrom('lloyd_user_memories')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirstOrThrow();

  // Recent users (last 20)
  const recentUsers = await db
    .selectFrom('lloyd_users')
    .select(['id', 'name', 'email', 'phone', 'preferred_channel', 'created_at'])
    .orderBy('created_at', 'desc')
    .limit(20)
    .execute();

  // Recent conversations with user names
  const recentConversations = await db
    .selectFrom('lloyd_conversations')
    .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_conversations.user_id')
    .select([
      'lloyd_conversations.id',
      'lloyd_users.name as userName',
      'lloyd_conversations.channel',
      'lloyd_conversations.last_message_at',
    ])
    .orderBy('lloyd_conversations.last_message_at', 'desc')
    .limit(20)
    .execute();

  // Memory stats per user (top 10 by memory count)
  const memoryStats = await db
    .selectFrom('lloyd_user_memories')
    .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_user_memories.user_id')
    .select([
      'lloyd_users.name',
      db.fn.count('lloyd_user_memories.id').as('memoryCount'),
    ])
    .groupBy(['lloyd_users.id', 'lloyd_users.name'])
    .orderBy(db.fn.count('lloyd_user_memories.id'), 'desc')
    .limit(10)
    .execute();

  // Reminder stats
  let reminderStats = { pending: 0, delivered: 0, total: 0 };
  try {
    const pending = await db
      .selectFrom('lloyd_reminders')
      .select(db.fn.count('id').as('count'))
      .where('status', '=', 'pending')
      .executeTakeFirstOrThrow();
    const delivered = await db
      .selectFrom('lloyd_reminders')
      .select(db.fn.count('id').as('count'))
      .where('status', '=', 'delivered')
      .executeTakeFirstOrThrow();
    const total = await db
      .selectFrom('lloyd_reminders')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirstOrThrow();
    reminderStats = {
      pending: Number(pending.count),
      delivered: Number(delivered.count),
      total: Number(total.count),
    };
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({
    totals: {
      users: Number(userCount.count),
      conversations: Number(conversationCount.count),
      memories: Number(memoryCount.count),
      reminders: reminderStats,
    },
    recentUsers,
    recentConversations,
    memoryStats,
  });
}
