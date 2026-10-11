-- Migration: 0008_planned_blocks.sql
-- Daily Planning and Time Blocking Domain: Schedule action tasks into explicit calendar/workday intervals

CREATE TABLE IF NOT EXISTS planned_blocks (
    id TEXT PRIMARY KEY,
    action_task_id TEXT REFERENCES action_tasks(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped', 'rescheduled')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_planned_blocks_date ON planned_blocks (plan_date);
CREATE INDEX IF NOT EXISTS idx_planned_blocks_task ON planned_blocks (action_task_id);
