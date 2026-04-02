import { defineTool } from '@agent-runner/core';
import { getDb } from '@lloyd/shared/server';
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate the next trigger time for a recurring schedule.
 */
function calculateNextTrigger(
  frequency: string,
  timeOfDay: string,        // "HH:MM" or "HH:MM:SS"
  timezone: string,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  after?: Date,
): Date {
  const now = after ?? new Date();

  // Parse time parts
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  // Get current date in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value])
  );
  const todayInTz = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  );

  // Convert to a Date by constructing in the target timezone
  // We'll use a helper to get the UTC offset
  const targetLocal = buildDateInTimezone(
    parseInt(parts.year),
    parseInt(parts.month),
    parseInt(parts.day),
    hours,
    minutes,
    timezone
  );

  if (frequency === 'daily') {
    let candidate = targetLocal;
    if (candidate.getTime() <= now.getTime()) {
      candidate = addDays(candidate, 1, timezone, hours, minutes);
    }
    return candidate;
  }

  if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    // daysOfWeek: 1=Mon..7=Sun
    const currentDow = getISODayInTimezone(now, timezone); // 1=Mon..7=Sun
    const sorted = [...daysOfWeek].sort((a, b) => a - b);

    // Try to find next occurrence
    for (let offset = 0; offset <= 7; offset++) {
      const candidateDow = ((currentDow - 1 + offset) % 7) + 1;
      if (sorted.includes(candidateDow)) {
        const candidate = addDays(targetLocal, offset, timezone, hours, minutes);
        if (candidate.getTime() > now.getTime()) {
          return candidate;
        }
      }
    }
    // Fallback: next week's first matching day
    for (const dow of sorted) {
      let daysUntil = dow - currentDow;
      if (daysUntil <= 0) daysUntil += 7;
      const candidate = addDays(targetLocal, daysUntil, timezone, hours, minutes);
      if (candidate.getTime() > now.getTime()) return candidate;
    }
    // Absolute fallback
    return addDays(targetLocal, 7, timezone, hours, minutes);
  }

  if (frequency === 'monthly' && dayOfMonth != null) {
    let year = parseInt(parts.year);
    let month = parseInt(parts.month);

    // Try this month first
    let day = Math.min(dayOfMonth, daysInMonth(year, month));
    let candidate = buildDateInTimezone(year, month, day, hours, minutes, timezone);
    if (candidate.getTime() > now.getTime()) return candidate;

    // Next month
    month++;
    if (month > 12) { month = 1; year++; }
    day = Math.min(dayOfMonth, daysInMonth(year, month));
    return buildDateInTimezone(year, month, day, hours, minutes, timezone);
  }

  // Default fallback: tomorrow at specified time
  return addDays(targetLocal, 1, timezone, hours, minutes);
}

function buildDateInTimezone(
  year: number, month: number, day: number,
  hours: number, minutes: number,
  timezone: string
): Date {
  // Strategy: create the datetime as UTC, then calculate the timezone offset
  // by comparing UTC components with timezone-formatted components.
  // This avoids the bug where new Date(localString) parses in server timezone.
  const dtStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  const asUtc = new Date(dtStr + 'Z');

  // Format the UTC timestamp in the target timezone to get its components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(asUtc).map((p) => [p.type, p.value])
  );

  const tzHour = parseInt(parts.hour) === 24 ? 0 : parseInt(parts.hour);
  const tzMinute = parseInt(parts.minute);
  const tzDay = parseInt(parts.day);
  const utcDay = asUtc.getUTCDate();

  // Calculate offset in minutes: (timezone wall clock) - (UTC wall clock)
  let tzTotalMin = tzHour * 60 + tzMinute;
  let utcTotalMin = asUtc.getUTCHours() * 60 + asUtc.getUTCMinutes();

  // Handle day boundary crossings
  if (tzDay !== utcDay) {
    if (tzDay > utcDay || (utcDay > 27 && tzDay === 1)) {
      tzTotalMin += 1440; // tz is a day ahead
    } else {
      utcTotalMin += 1440; // utc is a day ahead
    }
  }

  const offsetMinutes = tzTotalMin - utcTotalMin;

  // We want the UTC time for (year-month-day hours:minutes) in the target timezone
  // UTC = local - offset
  return new Date(asUtc.getTime() - offsetMinutes * 60_000);
}

