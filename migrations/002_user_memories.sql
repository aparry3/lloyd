-- User memory system: per-user isolated knowledge store
-- Lloyd can save and recall facts about each user

CREATE TABLE IF NOT EXISTS lloyd_user_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,           -- The memory/fact itself
  category      TEXT NOT NULL DEFAULT 'general',  -- 'preference', 'fact', 'reminder', 'general'
  importance    INTEGER NOT NULL DEFAULT 5,        -- 1-10, higher = more important
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user
  ON lloyd_user_memories(user_id);

CREATE INDEX IF NOT EXISTS idx_user_memories_category
  ON lloyd_user_memories(user_id, category);

CREATE INDEX IF NOT EXISTS idx_user_memories_importance
  ON lloyd_user_memories(user_id, importance DESC);
