use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::auth::AuthenticatedOwner;
use crate::db::DbPool;
use crate::models::{
    AddWorkoutExerciseRequest, CompleteWorkoutResponse, CompleteWorkoutSessionRequest,
    CreateRoutineRequest, ExerciseHistoryPoint, ExerciseProgressionData, LogWorkoutSetRequest,
    PersonalRecordItem, RoutineExercise, StartWorkoutSessionRequest, UpdateRoutineRequest,
    UpdateWorkoutSetRequest, WorkoutExerciseRow, WorkoutExerciseWithSets, WorkoutRoutine,
    WorkoutRoutineWithExercises, WorkoutSessionDetail, WorkoutSessionRow, WorkoutSetRow,
};

#[derive(Debug, Deserialize)]
pub struct WorkoutSessionFilterQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<i64>,
}

fn calculate_1rm(weight: f64, reps: i64) -> f64 {
    if reps <= 0 || weight <= 0.0 {
        return 0.0;
    }
    if reps == 1 {
        weight
    } else if reps < 37 {
        // Brzycki Formula
        weight * (36.0 / (37.0 - reps as f64))
    } else {
        // Epley formula for very high reps
        weight * (1.0 + reps as f64 / 30.0)
    }
}

// ---------------------------------------------------------
// Routines CRUD
// ---------------------------------------------------------

pub async fn list_workout_routines(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Vec<WorkoutRoutineWithExercises>>, (StatusCode, String)> {
    let routines = sqlx::query_as::<_, WorkoutRoutine>(
        "SELECT id, name, description, created_at FROM workout_routines ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch routines failed: {}", e)))?;

    let mut result = Vec::new();
    for r in routines {
        let exercises = sqlx::query_as::<_, RoutineExercise>(
            "SELECT id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index FROM routine_exercises WHERE routine_id = ?1 ORDER BY order_index ASC",
        )
        .bind(&r.id)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        result.push(WorkoutRoutineWithExercises {
            id: r.id,
            name: r.name,
            description: r.description,
            created_at: r.created_at,
            exercises,
        });
    }

    Ok(Json(result))
}

pub async fn get_workout_routine(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<WorkoutRoutineWithExercises>, (StatusCode, String)> {
    let routine = sqlx::query_as::<_, WorkoutRoutine>(
        "SELECT id, name, description, created_at FROM workout_routines WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch routine failed: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Routine not found".to_string()))?;

    let exercises = sqlx::query_as::<_, RoutineExercise>(
        "SELECT id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index FROM routine_exercises WHERE routine_id = ?1 ORDER BY order_index ASC",
    )
    .bind(&routine.id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(WorkoutRoutineWithExercises {
        id: routine.id,
        name: routine.name,
        description: routine.description,
        created_at: routine.created_at,
        exercises,
    }))
}

