-- Migration: 0002_active_session.sql
-- Recoverable Active Session Schema & Wall-Clock Disambiguation

CREATE TABLE IF NOT EXISTS active_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL REFERENCES focus_tasks(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    last_resumed_at TEXT,
    accumulated_seconds INTEGER NOT NULL DEFAULT 0,
    target_seconds INTEGER,
    is_paused BOOLEAN NOT NULL DEFAULT 0,
    client_version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Disambiguate wall-clock bounds vs focused seconds on completed sessions
ALTER TABLE focus_sessions ADD COLUMN started_at TEXT;
