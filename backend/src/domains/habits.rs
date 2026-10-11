use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    CreateHabitRequest, HabitDefinition, HabitWithHistory, ToggleHabitRequest, UpdateHabitRequest,
};

pub async fn list_habits(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Vec<HabitWithHistory>>, (StatusCode, String)> {
    let definitions = sqlx::query_as::<_, HabitDefinition>(
        r#"
        SELECT id, name, schedule_rule, target_frequency, color, active, created_at
        FROM habit_definitions
        ORDER BY created_at ASC, id ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch habits: {}", e)))?;

    let mut result = Vec::with_capacity(definitions.len());

    for h in definitions {
        // Fetch completion dates for this habit
        let dates: Vec<String> = sqlx::query_scalar::<_, String>(
            r#"
            SELECT completion_date
            FROM habit_entries
            WHERE habit_id = ?1
            ORDER BY completion_date DESC
            "#,
        )
        .bind(&h.id)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        // Compute streak
        let streak = calculate_streak(&dates);

        result.push(HabitWithHistory {
            id: h.id,
            name: h.name,
            schedule_rule: h.schedule_rule,
            target_frequency: h.target_frequency,
            color: h.color,
            active: h.active,
            created_at: h.created_at,
            current_streak: streak,
            recent_dates: dates,
        });
    }

    Ok(Json(result))
}

fn calculate_streak(dates_desc: &[String]) -> i64 {
    if dates_desc.is_empty() {
        return 0;
    }

    // Get unique dates
    let mut unique_dates: Vec<&str> = dates_desc.iter().map(|s| s.as_str()).collect();
    unique_dates.dedup();

    let mut streak: i64 = 0;
    // Check consecutive daily step backwards
    for i in 0..unique_dates.len() {
        if i == 0 {
            streak += 1;
            continue;
        }

        // Parse previous date and current date
        if let (Ok(curr), Ok(prev)) = (
            chrono::NaiveDate::parse_from_str(unique_dates[i], "%Y-%m-%d"),
            chrono::NaiveDate::parse_from_str(unique_dates[i - 1], "%Y-%m-%d"),
        ) {
            if prev - curr == chrono::Duration::days(1) {
                streak += 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    streak
}

pub async fn create_habit(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateHabitRequest>,
) -> Result<Json<HabitDefinition>, (StatusCode, String)> {
    let id = payload
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let schedule_rule = payload.schedule_rule.unwrap_or_else(|| "daily".to_string());
    let target_frequency = payload.target_frequency.unwrap_or(1);
    let color = payload.color.unwrap_or_else(|| "#10b981".to_string());

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO habit_definitions (id, name, schedule_rule, target_frequency, color, active, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'))
        "#,
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&schedule_rule)
    .bind(target_frequency)
    .bind(&color)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert habit: {}", e)))?;

    let habit = sqlx::query_as::<_, HabitDefinition>(
        r#"
        SELECT id, name, schedule_rule, target_frequency, color, active, created_at
        FROM habit_definitions WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch created habit: {}", e)))?;

    let payload_json = json!({
        "id": habit.id,
        "name": habit.name,
        "schedule_rule": habit.schedule_rule,
        "target_frequency": habit.target_frequency,
        "color": habit.color,
        "active": habit.active,
    })
    .to_string();

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
    )
    .bind("habit_definition")
    .bind(&id)
    .bind("upsert")
    .bind(payload_json)
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(habit))
}

pub async fn update_habit(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateHabitRequest>,
) -> Result<Json<HabitDefinition>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, HabitDefinition>(
        r#"
        SELECT id, name, schedule_rule, target_frequency, color, active, created_at
        FROM habit_definitions WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query habit: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Habit not found".to_string()))?;

    let name = payload.name.unwrap_or(existing.name);
    let schedule_rule = payload.schedule_rule.unwrap_or(existing.schedule_rule);
    let target_frequency = payload.target_frequency.unwrap_or(existing.target_frequency);
    let color = payload.color.unwrap_or(existing.color);
    let active = payload.active.unwrap_or(existing.active);

    sqlx::query(
        r#"
        UPDATE habit_definitions
        SET name = ?1, schedule_rule = ?2, target_frequency = ?3, color = ?4, active = ?5
        WHERE id = ?6
        "#,
    )
    .bind(&name)
    .bind(&schedule_rule)
    .bind(target_frequency)
    .bind(&color)
    .bind(active)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update habit: {}", e)))?;

    let habit = sqlx::query_as::<_, HabitDefinition>(
        r#"
        SELECT id, name, schedule_rule, target_frequency, color, active, created_at
        FROM habit_definitions WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to load updated habit: {}", e)))?;

    let payload_json = json!({
        "id": habit.id,
        "name": habit.name,
        "schedule_rule": habit.schedule_rule,
        "target_frequency": habit.target_frequency,
        "color": habit.color,
        "active": habit.active,
    })
    .to_string();

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
    )
    .bind("habit_definition")
    .bind(&id)
    .bind("upsert")
    .bind(payload_json)
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(habit))
}

pub async fn delete_habit(
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
        DELETE FROM habit_definitions WHERE id = ?1
        "#,
    )
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete habit: {}", e)))?;

    if res.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Habit not found".to_string()));
    }

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'))
        "#,
    )
    .bind("habit_definition")
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

pub async fn toggle_habit(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<ToggleHabitRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    // Check if habit entry exists for habit_id & date
    let existing_entry_id = sqlx::query_scalar::<_, String>(
        r#"
        SELECT id FROM habit_entries WHERE habit_id = ?1 AND completion_date = ?2
        "#,
    )
    .bind(&id)
    .bind(&payload.date)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query entry: {}", e)))?;

    if let Some(entry_id) = existing_entry_id {
        // Toggle OFF: delete entry
        sqlx::query("DELETE FROM habit_entries WHERE id = ?1")
            .bind(&entry_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete entry: {}", e)))?;

        let _ = sqlx::query(
            r#"
            INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
            VALUES (?1, ?2, ?3, NULL, ?4, datetime('now'))
            "#,
        )
        .bind("habit_entry")
        .bind(&entry_id)
        .bind("delete")
        .bind(1)
        .execute(&mut *tx)
        .await;

        tx.commit()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

        Ok(Json(json!({ "completed": false, "date": payload.date })))
    } else {
        // Toggle ON: insert entry
        let entry_id = uuid::Uuid::new_v4().to_string();
        let note = payload.note.unwrap_or_default();

        sqlx::query(
            r#"
            INSERT INTO habit_entries (id, habit_id, completion_date, completed_at, note)
            VALUES (?1, ?2, ?3, datetime('now'), ?4)
            "#,
        )
        .bind(&entry_id)
        .bind(&id)
        .bind(&payload.date)
        .bind(&note)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert entry: {}", e)))?;

        let payload_json = json!({
            "id": entry_id,
            "habit_id": id,
            "completion_date": payload.date,
            "note": note,
        })
        .to_string();

        let _ = sqlx::query(
            r#"
            INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
            "#,
        )
        .bind("habit_entry")
        .bind(&entry_id)
        .bind("upsert")
        .bind(payload_json)
        .bind(1)
        .execute(&mut *tx)
        .await;

        tx.commit()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

        Ok(Json(json!({ "completed": true, "date": payload.date, "entry_id": entry_id })))
    }
}
