-- Recurring schedules: messages sent to users on a repeating basis

CREATE TABLE IF NOT EXISTS lloyd_recurring_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,             -- User-facing description (e.g. "daily morning summary")
  content         TEXT NOT NULL,             -- Message template or instruction for Lloyd
  frequency       TEXT NOT NULL,             -- 'daily', 'weekly', 'monthly'
  time_of_day     TIME NOT NULL,             -- Time to send in user's timezone
  timezone        TEXT NOT NULL DEFAULT 'America/New_York',
  days_of_week    INTEGER[],                 -- For weekly: 1=Mon..7=Sun. NULL for daily/monthly.
  day_of_month    INTEGER,                   -- For monthly: 1-31. NULL for daily/weekly.
  channel         TEXT,                      -- Preferred delivery channel (null = user's preferred)
  enabled         BOOLEAN NOT NULL DEFAULT true,
  last_sent_at    TIMESTAMPTZ,
  next_scheduled  TIMESTAMPTZ,               -- Cached next trigger time
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_enabled
  ON lloyd_recurring_schedules(enabled, next_scheduled)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_schedules_user
  ON lloyd_recurring_schedules(user_id, enabled);