function addDays(
  base: Date, days: number,
  timezone: string, hours: number, minutes: number
): Date {
  // Get the local date components, add days, rebuild
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const shifted = new Date(base.getTime() + days * 86400000);
  const parts = Object.fromEntries(
    formatter.formatToParts(shifted).map((p) => [p.type, p.value])
  );
  return buildDateInTimezone(
    parseInt(parts.year), parseInt(parts.month), parseInt(parts.day),
    hours, minutes, timezone
  );
}

function getISODayInTimezone(date: Date, timezone: string): number {
  const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    .format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[dayStr] ?? 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── Exported helper for cron ─────────────────────────────────────────────────

export { calculateNextTrigger };

// ── Tool definitions ─────────────────────────────────────────────────────────

const setScheduleInput = z.object({
  description: z.string().describe('What this recurring message is for (e.g., "daily morning summary")'),
  content: z.string().describe('Message content or instruction. For dynamic schedules, this is a prompt (e.g., "Generate a morning summary with my upcoming reminders and anything I should know today"). For static schedules, this is sent as-is (can include {date}, {day_of_week} placeholders).'),
  frequency: z.enum(['daily', 'weekly', 'monthly']).describe('How often to send'),
  time: z.string().describe('Time of day to send, in HH:MM 24-hour format (e.g., "06:00", "18:30")'),
  timezone: z.string().default('America/New_York').describe("User's timezone"),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional()
    .describe('For weekly: which days (1=Mon, 2=Tue, ..., 7=Sun). Defaults to every day of the week if not specified with weekly.'),
  dayOfMonth: z.number().min(1).max(31).optional()
    .describe('For monthly: which day of the month (1-31)'),
  dynamic: z.boolean().default(false)
    .describe('If true, Lloyd generates personalized content each time using the content as a prompt. If false (default), content is sent as-is with placeholder substitution. Use dynamic=true for summaries, briefings, or personalized messages.'),
});

export const setRecurringSchedule = defineTool({
  name: 'set_recurring_schedule',
  description:
    'Set up a recurring scheduled message for the user. Use get_current_time first to confirm their timezone. Examples: daily summary at 6am, weekly planning on Mondays at 9am, monthly review on the 1st.',
  input: setScheduleInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const params = input as z.infer<typeof setScheduleInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    // Validate time format
    if (!/^\d{1,2}:\d{2}$/.test(params.time)) {
      return { error: 'Invalid time format. Use HH:MM (e.g., "06:00").' };
    }

    const daysOfWeek = params.frequency === 'weekly'
      ? (params.daysOfWeek && params.daysOfWeek.length > 0 ? params.daysOfWeek : [1, 2, 3, 4, 5, 6, 7])
      : null;
    const dayOfMonth = params.frequency === 'monthly'
      ? (params.dayOfMonth ?? 1)
      : null;

    const nextTrigger = calculateNextTrigger(
      params.frequency,
      params.time,
      params.timezone,
      daysOfWeek,
      dayOfMonth,
    );

    const db = getDb();
    const result = await db
      .insertInto('lloyd_recurring_schedules')
      .values({
        user_id: userId,
        description: params.description,
        content: params.content,
        frequency: params.frequency,
        time_of_day: params.time + ':00',
        timezone: params.timezone,
        days_of_week: daysOfWeek,
        day_of_month: dayOfMonth,
        channel: (ctx as any).channel || null,
        dynamic: params.dynamic,
        next_scheduled: nextTrigger,
      })
      .returning(['id', 'next_scheduled'])
      .executeTakeFirstOrThrow();

    return {
      created: true,
      id: result.id,
      description: params.description,
      frequency: params.frequency,
      time: params.time,
      timezone: params.timezone,
      dynamic: params.dynamic,
      nextTrigger: result.next_scheduled,
    };
  },
});

const listSchedulesInput = z.object({
  status: z.enum(['enabled', 'disabled', 'all']).default('enabled')
    .describe('Filter by enabled/disabled status'),
});

