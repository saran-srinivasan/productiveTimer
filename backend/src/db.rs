use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;

pub type DbPool = Pool<Sqlite>; // Trigger migration recompilation: 0009

pub fn create_pre_migration_backup(database_url: &str) -> Result<Option<PathBuf>, std::io::Error> {
    if let Some(path_str) = database_url.strip_prefix("sqlite:") {
        let clean_path = path_str
            .trim_start_matches("//")
            .split('?')
            .next()
            .unwrap_or(path_str);
        if clean_path == ":memory:" || clean_path.is_empty() {
            return Ok(None);
        }

        let db_path = Path::new(clean_path);
        if db_path.exists() {
            let backup_dir = db_path
                .parent()
                .map(|p| p.join("backups"))
                .unwrap_or_else(|| Path::new("data/backups").to_path_buf());

            fs::create_dir_all(&backup_dir)?;

            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            let file_stem = db_path.file_stem().and_then(|s| s.to_str()).unwrap_or("db");
            let backup_filename = format!("{}_backup_{}.db", file_stem, timestamp);
            let backup_path = backup_dir.join(backup_filename);

            fs::copy(db_path, &backup_path)?;
            tracing::info!(
                "Pre-migration database backup created at: {:?}",
                backup_path
            );
            return Ok(Some(backup_path));
        }
    }
    Ok(None)
}

pub async fn init_db(database_url: &str) -> Result<DbPool, Box<dyn std::error::Error>> {
    // If it's a file path like "sqlite://data/productive_timer.db", ensure directory exists
    if let Some(path_str) = database_url.strip_prefix("sqlite:") {
        let clean_path = path_str
            .trim_start_matches("//")
            .split('?')
            .next()
            .unwrap_or(path_str);
        if clean_path != ":memory:" && !clean_path.is_empty() {
            if let Some(parent) = Path::new(clean_path).parent() {
                if !parent.as_os_str().is_empty() {
                    let _ = fs::create_dir_all(parent);
                }
            }
        }
    }

    // Pre-migration backup before opening or applying DDL
    let _ = create_pre_migration_backup(database_url);

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

pub async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::migrate::MigrateError> {
    // Versioned migrations directory embedded at compile time
    sqlx::migrate!("./migrations").run(pool).await
}
