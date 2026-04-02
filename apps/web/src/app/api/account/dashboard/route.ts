import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';

/**
 * GET /api/account/dashboard?email=user@example.com
 * Returns the user's todos, upcoming reminders, and recurring schedules.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const db = getDb();

  // Find user by email
  const ci = await db
    .selectFrom('lloyd_channel_identifiers')
    .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_channel_identifiers.user_id')
    .select(['lloyd_users.id as userId'])
    .where('lloyd_channel_identifiers.channel', '=', 'email')
    .where('lloyd_channel_identifiers.identifier', '=', email)
    .executeTakeFirst();

  if (!ci) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = ci.userId;

  // Fetch todos (active, up to 50)
  const todos = await db
    .selectFrom('lloyd_todos')
    .select(['id', 'content', 'category', 'priority', 'completed', 'due_date', 'created_at'])
    .where('user_id', '=', userId)
    .where('completed', '=', false)
    .orderBy('priority', 'desc')
    .orderBy('created_at', 'desc')
    .limit(50)
    .execute();

  // Fetch upcoming reminders (pending)
  const reminders = await db
    .selectFrom('lloyd_reminders')
    .select(['id', 'content', 'scheduled_at', 'timezone', 'status'])
    .where('user_id', '=', userId)
    .where('status', '=', 'pending')
    .orderBy('scheduled_at', 'asc')
    .limit(20)
    .execute();

  // Fetch recurring schedules (enabled)
  const schedules = await db
    .selectFrom('lloyd_recurring_schedules')
    .select([
      'id', 'description', 'frequency', 'time_of_day', 'timezone',
      'days_of_week', 'day_of_month', 'dynamic', 'enabled',
      'next_scheduled', 'last_sent_at',
    ])
    .where('user_id', '=', userId)
    .where('enabled', '=', true)
    .orderBy('created_at', 'asc')
    .limit(20)
    .execute();

  return NextResponse.json({ todos, reminders, schedules });
}
