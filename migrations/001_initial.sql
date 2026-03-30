-- Lloyd schema v1: Users, channel identifiers, conversations
-- agent-runner tables (ar_*) are auto-created by PostgresStore

CREATE TABLE IF NOT EXISTS lloyd_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT UNIQUE,
  preferred_channel TEXT NOT NULL DEFAULT 'sms',
  ar_agent_id   TEXT NOT NULL DEFAULT 'lloyd-assistant',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maps external identifiers (phone numbers, emails, whatsapp IDs) to users
CREATE TABLE IF NOT EXISTS lloyd_channel_identifiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,  -- 'sms' | 'whatsapp' | 'email' | 'rcs'
  identifier    TEXT NOT NULL,  -- E.164 phone, email address, etc.
  verified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, identifier)
);

-- Tracks conversations per user per channel, linking to agent-runner sessions
CREATE TABLE IF NOT EXISTS lloyd_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  ar_session_id TEXT NOT NULL,   -- agent-runner session ID
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_identifiers_lookup
  ON lloyd_channel_identifiers(channel, identifier);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON lloyd_conversations(user_id, channel);

CREATE INDEX IF NOT EXISTS idx_conversations_session
  ON lloyd_conversations(ar_session_id);
