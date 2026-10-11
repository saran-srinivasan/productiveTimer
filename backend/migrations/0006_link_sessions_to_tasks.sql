-- Migration: 0006_link_sessions_to_tasks.sql
-- Link focus sessions directly to specific actionable tasks

ALTER TABLE focus_sessions ADD COLUMN action_task_id TEXT REFERENCES action_tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_action_task ON focus_sessions (action_task_id);
