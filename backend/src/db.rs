use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::fs;
use std::path::Path;
use std::str::FromStr;

pub type DbPool = Pool<Sqlite>;

pub async fn init_db(database_url: &str) -> Result<DbPool, sqlx::Error> {
    // If it's a file path like "sqlite://data/productive_timer.db", ensure directory exists
    if let Some(path_str) = database_url.strip_prefix("sqlite:") {
        let clean_path = path_str.trim_start_matches("//").split('?').next().unwrap_or(path_str);
        if let Some(parent) = Path::new(clean_path).parent() {
            if !parent.as_os_str().is_empty() {
                let _ = fs::create_dir_all(parent);
            }
        }
    }

    let connection_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connection_options)
        .await?;

    run_migrations(&pool).await?;

    Ok(pool)
}

pub async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS focus_tasks (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            target_minutes INTEGER NOT NULL DEFAULT 30,
            color TEXT NOT NULL DEFAULT '#287c6f',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS focus_tasks_name_unique_idx
            ON focus_tasks (lower(trim(name)));

        CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY NOT NULL,
            task_id TEXT NOT NULL REFERENCES focus_tasks(id) ON DELETE CASCADE,
            seconds INTEGER NOT NULL CHECK (seconds > 0),
            note TEXT NOT NULL DEFAULT '',
            work_date TEXT NOT NULL,
            ended_at TEXT NOT NULL DEFAULT (datetime('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS focus_sessions_work_date_idx
            ON focus_sessions (work_date DESC);

        CREATE INDEX IF NOT EXISTS focus_sessions_task_id_idx
            ON focus_sessions (task_id);

        CREATE TABLE IF NOT EXISTS workout_entries (
            id TEXT PRIMARY KEY NOT NULL,
            work_date TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('strength', 'cardio')),
            exercise TEXT NOT NULL,
            sets INTEGER,
            reps INTEGER,
            weight REAL,
            duration_minutes INTEGER,
            distance REAL,
            intensity TEXT NOT NULL DEFAULT 'moderate',
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS workout_entries_work_date_idx
            ON workout_entries (work_date DESC);

        CREATE INDEX IF NOT EXISTS workout_entries_kind_idx
            ON workout_entries (kind);

        CREATE TABLE IF NOT EXISTS task_completions (
            id TEXT PRIMARY KEY NOT NULL,
            task_id TEXT NOT NULL REFERENCES focus_tasks(id) ON DELETE CASCADE,
            completion_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (task_id, completion_date)
        );

        CREATE INDEX IF NOT EXISTS task_completions_completion_date_idx
            ON task_completions (completion_date DESC);

        CREATE INDEX IF NOT EXISTS task_completions_task_id_idx
            ON task_completions (task_id);

        CREATE TABLE IF NOT EXISTS auth_config (
            id TEXT PRIMARY KEY NOT NULL DEFAULT 'primary',
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS auth_sessions (
            token TEXT PRIMARY KEY NOT NULL,
            role TEXT NOT NULL DEFAULT 'owner',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS auth_sessions_token_idx
            ON auth_sessions (token);
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
