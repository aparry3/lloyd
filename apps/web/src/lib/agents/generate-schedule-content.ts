import { getRunner, getMemoryContext } from './runner';
import { getDb } from '@lloyd/shared/server';

/**
 * Generates dynamic content for a recurring schedule by invoking the Lloyd agent.
 * The schedule's `content` field is used as a prompt/instruction.
 *
 * The agent gets:
 * - The user's memories for personalization
 * - Their pending reminders for context
 * - The schedule description and prompt
 *
 * Returns the generated message text, or falls back to the raw content on error.
 */
export async function generateDynamicContent(opts: {
  userId: string;
  userName: string;
  arAgentId: string;
  content: string;       // The prompt/instruction
  description: string;   // Schedule description
  timezone: string;
  channel: string;
}): Promise<string> {
  try {
    const db = getDb();

    // Fetch pending reminders for context
    const reminders = await db
      .selectFrom('lloyd_reminders')
      .select(['content', 'scheduled_at', 'timezone'])
      .where('user_id', '=', opts.userId)
      .where('status', '=', 'pending')
      .orderBy('scheduled_at', 'asc')
      .limit(10)
      .execute();

    // Fetch pending recurring schedules for context
    const schedules = await db
      .selectFrom('lloyd_recurring_schedules')
      .select(['description', 'frequency', 'time_of_day'])
      .where('user_id', '=', opts.userId)
      .where('enabled', '=', true)
      .limit(10)
      .execute();

    // Fetch active todos for context
    const todos = await db
      .selectFrom('lloyd_todos')
      .select(['content', 'category', 'priority', 'due_date'])
      .where('user_id', '=', opts.userId)
      .where('completed', '=', false)
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'desc')
      .limit(20)
      .execute();

    // Fetch user memories
    const memoryCtx = await getMemoryContext(opts.userId);

    // Build the context
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      timeZone: opts.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: opts.timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let contextParts: string[] = [];
    contextParts.push(`[Scheduled Message Generation]`);
    contextParts.push(`Current date: ${dateStr} at ${timeStr}`);
    contextParts.push(`User: ${opts.userName}`);
    contextParts.push(`Schedule: "${opts.description}"`);

    if (reminders.length > 0) {
      const reminderLines = reminders.map((r) => {
        const when = new Date(r.scheduled_at).toLocaleString('en-US', {
          timeZone: r.timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return `- ${r.content} (${when})`;
      });
      contextParts.push(`\nUpcoming reminders:\n${reminderLines.join('\n')}`);
    }

    if (schedules.length > 0) {
      const scheduleLines = schedules.map(
        (s) => `- ${s.description} (${s.frequency} at ${s.time_of_day.substring(0, 5)})`
      );
      contextParts.push(`\nActive recurring schedules:\n${scheduleLines.join('\n')}`);
    }

    if (todos.length > 0) {
      const priorityLabel = ['', '⚡ ', '🔴 '];
      const todoLines = todos.map((t) => {
        let line = `- ${priorityLabel[t.priority] || ''}${t.content}`;
        if (t.category !== 'general') line += ` [${t.category}]`;
        if (t.due_date) line += ` (due: ${t.due_date})`;
        return line;
      });
      contextParts.push(`\nPending to-do items:\n${todoLines.join('\n')}`);
    }

    const extraContext = contextParts.join('\n') + (memoryCtx || '');

    // Use a dedicated session for schedule generation to avoid polluting the user's conversation
    const sessionId = `lloyd_schedule_${opts.userId}_${Date.now()}`;

    const prompt = `Generate a scheduled message for the user. Here is your instruction for what to create:\n\n${opts.content}\n\nKeep it concise and personal. Adapt to the channel (${opts.channel}). Do NOT mention that you're an AI generating a scheduled message — just write the message directly as if you're proactively reaching out.`;

    const runner = getRunner();
    const result = await runner.invoke(opts.arAgentId, prompt, {
      sessionId,
      toolContext: {
        userId: opts.userId,
        userName: opts.userName,
        channel: opts.channel,
      },
      extraContext,
    });

    if (result.output && result.output.trim().length > 0) {
      return result.output;
    }

    // Fallback to raw content
    return opts.content;
  } catch (err) {
    console.error(`[schedule-gen] Failed to generate dynamic content for user ${opts.userId}:`, err);
    return opts.content; // Fallback to static content
  }
}
