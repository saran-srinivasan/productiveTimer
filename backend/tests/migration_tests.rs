use productive_timer_backend::db;
use std::fs;

#[tokio::test]
async fn test_fresh_database_migrations_applied() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("in-memory db migration must succeed");

    // Verify SQLx migration tracking table recorded migration 1
    let migration_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(&pool)
            .await
            .expect("query _sqlx_migrations");
    assert!(
        migration_count >= 1,
        "At least 1 migration must be recorded in _sqlx_migrations"
    );

    // Verify all core tables exist and are queryable
    let task_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM focus_tasks")
        .fetch_one(&pool)
        .await
        .expect("focus_tasks must exist");
    assert_eq!(task_count, 0);

    let session_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM focus_sessions")
        .fetch_one(&pool)
        .await
        .expect("focus_sessions must exist");
    assert_eq!(session_count, 0);

    let workout_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workout_entries")
        .fetch_one(&pool)
        .await
        .expect("workout_entries must exist");
    assert_eq!(workout_count, 0);

    let completion_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM task_completions")
        .fetch_one(&pool)
        .await
        .expect("task_completions must exist");
    assert_eq!(completion_count, 0);

    let auth_config_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_config")
        .fetch_one(&pool)
        .await
        .expect("auth_config must exist");
    assert_eq!(auth_config_count, 0);

    let auth_sessions_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_sessions")
        .fetch_one(&pool)
        .await
        .expect("auth_sessions must exist");
    assert_eq!(auth_sessions_count, 0);
}

#[tokio::test]
async fn test_database_backup_and_restoration_parity() {
    let timestamp = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(12345);
    let temp_dir = std::env::temp_dir().join(format!("pt_backup_test_{}", timestamp));
    fs::create_dir_all(&temp_dir).expect("create test temp dir");

    let db_path = temp_dir.join("productive_timer_test.db");
    let db_url = format!("sqlite://{}", db_path.to_str().unwrap().replace('\\', "/"));

    // 1. Initialize and populate seed data
    {
        let pool = db::init_db(&db_url).await.expect("init disk test db");

        sqlx::query("INSERT INTO focus_tasks (id, name, target_minutes, color) VALUES ('t1', 'Deep Coding', 45, '#3b82f6')")
            .execute(&pool)
            .await
            .expect("insert task");

        sqlx::query("INSERT INTO focus_sessions (id, task_id, seconds, note, work_date) VALUES ('s1', 't1', 2700, 'Shipped migrations', '2026-10-10')")
            .execute(&pool)
            .await
            .expect("insert session");

        sqlx::query("INSERT INTO workout_entries (id, work_date, kind, exercise, sets, reps, weight) VALUES ('w1', '2026-10-10', 'strength', 'Barbell Squat', 4, 8, 120.0)")
            .execute(&pool)
            .await
            .expect("insert workout");

        let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&pool)
            .await;
        pool.close().await;
    }

    // 2. Execute automated pre-migration backup routine
    let backup_path = db::create_pre_migration_backup(&db_url)
        .expect("create backup")
        .expect("backup path must be Some");

    assert!(backup_path.exists(), "Backup file must physically exist");
    assert!(
        backup_path.metadata().unwrap().len() > 0,
        "Backup file must not be empty"
    );

    // 3. Restore database from backup file into fresh restored target
    let restored_db_path = temp_dir.join("productive_timer_restored.db");
    fs::copy(&backup_path, &restored_db_path).expect("restore from backup");
    assert!(restored_db_path.exists(), "Restored DB file must exist");

    let restored_db_url = format!(
        "sqlite://{}",
        restored_db_path.to_str().unwrap().replace('\\', "/")
    );

    // 4. Verify 100% record parity on restored database
    {
        let pool = db::init_db(&restored_db_url)
            .await
            .expect("reopen restored db");

        let task_name: String = sqlx::query_scalar("SELECT name FROM focus_tasks WHERE id = 't1'")
            .fetch_one(&pool)
            .await
            .expect("fetch restored task");
        assert_eq!(task_name, "Deep Coding");

        let session_seconds: i64 =
            sqlx::query_scalar("SELECT seconds FROM focus_sessions WHERE id = 's1'")
                .fetch_one(&pool)
                .await
                .expect("fetch restored session");
        assert_eq!(session_seconds, 2700);

        let workout_exercise: String =
            sqlx::query_scalar("SELECT exercise FROM workout_entries WHERE id = 'w1'")
                .fetch_one(&pool)
                .await
                .expect("fetch restored workout");
        assert_eq!(workout_exercise, "Barbell Squat");

        pool.close().await;
    }

    // Clean up temporary files
    let _ = fs::remove_dir_all(&temp_dir);
}
