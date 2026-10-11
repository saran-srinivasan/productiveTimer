use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    ActiveSession, CompleteFocusSessionRequest, FocusSession, FocusSessionsQuery,
    UpsertActiveSessionRequest,
};

pub async fn list_focus_sessions(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Query(query): Query<FocusSessionsQuery>,
) -> Result<Json<Vec<FocusSession>>, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(100).min(500);
    let offset = query.offset.unwrap_or(0);
    let start = query.start_date.unwrap_or_else(|| "1970-01-01".to_string());
    let end = query.end_date.unwrap_or_else(|| "9999-12-31".to_string());

    let sessions = sqlx::query_as::<_, FocusSession>(
        r#"
        SELECT id, task_id, seconds, note, work_date, ended_at, action_task_id, started_at, created_at
        FROM focus_sessions
        WHERE work_date >= ?1 AND work_date <= ?2
        ORDER BY ended_at DESC
        LIMIT ?3 OFFSET ?4
        "#,
    )
    .bind(start)
    .bind(end)
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query sessions: {}", e)))?;

    Ok(Json(sessions))
}

pub async fn delete_task(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM focus_tasks WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Delete task failed: {}", e),
            )
        })?;

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('task', ?1, 'delete', NULL, 1, datetime('now'))",
    )
    .bind(&id)
    .execute(&pool)
    .await;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn delete_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM focus_sessions WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Delete session failed: {}", e),
            )
        })?;

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('session', ?1, 'delete', NULL, 1, datetime('now'))",
    )
    .bind(&id)
    .execute(&pool)
    .await;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn get_active_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Option<ActiveSession>>, (StatusCode, String)> {
    let session = sqlx::query_as::<_, ActiveSession>(
        "SELECT id, task_id, started_at, last_resumed_at, accumulated_seconds, target_seconds, is_paused, client_version, updated_at FROM active_sessions ORDER BY updated_at DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch active session: {}", e)))?;

    Ok(Json(session))
}

pub async fn upsert_active_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<UpsertActiveSessionRequest>,
) -> Result<Json<ActiveSession>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, ActiveSession>(
        "SELECT id, task_id, started_at, last_resumed_at, accumulated_seconds, target_seconds, is_paused, client_version, updated_at FROM active_sessions WHERE id = ?1",
    )
    .bind(&payload.id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query active session: {}", e)))?;

    if let Some(existing_session) = existing {
        if payload.client_version < existing_session.client_version {
            return Err((
                StatusCode::CONFLICT,
                "Client version is older than existing active session version.".to_string(),
            ));
        }
    }

    let now_str = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query(
        r#"
        INSERT INTO active_sessions (id, task_id, started_at, last_resumed_at, accumulated_seconds, target_seconds, is_paused, client_version, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(id) DO UPDATE SET
            task_id = excluded.task_id,
            started_at = excluded.started_at,
            last_resumed_at = excluded.last_resumed_at,
            accumulated_seconds = excluded.accumulated_seconds,
            target_seconds = excluded.target_seconds,
            is_paused = excluded.is_paused,
            client_version = excluded.client_version,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.task_id)
    .bind(&payload.started_at)
    .bind(&payload.last_resumed_at)
    .bind(payload.accumulated_seconds)
    .bind(payload.target_seconds)
    .bind(payload.is_paused)
    .bind(payload.client_version)
    .bind(&now_str)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to upsert active session: {}", e)))?;

    let saved = sqlx::query_as::<_, ActiveSession>(
        "SELECT id, task_id, started_at, last_resumed_at, accumulated_seconds, target_seconds, is_paused, client_version, updated_at FROM active_sessions WHERE id = ?1",
    )
    .bind(&payload.id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to reload active session: {}", e)))?;

    Ok(Json(saved))
}

pub async fn delete_active_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM active_sessions")
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to delete active session: {}", e),
            )
        })?;

    Ok(Json(json!({ "status": "active_session_cleared" })))
}

pub async fn complete_focus_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CompleteFocusSessionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool.begin().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to start transaction: {}", e),
        )
    })?;

    // Idempotency check: if session with this ID exists, return OK immediately
    let existing: Option<String> =
        sqlx::query_scalar("SELECT id FROM focus_sessions WHERE id = ?1")
            .bind(&payload.id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("DB check failed: {}", e),
                )
            })?;

    if existing.is_some() {
        let _ = sqlx::query("DELETE FROM active_sessions WHERE id = ?1 OR task_id = ?2")
            .bind(&payload.id)
            .bind(&payload.task_id)
            .execute(&mut *tx)
            .await;

        tx.commit().await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Commit failed: {}", e),
            )
        })?;
        return Ok(Json(
            json!({ "status": "completed", "id": payload.id, "idempotent": true }),
        ));
    }

    let note_str = payload.note.unwrap_or_default();
    let ended_at_str = payload
        .ended_at
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string());

    sqlx::query(
        "INSERT INTO focus_sessions (id, task_id, seconds, note, work_date, started_at, ended_at, action_task_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&payload.id)
    .bind(&payload.task_id)
    .bind(payload.seconds)
    .bind(&note_str)
    .bind(&payload.work_date)
    .bind(&payload.started_at)
    .bind(&ended_at_str)
    .bind(&payload.action_task_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to record session: {}", e)))?;

    let session_obj = serde_json::json!({
        "id": payload.id,
        "task_id": payload.task_id,
        "seconds": payload.seconds,
        "note": note_str,
        "work_date": payload.work_date,
        "action_task_id": payload.action_task_id,
        "started_at": payload.started_at,
        "ended_at": ended_at_str,
    });
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('session', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&payload.id)
    .bind(session_obj.to_string())
    .execute(&mut *tx)
    .await;

    // Clear matching active sessions
    let _ = sqlx::query("DELETE FROM active_sessions WHERE id = ?1 OR task_id = ?2")
        .bind(&payload.id)
        .bind(&payload.task_id)
        .execute(&mut *tx)
        .await;

    tx.commit().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Commit failed: {}", e),
        )
    })?;

    Ok(Json(
        json!({ "status": "completed", "id": payload.id, "idempotent": false }),
    ))
}
