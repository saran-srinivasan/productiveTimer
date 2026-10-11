use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    CreateGoalRequest, CreateMilestoneRequest, Goal, GoalMilestone, GoalWithMilestones,
    UpdateGoalRequest, UpdateMilestoneRequest,
};

pub async fn list_goals(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Vec<GoalWithMilestones>>, (StatusCode, String)> {
    let goals = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, project_id, title, goal_type, target_value, current_value, unit,
               start_date, target_date, status, created_at
        FROM goals
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch goals: {}", e)))?;

    let mut result = Vec::with_capacity(goals.len());

    for g in goals {
        // Fetch milestones
        let milestones = sqlx::query_as::<_, GoalMilestone>(
            r#"
            SELECT id, goal_id, title, target_date, status, completed_at
            FROM goal_milestones
            WHERE goal_id = ?1
            ORDER BY target_date ASC, id ASC
            "#,
        )
        .bind(&g.id)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        let mut computed_current = g.current_value;

        // Dynamic progress calculation based on goal type
        match g.goal_type.as_str() {
            "time" => {
                // Sum seconds from focus sessions between start_date and target_date
                let total_sec: i64 = if let Some(ref proj_id) = g.project_id {
                    sqlx::query_scalar::<_, i64>(
                        r#"
                        SELECT COALESCE(SUM(fs.seconds), 0)
                        FROM focus_sessions fs
                        LEFT JOIN action_tasks at ON fs.action_task_id = at.id
                        WHERE (at.project_id = ?1)
                          AND fs.work_date >= ?2 AND fs.work_date <= ?3
                        "#,
                    )
                    .bind(proj_id)
                    .bind(&g.start_date)
                    .bind(&g.target_date)
                    .fetch_one(&pool)
                    .await
                    .unwrap_or(0)
                } else {
                    sqlx::query_scalar::<_, i64>(
                        r#"
                        SELECT COALESCE(SUM(seconds), 0)
                        FROM focus_sessions
                        WHERE work_date >= ?1 AND work_date <= ?2
                        "#,
                    )
                    .bind(&g.start_date)
                    .bind(&g.target_date)
                    .fetch_one(&pool)
                    .await
                    .unwrap_or(0)
                };

                // If unit is "hours", convert seconds to hours
                if g.unit.to_lowercase().contains("hour") || g.unit.to_lowercase() == "h" {
                    computed_current = (total_sec as f64) / 3600.0;
                } else {
                    computed_current = total_sec as f64;
                }
            }
            "consistency" => {
                // Distinct active days with sessions or workouts
                let active_days: i64 = sqlx::query_scalar::<_, i64>(
                    r#"
                    SELECT COUNT(DISTINCT d) FROM (
                        SELECT work_date as d FROM focus_sessions WHERE work_date >= ?1 AND work_date <= ?2
                        UNION
                        SELECT work_date as d FROM workout_entries WHERE work_date >= ?1 AND work_date <= ?2
                        UNION
                        SELECT work_date as d FROM workout_sessions WHERE work_date >= ?1 AND work_date <= ?2
                    )
                    "#,
                )
                .bind(&g.start_date)
                .bind(&g.target_date)
                .fetch_one(&pool)
                .await
                .unwrap_or(0);

                computed_current = active_days as f64;
            }
            "training" => {
                // Fitness training goal: count sessions or aggregate volume
                let unit_lower = g.unit.to_lowercase();
                if unit_lower.contains("kg") || unit_lower.contains("lb") || unit_lower.contains("vol") {
                    let total_vol: Option<f64> = sqlx::query_scalar(
                        r#"
                        SELECT SUM(ws.weight * ws.reps)
                        FROM workout_sets ws
                        JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                        JOIN workout_sessions s ON we.session_id = s.id
                        WHERE s.work_date >= ?1 AND s.work_date <= ?2 AND ws.completed = 1 AND ws.is_warmup = 0
                        "#,
                    )
                    .bind(&g.start_date)
                    .bind(&g.target_date)
                    .fetch_one(&pool)
                    .await
                    .unwrap_or(None);

                    computed_current = total_vol.unwrap_or(0.0);
                } else {
                    let session_count: i64 = sqlx::query_scalar::<_, i64>(
                        r#"
                        SELECT COUNT(DISTINCT id) FROM (
                            SELECT id FROM workout_sessions WHERE work_date >= ?1 AND work_date <= ?2
                            UNION
                            SELECT id FROM workout_entries WHERE work_date >= ?1 AND work_date <= ?2
                        )
                        "#,
                    )
                    .bind(&g.start_date)
                    .bind(&g.target_date)
                    .fetch_one(&pool)
                    .await
                    .unwrap_or(0);

                    computed_current = session_count as f64;
                }
            }
            "outcome" => {
                // If milestones exist, count completed milestones
                if !milestones.is_empty() {
                    let done_count = milestones.iter().filter(|m| m.status == "completed").count();
                    computed_current = done_count as f64;
                }
            }
            _ => {}
        }

        let progress_percentage = if g.target_value > 0.0 {
            ((computed_current / g.target_value) * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        result.push(GoalWithMilestones {
            id: g.id,
            project_id: g.project_id,
            title: g.title,
            goal_type: g.goal_type,
            target_value: g.target_value,
            current_value: computed_current,
            unit: g.unit,
            start_date: g.start_date,
            target_date: g.target_date,
            status: g.status,
            created_at: g.created_at,
            milestones,
            progress_percentage,
        });
    }

    Ok(Json(result))
}

pub async fn create_goal(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateGoalRequest>,
) -> Result<Json<Goal>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let current_value = payload.current_value.unwrap_or(0.0);
    let status = payload.status.unwrap_or_else(|| "in_progress".to_string());

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO goals (id, project_id, title, goal_type, target_value, current_value, unit, start_date, target_date, status, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&payload.project_id)
    .bind(&payload.title)
    .bind(&payload.goal_type)
    .bind(payload.target_value)
    .bind(current_value)
    .bind(&payload.unit)
    .bind(&payload.start_date)
    .bind(&payload.target_date)
    .bind(&status)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert goal: {}", e)))?;

    let goal = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, project_id, title, goal_type, target_value, current_value, unit, start_date, target_date, status, created_at
        FROM goals WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch created goal: {}", e)))?;

    let payload_json = serde_json::to_string(&goal).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('goal', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(goal))
}

pub async fn update_goal(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateGoalRequest>,
) -> Result<Json<Goal>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, project_id, title, goal_type, target_value, current_value, unit, start_date, target_date, status, created_at
        FROM goals WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query goal: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Goal not found".to_string()))?;

    let title = payload.title.unwrap_or(existing.title);
    let target_value = payload.target_value.unwrap_or(existing.target_value);
    let current_value = payload.current_value.unwrap_or(existing.current_value);
    let unit = payload.unit.unwrap_or(existing.unit);
    let start_date = payload.start_date.unwrap_or(existing.start_date);
    let target_date = payload.target_date.unwrap_or(existing.target_date);
    let status = payload.status.unwrap_or(existing.status);
    let project_id = payload.project_id.or(existing.project_id);

    sqlx::query(
        r#"
        UPDATE goals
        SET title = ?1, target_value = ?2, current_value = ?3, unit = ?4,
            start_date = ?5, target_date = ?6, status = ?7, project_id = ?8
        WHERE id = ?9
        "#,
    )
    .bind(&title)
    .bind(target_value)
    .bind(current_value)
    .bind(&unit)
    .bind(&start_date)
    .bind(&target_date)
    .bind(&status)
    .bind(&project_id)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update goal: {}", e)))?;

    let updated = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, project_id, title, goal_type, target_value, current_value, unit, start_date, target_date, status, created_at
        FROM goals WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch updated goal: {}", e)))?;

    let payload_json = serde_json::to_string(&updated).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('goal', ?1, 'upsert', ?2, 1, datetime('now'))",
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

pub async fn delete_goal(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    let rows_affected = sqlx::query("DELETE FROM goals WHERE id = ?1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete goal: {}", e)))?
        .rows_affected();

    if rows_affected == 0 {
        return Err((StatusCode::NOT_FOUND, "Goal not found".to_string()));
    }

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('goal', ?1, 'delete', ?2, 1, datetime('now'))",
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

// Milestone Endpoints
pub async fn add_milestone(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(goal_id): Path<String>,
    Json(payload): Json<CreateMilestoneRequest>,
) -> Result<Json<GoalMilestone>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO goal_milestones (id, goal_id, title, target_date, status, completed_at)
        VALUES (?1, ?2, ?3, ?4, 'pending', NULL)
        "#,
    )
    .bind(&id)
    .bind(&goal_id)
    .bind(&payload.title)
    .bind(&payload.target_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert milestone: {}", e)))?;

    let milestone = sqlx::query_as::<_, GoalMilestone>(
        "SELECT id, goal_id, title, target_date, status, completed_at FROM goal_milestones WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch created milestone: {}", e)))?;

    let payload_json = serde_json::to_string(&milestone).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('milestone', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(milestone))
}

