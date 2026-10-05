use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::env;

use crate::db::DbPool;
use crate::models::{
    DeleteCompletionQuery, FocusSession, FocusTask, LedgerResponse, MigrateSupabaseRequest,
    SyncRequest, TaskCompletion, WorkoutEntry,
};

pub async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}

pub async fn get_ledger(State(pool): State<DbPool>) -> Result<Json<LedgerResponse>, (StatusCode, String)> {
    let tasks = sqlx::query_as::<_, FocusTask>(
        "SELECT id, name, target_minutes, color, created_at FROM focus_tasks ORDER BY created_at ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch tasks: {}", e)))?;

    let sessions = sqlx::query_as::<_, FocusSession>(
        "SELECT id, task_id, seconds, note, work_date, ended_at, created_at FROM focus_sessions ORDER BY ended_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch sessions: {}", e)))?;

    let workouts = sqlx::query_as::<_, WorkoutEntry>(
        "SELECT id, work_date, kind, exercise, sets, reps, weight, duration_minutes, distance, intensity, note, created_at FROM workout_entries ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch workouts: {}", e)))?;

    let completions = sqlx::query_as::<_, TaskCompletion>(
        "SELECT id, task_id, completion_date, created_at FROM task_completions ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch completions: {}", e)))?;

    Ok(Json(LedgerResponse {
        tasks,
        sessions,
        workouts,
        completions,
    }))
}