pub async fn create_workout_routine(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateRoutineRequest>,
) -> Result<Json<WorkoutRoutineWithExercises>, (StatusCode, String)> {
    let routine_id = format!("routine_{}", Uuid::new_v4().simple());
    let now = Utc::now().to_rfc3339();
    let description = payload.description.unwrap_or_default();

    sqlx::query(
        "INSERT INTO workout_routines (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&routine_id)
    .bind(&payload.name)
    .bind(&description)
    .bind(&now)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert routine failed: {}", e)))?;

    let mut exercises = Vec::new();
    for (idx, ex) in payload.exercises.into_iter().enumerate() {
        let ex_id = format!("re_{}", Uuid::new_v4().simple());
        let order_index = ex.order_index.unwrap_or(idx as i64 + 1);
        let rest_seconds = ex.rest_seconds.unwrap_or(90);

        sqlx::query(
            r#"
            INSERT INTO routine_exercises 
            (id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
        )
        .bind(&ex_id)
        .bind(&routine_id)
        .bind(&ex.exercise_name)
        .bind(ex.target_sets)
        .bind(ex.target_reps)
        .bind(ex.target_rpe)
        .bind(rest_seconds)
        .bind(order_index)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert routine exercise failed: {}", e)))?;

        exercises.push(RoutineExercise {
            id: ex_id,
            routine_id: routine_id.clone(),
            exercise_name: ex.exercise_name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            target_rpe: ex.target_rpe,
            rest_seconds,
            order_index,
        });
    }

    Ok(Json(WorkoutRoutineWithExercises {
        id: routine_id,
        name: payload.name,
        description,
        created_at: now,
        exercises,
    }))
}

pub async fn update_workout_routine(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRoutineRequest>,
) -> Result<Json<WorkoutRoutineWithExercises>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, WorkoutRoutine>(
        "SELECT id, name, description, created_at FROM workout_routines WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch routine failed: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Routine not found".to_string()))?;

    let name = payload.name.unwrap_or(existing.name);
    let description = payload.description.unwrap_or(existing.description);

    sqlx::query("UPDATE workout_routines SET name = ?1, description = ?2 WHERE id = ?3")
        .bind(&name)
        .bind(&description)
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Update routine failed: {}", e)))?;

    if let Some(new_exercises) = payload.exercises {
        sqlx::query("DELETE FROM routine_exercises WHERE routine_id = ?1")
            .bind(&id)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete old routine exercises failed: {}", e)))?;

        for (idx, ex) in new_exercises.into_iter().enumerate() {
            let ex_id = format!("re_{}", Uuid::new_v4().simple());
            let order_index = ex.order_index.unwrap_or(idx as i64 + 1);
            let rest_seconds = ex.rest_seconds.unwrap_or(90);

            sqlx::query(
                r#"
                INSERT INTO routine_exercises 
                (id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                "#,
            )
            .bind(&ex_id)
            .bind(&id)
            .bind(&ex.exercise_name)
            .bind(ex.target_sets)
            .bind(ex.target_reps)
            .bind(ex.target_rpe)
            .bind(rest_seconds)
            .bind(order_index)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert updated routine exercise failed: {}", e)))?;
        }
    }

    let exercises = sqlx::query_as::<_, RoutineExercise>(
        "SELECT id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index FROM routine_exercises WHERE routine_id = ?1 ORDER BY order_index ASC",
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(WorkoutRoutineWithExercises {
        id,
        name,
        description,
        created_at: existing.created_at,
        exercises,
    }))
}

pub async fn delete_workout_routine(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_routines WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete routine failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

// ---------------------------------------------------------
// Workout Sessions Lifecycle
// ---------------------------------------------------------

async fn build_session_detail(
    pool: &DbPool,
    session: WorkoutSessionRow,
) -> Result<WorkoutSessionDetail, (StatusCode, String)> {
    let routine_name: Option<String> = if let Some(ref rid) = session.routine_id {
        sqlx::query_scalar("SELECT name FROM workout_routines WHERE id = ?1")
            .bind(rid)
            .fetch_optional(pool)
            .await
            .unwrap_or(None)
    } else {
        None
    };

    let exercises = sqlx::query_as::<_, WorkoutExerciseRow>(
        "SELECT id, session_id, exercise_name, order_index FROM workout_exercises WHERE session_id = ?1 ORDER BY order_index ASC",
    )
    .bind(&session.id)
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch session exercises failed: {}", e)))?;

    let mut exercise_details = Vec::new();
    let mut total_volume = 0.0;
    let mut total_completed_sets = 0;

    for ex in exercises {
        let sets = sqlx::query_as::<_, WorkoutSetRow>(
            "SELECT id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed FROM workout_sets WHERE workout_exercise_id = ?1 ORDER BY set_number ASC",
        )
        .bind(&ex.id)
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        for s in &sets {
            if s.completed && !s.is_warmup {
                let w = s.weight.unwrap_or(0.0);
                let r = s.reps.unwrap_or(0) as f64;
                total_volume += w * r;
                total_completed_sets += 1;
            }
        }

        exercise_details.push(WorkoutExerciseWithSets {
            id: ex.id,
            session_id: ex.session_id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            sets,
        });
    }

    Ok(WorkoutSessionDetail {
        id: session.id,
        routine_id: session.routine_id,
        routine_name,
        work_date: session.work_date,
        started_at: session.started_at,
        ended_at: session.ended_at,
        notes: session.notes,
        energy_rating: session.energy_rating,
        created_at: session.created_at,
        exercises: exercise_details,
        total_volume,
        total_completed_sets,
    })
}

pub async fn start_workout_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<StartWorkoutSessionRequest>,
) -> Result<Json<WorkoutSessionDetail>, (StatusCode, String)> {
    let now = Utc::now();
    let session_id = format!("wsess_{}", Uuid::new_v4().simple());
    let work_date = payload
        .work_date
        .unwrap_or_else(|| now.format("%Y-%m-%d").to_string());
    let started_at = payload.started_at.unwrap_or_else(|| now.to_rfc3339());
    let created_at = now.to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO workout_sessions 
        (id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at)
        VALUES (?1, ?2, ?3, ?4, NULL, '', NULL, ?5)
        "#,
    )
    .bind(&session_id)
    .bind(&payload.routine_id)
    .bind(&work_date)
    .bind(&started_at)
    .bind(&created_at)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Start workout session failed: {}", e)))?;

    // Seed exercises from routine if routine_id is supplied
    if let Some(ref rid) = payload.routine_id {
        let routine_exercises = sqlx::query_as::<_, RoutineExercise>(
            "SELECT id, routine_id, exercise_name, target_sets, target_reps, target_rpe, rest_seconds, order_index FROM routine_exercises WHERE routine_id = ?1 ORDER BY order_index ASC",
        )
        .bind(rid)
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        for re in routine_exercises {
            let we_id = format!("we_{}", Uuid::new_v4().simple());
            sqlx::query(
                "INSERT INTO workout_exercises (id, session_id, exercise_name, order_index) VALUES (?1, ?2, ?3, ?4)",
            )
            .bind(&we_id)
            .bind(&session_id)
            .bind(&re.exercise_name)
            .bind(re.order_index)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Seed workout exercise failed: {}", e)))?;

            // Seed target empty sets
            for s_num in 1..=re.target_sets {
                let ws_id = format!("ws_{}", Uuid::new_v4().simple());
                sqlx::query(
                    r#"
                    INSERT INTO workout_sets 
                    (id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed)
                    VALUES (?1, ?2, ?3, NULL, ?4, ?5, 0, 0)
                    "#,
                )
                .bind(&ws_id)
                .bind(&we_id)
                .bind(s_num)
                .bind(re.target_reps)
                .bind(re.target_rpe)
                .execute(&pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Seed workout set failed: {}", e)))?;
            }
        }
    } else if let Some(exercises) = payload.exercises {
        // Ad-hoc exercises specified by caller
        for (idx, ex_name) in exercises.into_iter().enumerate() {
            let we_id = format!("we_{}", Uuid::new_v4().simple());
            sqlx::query(
                "INSERT INTO workout_exercises (id, session_id, exercise_name, order_index) VALUES (?1, ?2, ?3, ?4)",
            )
            .bind(&we_id)
            .bind(&session_id)
            .bind(&ex_name)
            .bind(idx as i64 + 1)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Add initial exercise failed: {}", e)))?;
        }
    }

    let session_row = sqlx::query_as::<_, WorkoutSessionRow>(
        "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE id = ?1",
    )
    .bind(&session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch started session failed: {}", e)))?;

    let detail = build_session_detail(&pool, session_row).await?;
    Ok(Json(detail))
}

pub async fn get_active_workout_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Option<WorkoutSessionDetail>>, (StatusCode, String)> {
    let session_row = sqlx::query_as::<_, WorkoutSessionRow>(
        "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch active session failed: {}", e)))?;

    if let Some(row) = session_row {
        let detail = build_session_detail(&pool, row).await?;
        Ok(Json(Some(detail)))
    } else {
        Ok(Json(None))
    }
}

