-- Add dynamic flag to recurring schedules
-- When true, content is treated as a prompt for Lloyd to generate personalized messages
-- When false (default), content is sent as-is with placeholder substitution

ALTER TABLE lloyd_recurring_schedules
  ADD COLUMN IF NOT EXISTS dynamic BOOLEAN NOT NULL DEFAULT false;