pub async fn sync_ledger(
    State(pool): State<DbPool>,
    Json(payload): Json<SyncRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Transaction start failed: {}", e)))?;

    if let Some(tasks) = payload.tasks {
        for task in tasks {
            sqlx::query(
                r#"
                INSERT INTO focus_tasks (id, name, target_minutes, color, created_at)
                VALUES (?1, ?2, ?3, ?4, COALESCE(?5, datetime('now')))
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    target_minutes = excluded.target_minutes,
                    color = excluded.color
                "#,
            )
            .bind(&task.id)
            .bind(&task.name)
            .bind(task.target_minutes)
            .bind(&task.color)
            .bind(&task.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task sync error: {}", e)))?;
        }
    }

    if let Some(sessions) = payload.sessions {
        for session in sessions {
            sqlx::query(
                r#"
                INSERT INTO focus_sessions (id, task_id, seconds, note, work_date, ended_at, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE(?7, datetime('now')))
                ON CONFLICT(id) DO UPDATE SET
                    task_id = excluded.task_id,
                    seconds = excluded.seconds,
                    note = excluded.note,
                    work_date = excluded.work_date,
                    ended_at = excluded.ended_at
                "#,
            )
            .bind(&session.id)
            .bind(&session.task_id)
            .bind(session.seconds)
            .bind(&session.note)
            .bind(&session.work_date)
            .bind(&session.ended_at)
            .bind(&session.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Session sync error: {}", e)))?;
        }
    }

    if let Some(workouts) = payload.workouts {
        for workout in workouts {
            sqlx::query(
                r#"
                INSERT INTO workout_entries (
                    id, work_date, kind, exercise, sets, reps, weight,
                    duration_minutes, distance, intensity, note, created_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, COALESCE(?12, datetime('now')))
                ON CONFLICT(id) DO UPDATE SET
                    work_date = excluded.work_date,
                    kind = excluded.kind,
                    exercise = excluded.exercise,
                    sets = excluded.sets,
                    reps = excluded.reps,
                    weight = excluded.weight,
                    duration_minutes = excluded.duration_minutes,
                    distance = excluded.distance,
                    intensity = excluded.intensity,
                    note = excluded.note
                "#,
            )
            .bind(&workout.id)
            .bind(&workout.work_date)
            .bind(&workout.kind)
            .bind(&workout.exercise)
            .bind(workout.sets)
            .bind(workout.reps)
            .bind(workout.weight)
            .bind(workout.duration_minutes)
            .bind(workout.distance)
            .bind(&workout.intensity)
            .bind(&workout.note)
            .bind(&workout.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Workout sync error: {}", e)))?;
        }
    }

    if let Some(completions) = payload.completions {
        for completion in completions {
            sqlx::query(
                r#"
                INSERT INTO task_completions (id, task_id, completion_date, created_at)
                VALUES (?1, ?2, ?3, COALESCE(?4, datetime('now')))
                ON CONFLICT(task_id, completion_date) DO UPDATE SET
                    id = excluded.id
                "#,
            )
            .bind(&completion.id)
            .bind(&completion.task_id)
            .bind(&completion.completion_date)
            .bind(&completion.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Completion sync error: {}", e)))?;
        }
    }

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Transaction commit failed: {}", e)))?;

    Ok(Json(json!({ "status": "synced" })))
}

pub async fn delete_task(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM focus_tasks WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete task failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn delete_session(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM focus_sessions WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete session failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn delete_workout(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_entries WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete workout failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn delete_completion(
    State(pool): State<DbPool>,
    Query(params): Query<DeleteCompletionQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM task_completions WHERE task_id = ?1 AND completion_date = ?2")
        .bind(&params.task_id)
        .bind(&params.date)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete completion failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "task_id": params.task_id, "date": params.date })))
}

pub async fn migrate_from_supabase(
    State(pool): State<DbPool>,
    Json(payload): Json<MigrateSupabaseRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let supabase_url = payload
        .supabase_url
        .or_else(|| env::var("VITE_SUPABASE_URL").ok())
        .or_else(|| env::var("SUPABASE_URL").ok())
        .unwrap_or_else(|| "https://ngpoiiwvungwupxyhmas.supabase.co".to_string());

    let supabase_key = payload
        .supabase_anon_key
        .or_else(|| env::var("VITE_SUPABASE_ANON_KEY").ok())
        .or_else(|| env::var("SUPABASE_ANON_KEY").ok())
        .unwrap_or_default();

    if supabase_key.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No Supabase anon key provided or found in environment.".to_string(),
        ));
    }

    let client = reqwest::Client::new();
    let base_url = supabase_url.trim_end_matches('/');

    let fetch_table = |table: &'static str| {
        let url = format!("{}/rest/v1/{}?select=*&order=created_at.asc", base_url, table);
        let key = supabase_key.clone();
        let c = client.clone();
        async move {
            let res = c
                .get(&url)
                .header("apikey", &key)
                .header("Authorization", format!("Bearer {}", key))
                .send()
                .await
                .map_err(|e| format!("HTTP request to {} failed: {}", table, e))?;

            if !res.status().is_success() {
                let text = res.text().await.unwrap_or_default();
                return Err(format!("Supabase API error for {}: {}", table, text));
            }

            res.json::<Vec<serde_json::Value>>()
                .await
                .map_err(|e| format!("JSON parse error for {}: {}", table, e))
        }
    };

    let (tasks_res, sessions_res, workouts_res, completions_res) = tokio::join!(
        fetch_table("focus_tasks"),
        fetch_table("focus_sessions"),
        fetch_table("workout_entries"),
        fetch_table("task_completions"),
    );

    let tasks = tasks_res.map_err(|e| (StatusCode::BAD_GATEWAY, e))?;
    let sessions = sessions_res.map_err(|e| (StatusCode::BAD_GATEWAY, e))?;
    let workouts = workouts_res.map_err(|e| (StatusCode::BAD_GATEWAY, e))?;
    let completions = completions_res.map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Tx begin failed: {}", e)))?;

    let mut tasks_count = 0;
    for t in &tasks {
        if let (Some(id), Some(name)) = (t.get("id").and_then(|v| v.as_str()), t.get("name").and_then(|v| v.as_str())) {
            let target_minutes = t.get("target_minutes").and_then(|v| v.as_i64()).unwrap_or(30);
            let color = t.get("color").and_then(|v| v.as_str()).unwrap_or("#287c6f");
            let created_at = t.get("created_at").and_then(|v| v.as_str());

            sqlx::query(
                r#"
                INSERT INTO focus_tasks (id, name, target_minutes, color, created_at)
                VALUES (?1, ?2, ?3, ?4, COALESCE(?5, datetime('now')))
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    target_minutes = excluded.target_minutes,
                    color = excluded.color
                "#,
            )
            .bind(id)
            .bind(name)
            .bind(target_minutes)
            .bind(color)
            .bind(created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Migrate task err: {}", e)))?;

            tasks_count += 1;
        }
    }

    let mut sessions_count = 0;
    for s in &sessions {
        if let (Some(id), Some(task_id)) = (s.get("id").and_then(|v| v.as_str()), s.get("task_id").and_then(|v| v.as_str())) {
            let seconds = s.get("seconds").and_then(|v| v.as_i64()).unwrap_or(0);
            let note = s.get("note").and_then(|v| v.as_str()).unwrap_or("");
            let work_date = s.get("work_date").and_then(|v| v.as_str()).unwrap_or("");
            let ended_at = s.get("ended_at").and_then(|v| v.as_str()).unwrap_or("");
            let created_at = s.get("created_at").and_then(|v| v.as_str());

            if seconds > 0 && !work_date.is_empty() {
                sqlx::query(
                    r#"
                    INSERT INTO focus_sessions (id, task_id, seconds, note, work_date, ended_at, created_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE(?7, datetime('now')))
                    ON CONFLICT(id) DO UPDATE SET
                        task_id = excluded.task_id,
                        seconds = excluded.seconds,
                        note = excluded.note,
                        work_date = excluded.work_date,
                        ended_at = excluded.ended_at
                    "#,
                )
                .bind(id)
                .bind(task_id)
                .bind(seconds)
                .bind(note)
                .bind(work_date)
                .bind(ended_at)
                .bind(created_at)
                .execute(&mut *tx)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Migrate session err: {}", e)))?;

                sessions_count += 1;
            }
        }
    }

    let mut workouts_count = 0;
    for w in &workouts {
        if let (Some(id), Some(work_date), Some(kind), Some(exercise)) = (
            w.get("id").and_then(|v| v.as_str()),
            w.get("work_date").and_then(|v| v.as_str()),
            w.get("kind").and_then(|v| v.as_str()),
            w.get("exercise").and_then(|v| v.as_str()),
        ) {
            let sets = w.get("sets").and_then(|v| v.as_i64());
            let reps = w.get("reps").and_then(|v| v.as_i64());
            let weight = w.get("weight").and_then(|v| v.as_f64());
            let duration_minutes = w.get("duration_minutes").and_then(|v| v.as_i64());
            let distance = w.get("distance").and_then(|v| v.as_f64());
            let intensity = w.get("intensity").and_then(|v| v.as_str()).unwrap_or("moderate");
            let note = w.get("note").and_then(|v| v.as_str()).unwrap_or("");
            let created_at = w.get("created_at").and_then(|v| v.as_str());

            sqlx::query(
                r#"
                INSERT INTO workout_entries (
                    id, work_date, kind, exercise, sets, reps, weight,
                    duration_minutes, distance, intensity, note, created_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, COALESCE(?12, datetime('now')))
                ON CONFLICT(id) DO UPDATE SET
                    work_date = excluded.work_date,
                    kind = excluded.kind,
                    exercise = excluded.exercise,
                    sets = excluded.sets,
                    reps = excluded.reps,
                    weight = excluded.weight,
                    duration_minutes = excluded.duration_minutes,
                    distance = excluded.distance,
                    intensity = excluded.intensity,
                    note = excluded.note
                "#,
            )
            .bind(id)
            .bind(work_date)
            .bind(kind)
            .bind(exercise)
            .bind(sets)
            .bind(reps)
            .bind(weight)
            .bind(duration_minutes)
            .bind(distance)
            .bind(intensity)
            .bind(note)
            .bind(created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Migrate workout err: {}", e)))?;

            workouts_count += 1;
        }
    }

    let mut completions_count = 0;
    for c in &completions {
        if let (Some(id), Some(task_id), Some(date)) = (
            c.get("id").and_then(|v| v.as_str()),
            c.get("task_id").and_then(|v| v.as_str()),
            c.get("completion_date").and_then(|v| v.as_str()),
        ) {
            let created_at = c.get("created_at").and_then(|v| v.as_str());

            sqlx::query(
                r#"
                INSERT INTO task_completions (id, task_id, completion_date, created_at)
                VALUES (?1, ?2, ?3, COALESCE(?4, datetime('now')))
                ON CONFLICT(task_id, completion_date) DO UPDATE SET
                    id = excluded.id
                "#,
            )
            .bind(id)
            .bind(task_id)
            .bind(date)
            .bind(created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Migrate completion err: {}", e)))?;

            completions_count += 1;
        }
    }

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Commit failed: {}", e)))?;

    Ok(Json(json!({
        "status": "success",
        "migrated": {
            "tasks": tasks_count,
            "sessions": sessions_count,
            "workouts": workouts_count,
            "completions": completions_count
        }
    })))
}