pub async fn list_workout_sessions(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Query(filters): Query<WorkoutSessionFilterQuery>,
) -> Result<Json<Vec<WorkoutSessionDetail>>, (StatusCode, String)> {
    let limit = filters.limit.unwrap_or(50).clamp(1, 200);

    let rows = if let (Some(s), Some(e)) = (filters.start_date, filters.end_date) {
        sqlx::query_as::<_, WorkoutSessionRow>(
            "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE work_date >= ?1 AND work_date <= ?2 ORDER BY work_date DESC, started_at DESC LIMIT ?3",
        )
        .bind(s)
        .bind(e)
        .bind(limit)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, WorkoutSessionRow>(
            "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions ORDER BY work_date DESC, started_at DESC LIMIT ?1",
        )
        .bind(limit)
        .fetch_all(&pool)
        .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch workout sessions failed: {}", e)))?;

    let mut result = Vec::new();
    for r in rows {
        let detail = build_session_detail(&pool, r).await?;
        result.push(detail);
    }

    Ok(Json(result))
}

pub async fn get_workout_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<WorkoutSessionDetail>, (StatusCode, String)> {
    let session_row = sqlx::query_as::<_, WorkoutSessionRow>(
        "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch session failed: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Workout session not found".to_string()))?;

    let detail = build_session_detail(&pool, session_row).await?;
    Ok(Json(detail))
}

