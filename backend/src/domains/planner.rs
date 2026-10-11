use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    CreatePlannedBlockRequest, PlannedBlock, PlannedBlockWithTask, PlannedBlocksQuery,
    UpdatePlannedBlockRequest,
};

#[derive(sqlx::FromRow)]
struct PlannedBlockRow {
    id: String,
    action_task_id: Option<String>,
    plan_date: String,
    start_at: String,
    end_at: String,
    status: String,
    notes: String,
    created_at: Option<String>,
    task_title: Option<String>,
    task_priority: Option<String>,
    project_name: Option<String>,
    project_color: Option<String>,
}

impl From<PlannedBlockRow> for PlannedBlockWithTask {
    fn from(r: PlannedBlockRow) -> Self {
        Self {
            id: r.id,
            action_task_id: r.action_task_id,
            plan_date: r.plan_date,
            start_at: r.start_at,
            end_at: r.end_at,
            status: r.status,
            notes: r.notes,
            created_at: r.created_at,
            task_title: r.task_title,
            task_priority: r.task_priority,
            project_name: r.project_name,
            project_color: r.project_color,
        }
    }
}

pub async fn list_planned_blocks(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Query(query): Query<PlannedBlocksQuery>,
) -> Result<Json<Vec<PlannedBlockWithTask>>, (StatusCode, String)> {
    let rows = if let Some(ref date) = query.date {
        sqlx::query_as::<_, PlannedBlockRow>(
            r#"
            SELECT pb.id, pb.action_task_id, pb.plan_date, pb.start_at, pb.end_at, pb.status, pb.notes, pb.created_at,
                   at.title AS task_title, at.priority AS task_priority,
                   p.name AS project_name, p.color AS project_color
            FROM planned_blocks pb
            LEFT JOIN action_tasks at ON pb.action_task_id = at.id
            LEFT JOIN projects p ON at.project_id = p.id
            WHERE pb.plan_date = ?1
            ORDER BY pb.start_at ASC, pb.id ASC
            "#,
        )
        .bind(date)
        .fetch_all(&pool)
        .await
    } else if let (Some(ref start), Some(ref end)) = (query.start_date, query.end_date) {
        sqlx::query_as::<_, PlannedBlockRow>(
            r#"
            SELECT pb.id, pb.action_task_id, pb.plan_date, pb.start_at, pb.end_at, pb.status, pb.notes, pb.created_at,
                   at.title AS task_title, at.priority AS task_priority,
                   p.name AS project_name, p.color AS project_color
            FROM planned_blocks pb
            LEFT JOIN action_tasks at ON pb.action_task_id = at.id
            LEFT JOIN projects p ON at.project_id = p.id
            WHERE pb.plan_date >= ?1 AND pb.plan_date <= ?2
            ORDER BY pb.plan_date ASC, pb.start_at ASC, pb.id ASC
            "#,
        )
        .bind(start)
        .bind(end)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, PlannedBlockRow>(
            r#"
            SELECT pb.id, pb.action_task_id, pb.plan_date, pb.start_at, pb.end_at, pb.status, pb.notes, pb.created_at,
                   at.title AS task_title, at.priority AS task_priority,
                   p.name AS project_name, p.color AS project_color
            FROM planned_blocks pb
            LEFT JOIN action_tasks at ON pb.action_task_id = at.id
            LEFT JOIN projects p ON at.project_id = p.id
            ORDER BY pb.plan_date ASC, pb.start_at ASC, pb.id ASC
            "#,
        )
        .fetch_all(&pool)
        .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch planned blocks: {}", e)))?;

    let result = rows.into_iter().map(Into::into).collect();
    Ok(Json(result))
}

pub async fn create_planned_block(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreatePlannedBlockRequest>,
) -> Result<Json<PlannedBlockWithTask>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let status = payload.status.unwrap_or_else(|| "planned".to_string());
    let notes = payload.notes.unwrap_or_default();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO planned_blocks (id, action_task_id, plan_date, start_at, end_at, status, notes, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&payload.action_task_id)
    .bind(&payload.plan_date)
    .bind(&payload.start_at)
    .bind(&payload.end_at)
    .bind(&status)
    .bind(&notes)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert planned block: {}", e)))?;

    let row = sqlx::query_as::<_, PlannedBlockRow>(
        r#"
        SELECT pb.id, pb.action_task_id, pb.plan_date, pb.start_at, pb.end_at, pb.status, pb.notes, pb.created_at,
               at.title AS task_title, at.priority AS task_priority,
               p.name AS project_name, p.color AS project_color
        FROM planned_blocks pb
        LEFT JOIN action_tasks at ON pb.action_task_id = at.id
        LEFT JOIN projects p ON at.project_id = p.id
        WHERE pb.id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to load created block: {}", e)))?;

    let block: PlannedBlockWithTask = row.into();

    let payload_json = json!({
        "id": block.id,
        "action_task_id": block.action_task_id,
        "plan_date": block.plan_date,
        "start_at": block.start_at,
        "end_at": block.end_at,
        "status": block.status,
        "notes": block.notes,
    })
    .to_string();

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
    )
    .bind("planned_block")
    .bind(&id)
    .bind("upsert")
    .bind(payload_json)
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(block))
}

