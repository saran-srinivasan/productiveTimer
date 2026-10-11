-- Migration: 0007_goals.sql
-- Goals & Milestones Domain: Target outcomes, cumulative time goals, consistency streaks

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('outcome', 'time', 'consistency', 'habit', 'training')),
    target_value REAL NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    start_date TEXT NOT NULL,
    target_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_project ON goals (project_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status);

CREATE TABLE IF NOT EXISTS goal_milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones (goal_id);
