import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lloyd/shared/server';
import { sendSms } from '@/lib/messaging/twilio';
import { sendEmail } from '@/lib/messaging/email';
import { sendWhatsApp } from '@/lib/messaging/whatsapp';

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

    return NextResponse.json({ processed: dueReminders.length, sent, failed });
  } catch (error) {
    console.error('[reminders] Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