pub async fn update_planned_block(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdatePlannedBlockRequest>,
) -> Result<Json<PlannedBlockWithTask>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, PlannedBlock>(
        r#"
        SELECT id, action_task_id, plan_date, start_at, end_at, status, notes, created_at
        FROM planned_blocks WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query planned block: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Planned block not found".to_string()))?;

    let action_task_id = payload.action_task_id.or(existing.action_task_id);
    let plan_date = payload.plan_date.unwrap_or(existing.plan_date);
    let start_at = payload.start_at.unwrap_or(existing.start_at);
    let end_at = payload.end_at.unwrap_or(existing.end_at);
    let status = payload.status.unwrap_or(existing.status);
    let notes = payload.notes.unwrap_or(existing.notes);

    sqlx::query(
        r#"
        UPDATE planned_blocks
        SET action_task_id = ?1, plan_date = ?2, start_at = ?3, end_at = ?4, status = ?5, notes = ?6
        WHERE id = ?7
        "#,
    )
    .bind(&action_task_id)
    .bind(&plan_date)
    .bind(&start_at)
    .bind(&end_at)
    .bind(&status)
    .bind(&notes)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update block: {}", e)))?;

    let row = sqlx::query_as::<_, PlannedBlockRow>(
        r#"
        SELECT pb.id, pb.action_task_id, pb.plan_date, pb.start_at, pb.end_at, pb.status, pb.notes, pb.created_at,
               at.title AS task_title, at.priority AS task_priority,
               p.name AS project_name, p.color AS project_color
        FROM planned_blocks pb
        LEFT JOIN action_tasks at ON pb.action_task_id = at.id
        LEFT JOIN projects p ON at.project_id = p.id
        WHERE pb.id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to load updated block: {}", e)))?;

    let block: PlannedBlockWithTask = row.into();

    let payload_json = json!({
        "id": block.id,
        "action_task_id": block.action_task_id,
        "plan_date": block.plan_date,
        "start_at": block.start_at,
        "end_at": block.end_at,
        "status": block.status,
        "notes": block.notes,
    })
    .to_string();

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
    )
    .bind("planned_block")
    .bind(&id)
    .bind("upsert")
    .bind(payload_json)
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(block))
}

pub async fn delete_planned_block(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let res = sqlx::query(
        r#"
        DELETE FROM planned_blocks WHERE id = ?1
        "#,
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete planned block: {}", e)))?;

    if res.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Planned block not found".to_string()));
    }

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'))
        "#,
    )
    .bind("planned_block")
    .bind(&id)
    .bind("delete")
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
