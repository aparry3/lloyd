import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';
import { sendSms } from '@/lib/messaging/twilio';
import { sendEmail } from '@/lib/messaging/email';
import { sendWhatsApp } from '@/lib/messaging/whatsapp';
import { calculateNextTrigger } from '@/lib/agents/schedule-tools';
import { generateDynamicContent } from '@/lib/agents/generate-schedule-content';

/**
 * GET /api/cron/reminders
 * Called periodically (e.g., every minute by Vercel Cron or external cron).
 * Finds due reminders and delivers them via the user's preferred channel.
 * 
 * Protected by CRON_SECRET header to prevent unauthorized triggers.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  try {
    // Find all pending reminders that are due (scheduled_at <= now)
    const dueReminders = await db
      .selectFrom('lloyd_reminders')
      .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_reminders.user_id')
      .select([
        'lloyd_reminders.id',
        'lloyd_reminders.content',
        'lloyd_reminders.channel as reminderChannel',
        'lloyd_reminders.user_id',
        'lloyd_users.name',
        'lloyd_users.phone',
        'lloyd_users.email',
        'lloyd_users.preferred_channel',
      ])
      .where('lloyd_reminders.status', '=', 'pending')
      .where('lloyd_reminders.scheduled_at', '<=', new Date())
      .limit(50) // Process in batches
      .execute();

    if (dueReminders.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const reminder of dueReminders) {
      const message = `⏰ Reminder: ${reminder.content}`;
      const channel = reminder.reminderChannel || reminder.preferred_channel;

      try {
        if (channel === 'sms' && reminder.phone) {
          await sendSms(reminder.phone, message);
        } else if (channel === 'whatsapp' && reminder.phone) {
          await sendWhatsApp(reminder.phone, message);
        } else if (reminder.email) {
          // Fall back to email
          await sendEmail(reminder.email, 'Reminder from Lloyd', message);
        } else {
          console.warn(`[reminders] No delivery channel for user ${reminder.user_id}`);
          failed++;
          continue;
        }

        // Mark as sent
        await db
          .updateTable('lloyd_reminders')
          .set({ status: 'sent', sent_at: new Date() })
          .where('id', '=', reminder.id)
          .execute();

        sent++;
      } catch (err) {
        console.error(`[reminders] Failed to deliver reminder ${reminder.id}:`, err);
        failed++;
      }
    }

    // ── Process recurring schedules ───────────────────────────────────────
    let scheduleSent = 0;
    let scheduleFailed = 0;

    try {
      const dueSchedules = await db
        .selectFrom('lloyd_recurring_schedules')
        .innerJoin('lloyd_users', 'lloyd_users.id', 'lloyd_recurring_schedules.user_id')
        .select([
          'lloyd_recurring_schedules.id',
          'lloyd_recurring_schedules.description',
          'lloyd_recurring_schedules.content',
          'lloyd_recurring_schedules.frequency',
          'lloyd_recurring_schedules.time_of_day',
          'lloyd_recurring_schedules.timezone',
          'lloyd_recurring_schedules.days_of_week',
          'lloyd_recurring_schedules.day_of_month',
          'lloyd_recurring_schedules.channel as scheduleChannel',
          'lloyd_recurring_schedules.dynamic',
          'lloyd_recurring_schedules.user_id',
          'lloyd_users.name',
          'lloyd_users.phone',
          'lloyd_users.email',
          'lloyd_users.preferred_channel',
          'lloyd_users.ar_agent_id as arAgentId',
        ])
        .where('lloyd_recurring_schedules.enabled', '=', true)
        .where('lloyd_recurring_schedules.next_scheduled', '<=', new Date())
        .limit(50)
        .execute();

      for (const schedule of dueSchedules) {
        const now = new Date();
        const channel = schedule.scheduleChannel || schedule.preferred_channel;

        let message: string;

        if (schedule.dynamic) {
          // Dynamic: use Lloyd to generate personalized content
          message = await generateDynamicContent({
            userId: schedule.user_id,
            userName: schedule.name || 'there',
            arAgentId: schedule.arAgentId,
            content: schedule.content,
            description: schedule.description,
            timezone: schedule.timezone,
            channel: channel || 'sms',
          });
        } else {
          // Static: render content with placeholders
          const dateStr = now.toLocaleDateString('en-US', {
            timeZone: schedule.timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const dayOfWeek = now.toLocaleDateString('en-US', {
            timeZone: schedule.timezone,
            weekday: 'long',
          });

          message = schedule.content
            .replace(/\{date\}/g, dateStr)
            .replace(/\{day_of_week\}/g, dayOfWeek)
            .replace(/\{time\}/g, now.toLocaleTimeString('en-US', { timeZone: schedule.timezone }));
        }

        try {
          if (channel === 'sms' && schedule.phone) {
            await sendSms(schedule.phone, message);
          } else if (channel === 'whatsapp' && schedule.phone) {
            await sendWhatsApp(schedule.phone, message);
          } else if (schedule.email) {
            await sendEmail(schedule.email, `Lloyd: ${schedule.description}`, message);
          } else {
            console.warn(`[schedules] No delivery channel for user ${schedule.user_id}`);
            scheduleFailed++;
            continue;
          }

          // Calculate next trigger
          const timeStr = typeof schedule.time_of_day === 'string'
            ? schedule.time_of_day.substring(0, 5)
            : '09:00';
          const nextTrigger = calculateNextTrigger(
            schedule.frequency,
            timeStr,
            schedule.timezone,
            schedule.days_of_week,
            schedule.day_of_month,
            now,
          );

          await db
            .updateTable('lloyd_recurring_schedules')
            .set({
              last_sent_at: now,
              next_scheduled: nextTrigger,
              updated_at: now,
            })
            .where('id', '=', schedule.id)
            .execute();

          scheduleSent++;
        } catch (err) {
          console.error(`[schedules] Failed to deliver schedule ${schedule.id}:`, err);
          scheduleFailed++;
        }
      }
    } catch (schedErr) {
      console.error('[schedules] Processing error:', schedErr);
    }

    return NextResponse.json({
      reminders: { processed: dueReminders.length, sent, failed },
      schedules: { sent: scheduleSent, failed: scheduleFailed },
    });
  } catch (error) {
    console.error('[reminders] Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
