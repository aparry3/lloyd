import { defineTool } from '@agent-runner/core';
import { getDb } from '@lloyd/shared/server';
import { z } from 'zod';

const setReminderInput = z.object({
  content: z.string().describe('What to remind the user about'),
  scheduledAt: z
    .string()
    .describe(
      'ISO 8601 datetime for when to send the reminder (e.g., "2026-04-01T09:00:00-04:00"). Use get_current_time first to know the current time, then calculate the target time.'
    ),
  timezone: z
    .string()
    .default('America/New_York')
    .describe("User's timezone (e.g., America/New_York, America/Los_Angeles)"),
});

const listRemindersInput = z.object({
  status: z
    .enum(['pending', 'sent', 'cancelled', 'all'])
    .default('pending')
    .describe('Filter by status'),
  limit: z.number().min(1).max(20).default(10).describe('Max results'),
});

const cancelReminderInput = z.object({
  content: z
    .string()
    .describe('Partial match of the reminder content to cancel'),
});

/**
 * Tool: set a reminder for the user.
 */
export const setReminder = defineTool({
  name: 'set_reminder',
  description:
    'Set a reminder for the user. They\'ll get a message at the specified time. Use get_current_time first to know "now", then calculate the right datetime. Support natural language like "tomorrow at 9am", "in 2 hours", "next Monday at noon".',
  input: setReminderInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content, scheduledAt, timezone } = input as z.infer<typeof setReminderInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return { error: 'Invalid date. Use ISO 8601 format.' };
    }

    if (scheduledDate.getTime() < Date.now()) {
      return { error: 'Cannot set a reminder in the past.' };
    }

    const db = getDb();
    const result = await db
      .insertInto('lloyd_reminders')
      .values({
        user_id: userId,
        content,
        scheduled_at: scheduledDate,
        timezone,
        channel: (ctx as any).channel || null,
      })
      .returning(['id', 'scheduled_at'])
      .executeTakeFirstOrThrow();

    return {
      set: true,
      id: result.id,
      content,
      scheduledAt: result.scheduled_at,
      timezone,
    };
  },
});

/**
 * Tool: list the user's reminders.
 */
export const listReminders = defineTool({
  name: 'list_reminders',
  description: "List the user's reminders. Shows pending reminders by default.",
  input: listRemindersInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { status, limit } = input as z.infer<typeof listRemindersInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { reminders: [] };

    const db = getDb();
    let query = db
      .selectFrom('lloyd_reminders')
      .select(['content', 'scheduled_at', 'status', 'timezone', 'created_at'])
      .where('user_id', '=', userId)
      .orderBy('scheduled_at', 'asc')
      .limit(limit);

    if (status !== 'all') {
      query = query.where('status', '=', status);
    }

    const reminders = await query.execute();
    return { reminders };
  },
});

/**
 * Tool: cancel a pending reminder.
 */
export const cancelReminder = defineTool({
  name: 'cancel_reminder',
  description: 'Cancel a pending reminder by matching its content (partial match).',
  input: cancelReminderInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content } = input as z.infer<typeof cancelReminderInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    const result = await db
      .updateTable('lloyd_reminders')
      .set({ status: 'cancelled' })
      .where('user_id', '=', userId)
      .where('status', '=', 'pending')
      .where('content', 'ilike', `%${content}%`)
      .executeTakeFirst();

    const count = Number(result.numUpdatedRows ?? 0);
    return { cancelled: count, searchTerm: content };
  },
});
