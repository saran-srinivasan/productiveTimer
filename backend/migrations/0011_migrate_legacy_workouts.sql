-- Migration: 0011_migrate_legacy_workouts.sql
-- Backfill historical workout_entries into structured workout_sessions, workout_exercises, and workout_sets

-- 1. Insert workout_sessions grouped by work_date
INSERT OR IGNORE INTO workout_sessions (id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at)
SELECT
    'session_legacy_' || work_date,
    NULL,
    work_date,
    MIN(created_at),
    MAX(created_at),
    'Migrated from legacy workout entries',
    NULL,
    MIN(created_at)
FROM workout_entries
GROUP BY work_date;

-- 2. Insert workout_exercises
INSERT OR IGNORE INTO workout_exercises (id, session_id, exercise_name, order_index)
SELECT
    'we_' || id,
    'session_legacy_' || work_date,
    exercise,
    ROW_NUMBER() OVER (PARTITION BY work_date ORDER BY created_at, id)
FROM workout_entries;

-- 3. Insert workout_sets using recursive series
WITH RECURSIVE seq(n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 100
)
INSERT OR IGNORE INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed)
SELECT
    'ws_' || e.id || '_' || seq.n,
    'we_' || e.id,
    seq.n,
    e.weight,
    e.reps,
    NULL,
    0,
    1
FROM workout_entries e
JOIN seq ON seq.n <= CASE WHEN e.sets IS NOT NULL AND e.sets > 0 THEN e.sets ELSE 1 END;