export const listRecurringSchedules = defineTool({
  name: 'list_recurring_schedules',
  description: "List the user's recurring schedules.",
  input: listSchedulesInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { status } = input as z.infer<typeof listSchedulesInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { schedules: [] };

    const db = getDb();
    let query = db
      .selectFrom('lloyd_recurring_schedules')
      .select([
        'id', 'description', 'content', 'frequency',
        'time_of_day', 'timezone', 'days_of_week', 'day_of_month',
        'dynamic', 'enabled', 'next_scheduled', 'last_sent_at', 'created_at',
      ])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'asc');

    if (status === 'enabled') query = query.where('enabled', '=', true);
    else if (status === 'disabled') query = query.where('enabled', '=', false);

    const schedules = await query.execute();
    return { schedules };
  },
});

const cancelScheduleInput = z.object({
  description: z.string().describe('Partial match of the schedule description to cancel'),
});

export const cancelRecurringSchedule = defineTool({
  name: 'cancel_recurring_schedule',
  description: 'Cancel (disable) a recurring schedule by matching its description.',
  input: cancelScheduleInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { description } = input as z.infer<typeof cancelScheduleInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    const result = await db
      .updateTable('lloyd_recurring_schedules')
      .set({ enabled: false, updated_at: new Date() })
      .where('user_id', '=', userId)
      .where('enabled', '=', true)
      .where('description', 'ilike', `%${description}%`)
      .executeTakeFirst();

    const count = Number(result.numUpdatedRows ?? 0);
    return { cancelled: count, searchTerm: description };
  },
});

const updateScheduleInput = z.object({
  description: z.string().describe('Partial match of the schedule description to update'),
  newTime: z.string().optional().describe('New time in HH:MM format'),
  newContent: z.string().optional().describe('New message content'),
  enabled: z.boolean().optional().describe('Enable or disable the schedule'),
  newFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  newDaysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  newDayOfMonth: z.number().min(1).max(31).optional(),
  dynamic: z.boolean().optional().describe('Toggle dynamic content generation on/off'),
});

export const updateRecurringSchedule = defineTool({
  name: 'update_recurring_schedule',
  description: 'Update an existing recurring schedule (time, content, frequency, or enable/disable).',
  input: updateScheduleInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const params = input as z.infer<typeof updateScheduleInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();

    // Find the schedule first
    const schedule = await db
      .selectFrom('lloyd_recurring_schedules')
      .selectAll()
      .where('user_id', '=', userId)
      .where('description', 'ilike', `%${params.description}%`)
      .executeTakeFirst();

    if (!schedule) {
      return { error: `No schedule found matching "${params.description}"` };
    }

    const updates: Record<string, any> = { updated_at: new Date() };

    if (params.newTime) updates.time_of_day = params.newTime + ':00';
    if (params.newContent) updates.content = params.newContent;
    if (params.enabled !== undefined) updates.enabled = params.enabled;
    if (params.newFrequency) updates.frequency = params.newFrequency;
    if (params.newDaysOfWeek) updates.days_of_week = params.newDaysOfWeek;
    if (params.newDayOfMonth !== undefined) updates.day_of_month = params.newDayOfMonth;
    if (params.dynamic !== undefined) updates.dynamic = params.dynamic;

    // Recalculate next trigger if time or frequency changed
    const freq = params.newFrequency ?? schedule.frequency;
    const timeStr = params.newTime ?? schedule.time_of_day.substring(0, 5);
    const dow = params.newDaysOfWeek ?? schedule.days_of_week;
    const dom = params.newDayOfMonth ?? schedule.day_of_month;

    if (params.newTime || params.newFrequency || params.newDaysOfWeek || params.newDayOfMonth !== undefined) {
      updates.next_scheduled = calculateNextTrigger(freq, timeStr, schedule.timezone, dow, dom);
    }

    await db
      .updateTable('lloyd_recurring_schedules')
      .set(updates)
      .where('id', '=', schedule.id)
      .execute();

    return {
      updated: true,
      id: schedule.id,
      description: schedule.description,
      changes: Object.keys(updates).filter((k) => k !== 'updated_at'),
    };
  },
});
