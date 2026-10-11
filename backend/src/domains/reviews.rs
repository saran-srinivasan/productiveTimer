use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{DailyReview, UpsertDailyReviewRequest, WeeklyReviewSummary};

pub async fn get_daily_review(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(date): Path<String>,
) -> Result<Json<Option<DailyReview>>, (StatusCode, String)> {
    let review = sqlx::query_as::<_, DailyReview>(
        r#"
        SELECT id, review_date, accomplishments, blockers, reflection, energy_rating, focus_rating, created_at, updated_at
        FROM daily_reviews
        WHERE review_date = ?1
        "#,
    )
    .bind(&date)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to query review: {}", e)))?;

    Ok(Json(review))
}

pub async fn upsert_daily_review(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(date): Path<String>,
    Json(payload): Json<UpsertDailyReviewRequest>,
) -> Result<Json<DailyReview>, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start tx: {}", e)))?;

    let existing = sqlx::query_as::<_, DailyReview>(
        r#"
        SELECT id, review_date, accomplishments, blockers, reflection, energy_rating, focus_rating, created_at, updated_at
        FROM daily_reviews
        WHERE review_date = ?1
        "#,
    )
    .bind(&date)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to check existing review: {}", e)))?;

    let accomplishments = payload.accomplishments.unwrap_or_default();
    let blockers = payload.blockers.unwrap_or_default();
    let reflection = payload.reflection.unwrap_or_default();

    let id = if let Some(ref rev) = existing {
        rev.id.clone()
    } else {
        uuid::Uuid::new_v4().to_string()
    };

    if existing.is_some() {
        sqlx::query(
            r#"
            UPDATE daily_reviews
            SET accomplishments = ?1, blockers = ?2, reflection = ?3, energy_rating = ?4, focus_rating = ?5, updated_at = datetime('now')
            WHERE id = ?6
            "#,
        )
        .bind(&accomplishments)
        .bind(&blockers)
        .bind(&reflection)
        .bind(payload.energy_rating)
        .bind(payload.focus_rating)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update daily review: {}", e)))?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO daily_reviews (id, review_date, accomplishments, blockers, reflection, energy_rating, focus_rating, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&id)
        .bind(&date)
        .bind(&accomplishments)
        .bind(&blockers)
        .bind(&reflection)
        .bind(payload.energy_rating)
        .bind(payload.focus_rating)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to insert daily review: {}", e)))?;
    }

    let review = sqlx::query_as::<_, DailyReview>(
        r#"
        SELECT id, review_date, accomplishments, blockers, reflection, energy_rating, focus_rating, created_at, updated_at
        FROM daily_reviews
        WHERE id = ?1
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to fetch daily review: {}", e)))?;

    let payload_json = json!({
        "id": review.id,
        "review_date": review.review_date,
        "accomplishments": review.accomplishments,
        "blockers": review.blockers,
        "reflection": review.reflection,
        "energy_rating": review.energy_rating,
        "focus_rating": review.focus_rating,
    })
    .to_string();

    let _ = sqlx::query(
        r#"
        INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        "#,
    )
    .bind("daily_review")
    .bind(&id)
    .bind("upsert")
    .bind(payload_json)
    .bind(1)
    .execute(&mut *tx)
    .await;

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to commit tx: {}", e)))?;

    Ok(Json(review))
}

pub async fn get_weekly_review(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(start_date): Path<String>,
) -> Result<Json<WeeklyReviewSummary>, (StatusCode, String)> {
    // Calculate end_date = start_date + 6 days
    let start_naive = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid start_date format, expected YYYY-MM-DD".to_string()))?;
    let end_naive = start_naive + chrono::Duration::days(6);
    let end_date = end_naive.format("%Y-%m-%d").to_string();

    // 1. Total focus seconds
    let total_focus_seconds = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(SUM(seconds), 0)
        FROM focus_sessions
        WHERE work_date >= ?1 AND work_date <= ?2
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    // 2. Completed actionable tasks in this week window
    let completed_tasks_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM action_tasks
        WHERE status = 'completed'
          AND (
            (completed_at >= ?1 AND completed_at <= ?2 || 'T23:59:59')
            OR (updated_at >= ?1 AND updated_at <= ?2 || 'T23:59:59')
          )
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    // 3. Workout count and volume
    let workout_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(DISTINCT id) FROM (
            SELECT id FROM workout_sessions WHERE work_date >= ?1 AND work_date <= ?2
            UNION
            SELECT id FROM workout_entries WHERE work_date >= ?1 AND work_date <= ?2
        )
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let total_workout_volume: f64 = sqlx::query_scalar::<_, Option<f64>>(
        r#"
        SELECT SUM(ws.weight * ws.reps)
        FROM workout_sets ws
        JOIN workout_exercises we ON ws.workout_exercise_id = we.id
        JOIN workout_sessions s ON we.session_id = s.id
        WHERE s.work_date >= ?1 AND s.work_date <= ?2 AND ws.completed = 1 AND ws.is_warmup = 0
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&pool)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    // 4. Habit adherence rate
    let active_habits_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM habit_definitions WHERE active = 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let habit_completions = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM habit_entries
        WHERE completion_date >= ?1 AND completion_date <= ?2
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let habit_completion_rate = if active_habits_count > 0 {
        let expected = (active_habits_count * 7) as f64;
        (habit_completions as f64 / expected).min(1.0)
    } else {
        1.0
    };

    // 5. Daily reviews for this 7-day period
    let daily_reviews = sqlx::query_as::<_, DailyReview>(
        r#"
        SELECT id, review_date, accomplishments, blockers, reflection, energy_rating, focus_rating, created_at, updated_at
        FROM daily_reviews
        WHERE review_date >= ?1 AND review_date <= ?2
        ORDER BY review_date ASC
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(WeeklyReviewSummary {
        start_date,
        end_date,
        total_focus_seconds,
        completed_tasks_count,
        workout_count,
        total_workout_volume,
        habit_completion_rate,
        daily_reviews,
    }))
}