pub async fn complete_workout_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<CompleteWorkoutSessionRequest>,
) -> Result<Json<CompleteWorkoutResponse>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, WorkoutSessionRow>(
        "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch session failed: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Workout session not found".to_string()))?;

    let ended_at = payload.ended_at.unwrap_or_else(|| Utc::now().to_rfc3339());
    let notes = payload.notes.unwrap_or_else(|| existing.notes.clone());
    let energy_rating = payload.energy_rating.or(existing.energy_rating);

    // Compute prior PRs before this session for comparison
    let current_detail = build_session_detail(&pool, existing).await?;

    let mut new_prs = Vec::new();
    for ex in &current_detail.exercises {
        // Calculate prior PR for this exercise (excluding this session)
        let prior_records = calculate_exercise_records_for_exercise(&pool, &ex.exercise_name, Some(&id)).await?;
        let post_records = calculate_exercise_records_for_exercise(&pool, &ex.exercise_name, None).await?;

        let mut is_new_pr = false;
        if let (Some(post_w), prior_w) = (post_records.heaviest_weight, prior_records.heaviest_weight) {
            if post_w > prior_w.unwrap_or(0.0) {
                is_new_pr = true;
            }
        }
        if let (Some(post_1rm), prior_1rm) = (post_records.estimated_1rm, prior_records.estimated_1rm) {
            if post_1rm > prior_1rm.unwrap_or(0.0) {
                is_new_pr = true;
            }
        }
        if let (Some(post_v), prior_v) = (post_records.max_volume_set, prior_records.max_volume_set) {
            if post_v > prior_v.unwrap_or(0.0) {
                is_new_pr = true;
            }
        }

        if is_new_pr {
            new_prs.push(post_records);
        }
    }

    sqlx::query(
        "UPDATE workout_sessions SET ended_at = ?1, notes = ?2, energy_rating = ?3 WHERE id = ?4",
    )
    .bind(&ended_at)
    .bind(&notes)
    .bind(energy_rating)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Complete workout session failed: {}", e)))?;

    let updated_row = sqlx::query_as::<_, WorkoutSessionRow>(
        "SELECT id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at FROM workout_sessions WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch completed session failed: {}", e)))?;

    let detail = build_session_detail(&pool, updated_row).await?;

    Ok(Json(CompleteWorkoutResponse {
        session: detail,
        new_prs,
    }))
}

