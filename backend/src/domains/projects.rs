use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    CreateProjectRequest, Project, ProjectSummary, ProjectsQuery, UpdateProjectRequest,
};

pub async fn list_projects(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Query(query): Query<ProjectsQuery>,
) -> Result<Json<Vec<ProjectSummary>>, (StatusCode, String)> {
    let projects: Vec<Project> = match query.status {
        Some(status_filter) if !status_filter.is_empty() => {
            sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at
                FROM projects
                WHERE status = ?1
                ORDER BY created_at DESC
                "#,
            )
            .bind(status_filter)
            .fetch_all(&pool)
            .await
        }
        _ => {
            sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at
                FROM projects
                ORDER BY created_at DESC
                "#,
            )
            .fetch_all(&pool)
            .await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to list projects: {}", e)))?;

    // Check if action_tasks table exists for rollups
    let has_action_tasks: bool = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='action_tasks'",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0)
        > 0;

    let has_linked_sessions: bool = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM pragma_table_info('focus_sessions') WHERE name='action_task_id'",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0)
        > 0;

    let mut summaries = Vec::with_capacity(projects.len());

    for p in projects {
        let mut task_count = 0i64;
        let mut total_focus_seconds = 0i64;

        if has_action_tasks {
            task_count = sqlx::query_scalar::<_, i64>(
                "SELECT count(*) FROM action_tasks WHERE project_id = ?1",
            )
            .bind(&p.id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            if has_linked_sessions {
                total_focus_seconds = sqlx::query_scalar::<_, i64>(
                    r#"
                    SELECT COALESCE(SUM(fs.seconds), 0)
                    FROM focus_sessions fs
                    JOIN action_tasks at ON fs.action_task_id = at.id
                    WHERE at.project_id = ?1
                    "#,
                )
                .bind(&p.id)
                .fetch_one(&pool)
                .await
                .unwrap_or(0);
            }
        }

        summaries.push(ProjectSummary {
            id: p.id,
            name: p.name,
            description: p.description,
            color: p.color,
            status: p.status,
            start_date: p.start_date,
            target_date: p.target_date,
            created_at: p.created_at,
            updated_at: p.updated_at,
            task_count,
            total_focus_seconds,
        });
    }

    Ok(Json(summaries))
}

pub async fn get_project(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<ProjectSummary>, (StatusCode, String)> {
    let p = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at
        FROM projects
        WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch project: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    let has_action_tasks: bool = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='action_tasks'",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0)
        > 0;

    let has_linked_sessions: bool = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM pragma_table_info('focus_sessions') WHERE name='action_task_id'",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0)
        > 0;

    let mut task_count = 0i64;
    let mut total_focus_seconds = 0i64;

    if has_action_tasks {
        task_count = sqlx::query_scalar::<_, i64>(
            "SELECT count(*) FROM action_tasks WHERE project_id = ?1",
        )
        .bind(&p.id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

        if has_linked_sessions {
            total_focus_seconds = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COALESCE(SUM(fs.seconds), 0)
                FROM focus_sessions fs
                JOIN action_tasks at ON fs.action_task_id = at.id
                WHERE at.project_id = ?1
                "#,
            )
            .bind(&p.id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
        }
    }

    Ok(Json(ProjectSummary {
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        status: p.status,
        start_date: p.start_date,
        target_date: p.target_date,
        created_at: p.created_at,
        updated_at: p.updated_at,
        task_count,
        total_focus_seconds,
    }))
}

pub async fn create_project(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateProjectRequest>,
) -> Result<Json<Project>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let description = payload.description.unwrap_or_default();
    let color = payload.color.unwrap_or_else(|| "#3b82f6".to_string());
    let status = payload.status.unwrap_or_else(|| "active".to_string());

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO projects (id, name, description, color, status, start_date, target_date, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&description)
    .bind(&color)
    .bind(&status)
    .bind(&payload.start_date)
    .bind(&payload.target_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert project: {}", e)))?;

    let project = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at FROM projects WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch created project: {}", e)))?;

    let payload_json = serde_json::to_string(&project).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('project', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(project))
}

pub async fn update_project(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProjectRequest>,
) -> Result<Json<Project>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    let existing = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at FROM projects WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to find project: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    let name = payload.name.unwrap_or(existing.name);
    let description = payload.description.unwrap_or(existing.description);
    let color = payload.color.unwrap_or(existing.color);
    let status = payload.status.unwrap_or(existing.status);
    let start_date = payload.start_date.or(existing.start_date);
    let target_date = payload.target_date.or(existing.target_date);

    sqlx::query(
        r#"
        UPDATE projects
        SET name = ?1, description = ?2, color = ?3, status = ?4, start_date = ?5, target_date = ?6, updated_at = datetime('now')
        WHERE id = ?7
        "#,
    )
    .bind(&name)
    .bind(&description)
    .bind(&color)
    .bind(&status)
    .bind(&start_date)
    .bind(&target_date)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update project: {}", e)))?;

    let updated = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, color, status, start_date, target_date, created_at, updated_at FROM projects WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch updated project: {}", e)))?;

    let payload_json = serde_json::to_string(&updated).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('project', ?1, 'upsert', ?2, 1, datetime('now'))",
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

pub async fn delete_project(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    // Soft archive by setting status = 'archived'
    let rows_affected = sqlx::query(
        "UPDATE projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?1",
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to archive project: {}", e)))?
    .rows_affected();

    if rows_affected == 0 {
        return Err((StatusCode::NOT_FOUND, "Project not found".to_string()));
    }

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('project', ?1, 'delete', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(json!({ "id": id, "status": "archived" }).to_string())
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(json!({ "status": "archived", "id": id })))
}
