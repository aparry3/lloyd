import { Kysely, PostgresDialect, Generated } from 'kysely';
import pg from 'pg';

// Lloyd's own tables (not agent-runner's ar_* tables)
// Generated<T> marks columns with DEFAULT — optional on insert
export interface LloydUserTable {
  id: Generated<string>;
  name: string;
  email: string;
  phone: string | null;
  preferred_channel: string;
  ar_agent_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LloydChannelIdentifierTable {
  id: Generated<string>;
  user_id: string;
  channel: string;
  identifier: string;
  verified: Generated<boolean>;
  created_at: Generated<Date>;
}

export interface LloydConversationTable {
  id: Generated<string>;
  user_id: string;
  channel: string;
  ar_session_id: string;
  started_at: Generated<Date>;
  last_message_at: Generated<Date>;
}

export interface LloydUserMemoryTable {
  id: Generated<string>;
  user_id: string;
  content: string;
  category: string;
  importance: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface LloydReminderTable {
  id: Generated<string>;
  user_id: string;
  content: string;
  scheduled_at: Date;
  timezone: Generated<string>;
  channel: string | null;
  status: Generated<string>;
  sent_at: Date | null;
  created_at: Generated<Date>;
}

export interface LloydRecurringScheduleTable {
  id: Generated<string>;
  user_id: string;
  description: string;
  content: string;
  frequency: string;
  time_of_day: string;         // TIME stored as string in Kysely
  timezone: Generated<string>;
  days_of_week: number[] | null;
  day_of_month: number | null;
  channel: string | null;
  dynamic: Generated<boolean>;
  enabled: Generated<boolean>;
  last_sent_at: Date | null;
  next_scheduled: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  lloyd_users: LloydUserTable;
  lloyd_channel_identifiers: LloydChannelIdentifierTable;
  lloyd_conversations: LloydConversationTable;
  lloyd_user_memories: LloydUserMemoryTable;
  lloyd_reminders: LloydReminderTable;
  lloyd_recurring_schedules: LloydRecurringScheduleTable;
}

let _db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          max: 10,
          idleTimeoutMillis: 30_000,
        }),
      }),
    });
  }
  return _db;
}
