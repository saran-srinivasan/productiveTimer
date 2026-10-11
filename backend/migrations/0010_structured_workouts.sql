-- Migration: 0010_structured_workouts.sql
-- Structured Workouts Domain: Routines, exercises, sessions, and per-set tracking

CREATE TABLE IF NOT EXISTS workout_routines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT REFERENCES workout_routines(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps INTEGER NOT NULL,
    target_rpe REAL,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    order_index INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine 
    ON routine_exercises (routine_id, order_index);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    routine_id TEXT REFERENCES workout_routines(id),
    work_date TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_date 
    ON workout_sessions (work_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_routine 
    ON workout_sessions (routine_id);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_session 
    ON workout_exercises (session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_name 
    ON workout_exercises (exercise_name);

CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight REAL,
    reps INTEGER,
    rpe REAL,
    is_warmup BOOLEAN NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise 
    ON workout_sets (workout_exercise_id, set_number);
