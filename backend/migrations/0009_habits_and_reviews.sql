-- Migration: 0009_habits_and_reviews.sql
-- Habits and Reviews Domain: Habit tracking, streaks, daily reflections, and weekly synthesis

CREATE TABLE IF NOT EXISTS habit_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    schedule_rule TEXT NOT NULL DEFAULT 'daily',
    target_frequency INTEGER NOT NULL DEFAULT 1,
    color TEXT NOT NULL DEFAULT '#10b981',
    active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_entries (
    id TEXT PRIMARY KEY,
    habit_id TEXT REFERENCES habit_definitions(id) ON DELETE CASCADE,
    completion_date TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT NOT NULL DEFAULT '',
    UNIQUE(habit_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries (completion_date);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit ON habit_entries (habit_id);

CREATE TABLE IF NOT EXISTS daily_reviews (
    id TEXT PRIMARY KEY,
    review_date TEXT UNIQUE NOT NULL,
    accomplishments TEXT NOT NULL DEFAULT '',
    blockers TEXT NOT NULL DEFAULT '',
    reflection TEXT NOT NULL DEFAULT '',
    energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
    focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_reviews_date ON daily_reviews (review_date);
