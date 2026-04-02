-- User todo/task lists: persistent checklists managed via conversation

CREATE TABLE IF NOT EXISTS lloyd_todos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES lloyd_users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',   -- e.g., 'groceries', 'work', 'personal'
  priority      INTEGER NOT NULL DEFAULT 0,         -- 0=normal, 1=high, 2=urgent
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  due_date      DATE,                               -- optional due date
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_active
  ON lloyd_todos(user_id, completed, priority DESC, created_at DESC)
  WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_todos_user_category
  ON lloyd_todos(user_id, category)
  WHERE completed = false;
