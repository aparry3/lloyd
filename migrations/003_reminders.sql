-- Reminders: scheduled messages delivered to users at specific times

CREATE TABLE IF NOT EXISTS lloyd_reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,             -- What to remind them about
  scheduled_at  TIMESTAMPTZ NOT NULL,      -- When to send the reminder
  timezone      TEXT NOT NULL DEFAULT 'America/New_York',  -- User's timezone for display
  channel       TEXT,                      -- Preferred delivery channel (null = use user's preferred)
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'cancelled'
  sent_at       TIMESTAMPTZ,              -- When it was actually delivered
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending
  ON lloyd_reminders(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reminders_user
  ON lloyd_reminders(user_id, status);
