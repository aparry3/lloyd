-- Add timezone column to users for per-user timezone support
-- Defaults to America/New_York but can be set per user

ALTER TABLE lloyd_users
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';