pub async fn update_milestone(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path((_goal_id, milestone_id)): Path<(String, String)>,
    Json(payload): Json<UpdateMilestoneRequest>,
) -> Result<Json<GoalMilestone>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, GoalMilestone>(
        "SELECT id, goal_id, title, target_date, status, completed_at FROM goal_milestones WHERE id = ?1",
    )
    .bind(&milestone_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query milestone: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Milestone not found".to_string()))?;

    let title = payload.title.unwrap_or(existing.title);
    let target_date = payload.target_date.or(existing.target_date);
    let status = payload.status.unwrap_or(existing.status.clone());

    let completed_at = if status == "completed" && existing.completed_at.is_none() {
        Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    } else if status != "completed" {
        None
    } else {
        payload.completed_at.or(existing.completed_at)
    };

    sqlx::query(
        r#"
        UPDATE goal_milestones
        SET title = ?1, target_date = ?2, status = ?3, completed_at = ?4
        WHERE id = ?5
        "#,
    )
    .bind(&title)
    .bind(&target_date)
    .bind(&status)
    .bind(&completed_at)
    .bind(&milestone_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update milestone: {}", e)))?;

    let updated = sqlx::query_as::<_, GoalMilestone>(
        "SELECT id, goal_id, title, target_date, status, completed_at FROM goal_milestones WHERE id = ?1",
    )
    .bind(&milestone_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch updated milestone: {}", e)))?;

    let payload_json = serde_json::to_string(&updated).unwrap_or_default();
    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('milestone', ?1, 'upsert', ?2, 1, datetime('now'))",
    )
    .bind(&milestone_id)
    .bind(payload_json)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(updated))
}

pub async fn delete_milestone(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path((_goal_id, milestone_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to begin tx: {}", e)))?;

    let rows_affected = sqlx::query("DELETE FROM goal_milestones WHERE id = ?1")
        .bind(&milestone_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete milestone: {}", e)))?
        .rows_affected();

    if rows_affected == 0 {
        return Err((StatusCode::NOT_FOUND, "Milestone not found".to_string()));
    }

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('milestone', ?1, 'delete', ?2, 1, datetime('now'))",
    )
    .bind(&milestone_id)
    .bind(json!({ "id": milestone_id }).to_string())
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": milestone_id })))
}