pub async fn delete_workout_session(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_sessions WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete session failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

// ---------------------------------------------------------
// Workout Exercises & Sets Real-Time Logging
// ---------------------------------------------------------

pub async fn add_workout_exercise(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<AddWorkoutExerciseRequest>,
) -> Result<Json<WorkoutExerciseWithSets>, (StatusCode, String)> {
    let ex_id = format!("we_{}", Uuid::new_v4().simple());
    let order_index = if let Some(idx) = payload.order_index {
        idx
    } else {
        let max_idx: i64 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(order_index), 0) FROM workout_exercises WHERE session_id = ?1",
        )
        .bind(&payload.session_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
        max_idx + 1
    };

    sqlx::query(
        "INSERT INTO workout_exercises (id, session_id, exercise_name, order_index) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&ex_id)
    .bind(&payload.session_id)
    .bind(&payload.exercise_name)
    .bind(order_index)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert workout exercise failed: {}", e)))?;

    Ok(Json(WorkoutExerciseWithSets {
        id: ex_id,
        session_id: payload.session_id,
        exercise_name: payload.exercise_name,
        order_index,
        sets: Vec::new(),
    }))
}

pub async fn delete_workout_exercise(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_exercises WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete workout exercise failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

pub async fn log_workout_set(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<LogWorkoutSetRequest>,
) -> Result<Json<WorkoutSetRow>, (StatusCode, String)> {
    let set_id = payload.id.unwrap_or_else(|| format!("ws_{}", Uuid::new_v4().simple()));
    let is_warmup = payload.is_warmup.unwrap_or(false);
    let completed = payload.completed.unwrap_or(true);

    sqlx::query(
        r#"
        INSERT INTO workout_sets 
        (id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            workout_exercise_id = excluded.workout_exercise_id,
            set_number = excluded.set_number,
            weight = excluded.weight,
            reps = excluded.reps,
            rpe = excluded.rpe,
            is_warmup = excluded.is_warmup,
            completed = excluded.completed
        "#,
    )
    .bind(&set_id)
    .bind(&payload.workout_exercise_id)
    .bind(payload.set_number)
    .bind(payload.weight)
    .bind(payload.reps)
    .bind(payload.rpe)
    .bind(is_warmup)
    .bind(completed)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Log workout set failed: {}", e)))?;

    let row = sqlx::query_as::<_, WorkoutSetRow>(
        "SELECT id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed FROM workout_sets WHERE id = ?1",
    )
    .bind(&set_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch logged set failed: {}", e)))?;

    Ok(Json(row))
}

pub async fn update_workout_set(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateWorkoutSetRequest>,
) -> Result<Json<WorkoutSetRow>, (StatusCode, String)> {
    let existing = sqlx::query_as::<_, WorkoutSetRow>(
        "SELECT id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed FROM workout_sets WHERE id = ?1",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch set failed: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Set not found".to_string()))?;

    let weight = payload.weight.or(existing.weight);
    let reps = payload.reps.or(existing.reps);
    let rpe = payload.rpe.or(existing.rpe);
    let is_warmup = payload.is_warmup.unwrap_or(existing.is_warmup);
    let completed = payload.completed.unwrap_or(existing.completed);

    sqlx::query(
        "UPDATE workout_sets SET weight = ?1, reps = ?2, rpe = ?3, is_warmup = ?4, completed = ?5 WHERE id = ?6",
    )
    .bind(weight)
    .bind(reps)
    .bind(rpe)
    .bind(is_warmup)
    .bind(completed)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Update workout set failed: {}", e)))?;

    let row = sqlx::query_as::<_, WorkoutSetRow>(
        "SELECT id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed FROM workout_sets WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch updated set failed: {}", e)))?;

    Ok(Json(row))
}

pub async fn delete_workout_set(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_sets WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete workout set failed: {}", e)))?;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}

// ---------------------------------------------------------
// Progressive Overload & PR Engine (TASK-4.3.1, TASK-4.3.2)
// ---------------------------------------------------------

#[derive(Debug, sqlx::FromRow)]
struct SetQueryRow {
    work_date: String,
    set_number: i64,
    weight: Option<f64>,
    reps: Option<i64>,
}

async fn calculate_exercise_records_for_exercise(
    pool: &DbPool,
    exercise_name: &str,
    exclude_session_id: Option<&str>,
) -> Result<PersonalRecordItem, (StatusCode, String)> {
    let mut query = String::from(
        r#"
        SELECT s.work_date, ws.set_number, ws.weight, ws.reps
        FROM workout_sets ws
        JOIN workout_exercises we ON ws.workout_exercise_id = we.id
        JOIN workout_sessions s ON we.session_id = s.id
        WHERE LOWER(we.exercise_name) = LOWER(?1) AND ws.completed = 1 AND ws.is_warmup = 0
        "#,
    );

    if exclude_session_id.is_some() {
        query.push_str(" AND s.id != ?2 ");
    }
    query.push_str(" ORDER BY s.work_date ASC, ws.set_number ASC ");

    let rows: Vec<SetQueryRow> = if let Some(ex_id) = exclude_session_id {
        sqlx::query_as(&query)
            .bind(exercise_name)
            .bind(ex_id)
            .fetch_all(pool)
            .await
    } else {
        sqlx::query_as(&query)
            .bind(exercise_name)
            .fetch_all(pool)
            .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Calculate records failed: {}", e)))?;

    let mut heaviest_weight: Option<f64> = None;
    let mut max_reps: Option<i64> = None;
    let mut estimated_1rm: Option<f64> = None;
    let mut max_volume_set: Option<f64> = None;

    for row in rows {
        if let (Some(w), Some(r)) = (row.weight, row.reps) {
            if w > heaviest_weight.unwrap_or(0.0) {
                heaviest_weight = Some(w);
            }
            if r > max_reps.unwrap_or(0) {
                max_reps = Some(r);
            }
            let one_rm = calculate_1rm(w, r);
            if one_rm > estimated_1rm.unwrap_or(0.0) {
                estimated_1rm = Some(one_rm);
            }
            let vol = w * r as f64;
            if vol > max_volume_set.unwrap_or(0.0) {
                max_volume_set = Some(vol);
            }
        }
    }

    Ok(PersonalRecordItem {
        exercise_name: exercise_name.to_string(),
        heaviest_weight,
        max_reps,
        estimated_1rm,
        max_volume_set,
    })
}

pub async fn list_all_prs(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<Json<Vec<PersonalRecordItem>>, (StatusCode, String)> {
    let exercises: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT exercise_name FROM workout_exercises ORDER BY exercise_name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch exercise names failed: {}", e)))?;

    let mut prs = Vec::new();
    for ex in exercises {
        let rec = calculate_exercise_records_for_exercise(&pool, &ex, None).await?;
        prs.push(rec);
    }

    Ok(Json(prs))
}

pub async fn get_exercise_progression(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(exercise_name): Path<String>,
) -> Result<Json<ExerciseProgressionData>, (StatusCode, String)> {
    let records = calculate_exercise_records_for_exercise(&pool, &exercise_name, None).await?;

    let rows = sqlx::query_as::<_, SetQueryRow>(
        r#"
        SELECT s.work_date, ws.set_number, ws.weight, ws.reps
        FROM workout_sets ws
        JOIN workout_exercises we ON ws.workout_exercise_id = we.id
        JOIN workout_sessions s ON we.session_id = s.id
        WHERE LOWER(we.exercise_name) = LOWER(?1) AND ws.completed = 1 AND ws.is_warmup = 0
        ORDER BY s.work_date ASC, ws.set_number ASC
        "#,
    )
    .bind(&exercise_name)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Fetch progression history failed: {}", e)))?;

    let mut history = Vec::new();
    for row in rows {
        if let (Some(w), Some(r)) = (row.weight, row.reps) {
            history.push(ExerciseHistoryPoint {
                work_date: row.work_date,
                set_number: row.set_number,
                weight: w,
                reps: r,
                estimated_1rm: calculate_1rm(w, r),
                volume: w * r as f64,
            });
        }
    }

    Ok(Json(ExerciseProgressionData {
        exercise_name,
        records,
        history,
    }))
}

// ---------------------------------------------------------
// Legacy Delete Endpoint (Backwards-compatibility)
// ---------------------------------------------------------

pub async fn delete_workout(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    sqlx::query("DELETE FROM workout_entries WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Delete workout failed: {}", e),
            )
        })?;

    let _ = sqlx::query(
        "INSERT INTO sync_changes (entity_type, entity_id, op_type, payload, version, created_at) VALUES ('workout', ?1, 'delete', NULL, 1, datetime('now'))",
    )
    .bind(&id)
    .execute(&pool)
    .await;

    Ok(Json(json!({ "status": "deleted", "id": id })))
}
