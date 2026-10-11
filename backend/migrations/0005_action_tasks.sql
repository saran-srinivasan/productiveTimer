-- Migration: 0005_action_tasks.sql
-- Actionable Tasks Domain: Specific units of execution distinct from high-level focus lanes

-- Ensure goals table exists for foreign key reference
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL DEFAULT 'outcome',
    target_value REAL NOT NULL DEFAULT 0,
    current_value REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    target_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    focus_task_id TEXT REFERENCES focus_tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'ready', 'in_progress', 'blocked', 'completed', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimate_minutes INTEGER,
    due_at TEXT,
    completed_at TEXT,
    completion_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_action_tasks_project ON action_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_action_tasks_status ON action_tasks (status);
CREATE INDEX IF NOT EXISTS idx_action_tasks_priority ON action_tasks (priority);
CREATE INDEX IF NOT EXISTS idx_action_tasks_due_at ON action_tasks (due_at);
