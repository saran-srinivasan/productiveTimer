use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    ActionTask, ActionTasksQuery, CreateActionTaskRequest, UpdateActionTaskRequest,
};

pub async fn list_action_tasks(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Query(query): Query<ActionTasksQuery>,
) -> Result<Json<Vec<ActionTask>>, (StatusCode, String)> {
    let mut sql = String::from(
        r#"
        SELECT id, project_id, goal_id, focus_task_id, title, description, status, priority,
               estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        FROM action_tasks
        WHERE 1=1
        "#,
    );

    let mut conditions = Vec::new();
    if let Some(ref project_id) = query.project_id {
        if !project_id.is_empty() {
            conditions.push(format!("project_id = '{}'", project_id.replace('\'', "''")));
        }
    }
    if let Some(ref status) = query.status {
        if !status.is_empty() {
            conditions.push(format!("status = '{}'", status.replace('\'', "''")));
        }
    }
    if let Some(ref priority) = query.priority {
        if !priority.is_empty() {
            conditions.push(format!("priority = '{}'", priority.replace('\'', "''")));
        }
    }
    if let Some(ref due_date) = query.due_date {
        if !due_date.is_empty() {
            conditions.push(format!("date(due_at) = date('{}')", due_date.replace('\'', "''")));
        }
    }

    for cond in conditions {
        sql.push_str(" AND ");
        sql.push_str(&cond);
    }

    sql.push_str(" ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC");

    let tasks = sqlx::query_as::<_, ActionTask>(&sql)
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch tasks: {}", e)))?;

    Ok(Json(tasks))
}

pub async fn get_action_task(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<ActionTask>, (StatusCode, String)> {
    let task = sqlx::query_as::<_, ActionTask>(
        r#"
        SELECT id, project_id, goal_id, focus_task_id, title, description, status, priority,
               estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        FROM action_tasks
        WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch task: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Task not found".to_string()))?;

    Ok(Json(task))
}

pub async fn create_action_task(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateActionTaskRequest>,
) -> Result<Json<ActionTask>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let description = payload.description.unwrap_or_default();
    let status = payload.status.unwrap_or_else(|| "inbox".to_string());
    let priority = payload.priority.unwrap_or_else(|| "medium".to_string());

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO action_tasks (
            id, project_id, goal_id, focus_task_id, title, description, status, priority,
            estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, '', datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&payload.project_id)
    .bind(&payload.goal_id)
    .bind(&payload.focus_task_id)
    .bind(&payload.title)
    .bind(&description)
    .bind(&status)
    .bind(&priority)
    .bind(payload.estimate_minutes)
    .bind(&payload.due_at)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert action task: {}", e)))?;

    let task = sqlx::query_as::<_, ActionTask>(
        r#"
        SELECT id, project_id, goal_id, focus_task_id, title, description, status, priority,
               estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        FROM action_tasks WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch created task: {}", e)))?;

    let payload_json = serde_json::to_string(&task).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('action_task', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(task))
}

pub async fn update_action_task(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateActionTaskRequest>,
) -> Result<Json<ActionTask>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, ActionTask>(
        r#"
        SELECT id, project_id, goal_id, focus_task_id, title, description, status, priority,
               estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        FROM action_tasks WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query task: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Task not found".to_string()))?;

    let title = payload.title.unwrap_or(existing.title);
    let description = payload.description.unwrap_or(existing.description);
    let status = payload.status.unwrap_or(existing.status.clone());
    let priority = payload.priority.unwrap_or(existing.priority);
    let project_id = payload.project_id.or(existing.project_id);
    let goal_id = payload.goal_id.or(existing.goal_id);
    let focus_task_id = payload.focus_task_id.or(existing.focus_task_id);
    let estimate_minutes = payload.estimate_minutes.or(existing.estimate_minutes);
    let due_at = payload.due_at.or(existing.due_at);
    let completion_notes = payload.completion_notes.unwrap_or(existing.completion_notes);

    // If transitioning to completed and completed_at is None, set to now
    let completed_at = if status == "completed" && existing.completed_at.is_none() {
        Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    } else if status != "completed" {
        None
    } else {
        payload.completed_at.or(existing.completed_at)
    };

    sqlx::query(
        r#"
        UPDATE action_tasks
        SET title = ?1, description = ?2, status = ?3, priority = ?4, project_id = ?5,
            goal_id = ?6, focus_task_id = ?7, estimate_minutes = ?8, due_at = ?9,
            completed_at = ?10, completion_notes = ?11, updated_at = datetime('now')
        WHERE id = ?12
        "#,
    )
    .bind(&title)
    .bind(&description)
    .bind(&status)
    .bind(&priority)
    .bind(&project_id)
    .bind(&goal_id)
    .bind(&focus_task_id)
    .bind(estimate_minutes)
    .bind(&due_at)
    .bind(&completed_at)
    .bind(&completion_notes)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update action task: {}", e)))?;

    let updated = sqlx::query_as::<_, ActionTask>(
        r#"
        SELECT id, project_id, goal_id, focus_task_id, title, description, status, priority,
               estimate_minutes, due_at, completed_at, completion_notes, created_at, updated_at
        FROM action_tasks WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch updated task: {}", e)))?;

    let payload_json = serde_json::to_string(&updated).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('action_task', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(updated))
}

pub async fn delete_action_task(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    let rows_affected = sqlx::query("DELETE FROM action_tasks WHERE id = ?1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete action task: {}", e)))?
        .rows_affected();

    if rows_affected == 0 {
        return Err((StatusCode::NOT_FOUND, "Task not found".to_string()));
    }

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('action_task', ?1, 'delete', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(json!({ "id": id }).to_string())
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}
