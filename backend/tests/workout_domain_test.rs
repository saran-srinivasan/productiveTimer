use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_structured_workout_lifecycle_and_pr_engine() {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // 1. Setup auth
    let setup_req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "password": "correct-horse-battery-staple"
            }))
            .unwrap(),
        ))
        .unwrap();

    let setup_res = app.clone().oneshot(setup_req).await.unwrap();
    let body_bytes = to_bytes(setup_res.into_body(), usize::MAX).await.unwrap();
    let setup_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let token = setup_json["token"].as_str().unwrap().to_string();

    // 2. Create Workout Routine (Push Day)
    let routine_req = Request::builder()
        .method("POST")
        .uri("/api/v1/workouts/routines")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "name": "Push Strength Day",
                "description": "Chest, Shoulders, and Triceps focus",
                "exercises": [
                    {
                        "exercise_name": "Bench Press",
                        "target_sets": 3,
                        "target_reps": 8,
                        "target_rpe": 8.0,
                        "rest_seconds": 120
                    },
                    {
                        "exercise_name": "Overhead Press",
                        "target_sets": 3,
                        "target_reps": 8,
                        "target_rpe": 7.5,
                        "rest_seconds": 90
                    }
                ]
            }))
            .unwrap(),
        ))
        .unwrap();

    let routine_res = app.clone().oneshot(routine_req).await.unwrap();
    assert_eq!(routine_res.status(), StatusCode::OK);
    let routine_bytes = to_bytes(routine_res.into_body(), usize::MAX).await.unwrap();
    let routine_json: serde_json::Value = serde_json::from_slice(&routine_bytes).unwrap();
    let routine_id = routine_json["id"].as_str().unwrap().to_string();
    assert_eq!(routine_json["exercises"].as_array().unwrap().len(), 2);

    // 3. Start Workout Session from Routine
    let start_req = Request::builder()
        .method("POST")
        .uri("/api/v1/workouts/sessions/start")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "routine_id": routine_id,
                "work_date": "2026-10-11"
            }))
            .unwrap(),
        ))
        .unwrap();

    let start_res = app.clone().oneshot(start_req).await.unwrap();
    assert_eq!(start_res.status(), StatusCode::OK);
    let start_bytes = to_bytes(start_res.into_body(), usize::MAX).await.unwrap();
    let start_json: serde_json::Value = serde_json::from_slice(&start_bytes).unwrap();
    let session_id = start_json["id"].as_str().unwrap().to_string();
    assert!(start_json["ended_at"].is_null());
    let exercises_arr = start_json["exercises"].as_array().unwrap();
    assert_eq!(exercises_arr.len(), 2);

    // Bench press is exercise 0
    let bp_exercise_id = exercises_arr[0]["id"].as_str().unwrap().to_string();
    let bp_sets = exercises_arr[0]["sets"].as_array().unwrap();
    assert_eq!(bp_sets.len(), 3); // 3 seeded sets

    // 4. Verify Active Session Endpoint for Interruption Recovery (TASK-4.2.3)
    let active_req = Request::builder()
        .method("GET")
        .uri("/api/v1/workouts/sessions/active")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let active_res = app.clone().oneshot(active_req).await.unwrap();
    assert_eq!(active_res.status(), StatusCode::OK);
    let active_bytes = to_bytes(active_res.into_body(), usize::MAX).await.unwrap();
    let active_json: serde_json::Value = serde_json::from_slice(&active_bytes).unwrap();
    assert_eq!(active_json["id"].as_str().unwrap(), session_id);

    // 5. Log sets for Bench Press
    // Set 1: 80kg x 8 reps
    let set1_req = Request::builder()
        .method("POST")
        .uri("/api/v1/workouts/sets")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": bp_sets[0]["id"],
                "workout_exercise_id": bp_exercise_id,
                "set_number": 1,
                "weight": 80.0,
                "reps": 8,
                "rpe": 7.5,
                "is_warmup": false,
                "completed": true
            }))
            .unwrap(),
        ))
        .unwrap();
    let set1_res = app.clone().oneshot(set1_req).await.unwrap();
    assert_eq!(set1_res.status(), StatusCode::OK);

    // Set 2: 90kg x 8 reps
    let set2_req = Request::builder()
        .method("POST")
        .uri("/api/v1/workouts/sets")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": bp_sets[1]["id"],
                "workout_exercise_id": bp_exercise_id,
                "set_number": 2,
                "weight": 90.0,
                "reps": 8,
                "rpe": 8.5,
                "is_warmup": false,
                "completed": true
            }))
            .unwrap(),
        ))
        .unwrap();
    let set2_res = app.clone().oneshot(set2_req).await.unwrap();
    assert_eq!(set2_res.status(), StatusCode::OK);

    // Set 3: 100kg x 5 reps (Brzycki 1RM = 100 * (36 / 32) = 112.5 kg)
    let set3_req = Request::builder()
        .method("POST")
        .uri("/api/v1/workouts/sets")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": bp_sets[2]["id"],
                "workout_exercise_id": bp_exercise_id,
                "set_number": 3,
                "weight": 100.0,
                "reps": 5,
                "rpe": 9.0,
                "is_warmup": false,
                "completed": true
            }))
            .unwrap(),
        ))
        .unwrap();
    let set3_res = app.clone().oneshot(set3_req).await.unwrap();
    assert_eq!(set3_res.status(), StatusCode::OK);

    // 6. Complete Workout Session & Verify PR calculation (TASK-4.3.1)
    let complete_req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/workouts/sessions/{}/complete", session_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "notes": "Solid heavy push day",
                "energy_rating": 5
            }))
            .unwrap(),
        ))
        .unwrap();

    let complete_res = app.clone().oneshot(complete_req).await.unwrap();
    assert_eq!(complete_res.status(), StatusCode::OK);
    let complete_bytes = to_bytes(complete_res.into_body(), usize::MAX).await.unwrap();
    let complete_json: serde_json::Value = serde_json::from_slice(&complete_bytes).unwrap();

    // Verify session updated
    assert_eq!(complete_json["session"]["energy_rating"], 5);
    // Total volume = (80 * 8) + (90 * 8) + (100 * 5) = 640 + 720 + 500 = 1860 kg
    assert_eq!(complete_json["session"]["total_volume"], 1860.0);
    assert_eq!(complete_json["session"]["total_completed_sets"], 3);

    // Verify PR flagged for Bench Press
    let new_prs = complete_json["new_prs"].as_array().unwrap();
    assert!(!new_prs.is_empty(), "Should flag new PR for Bench Press");
    let bp_pr = new_prs.iter().find(|p| p["exercise_name"] == "Bench Press").unwrap();
    assert_eq!(bp_pr["heaviest_weight"], 100.0);
    assert_eq!(bp_pr["max_reps"], 8);
    // 1RM for 100kg x 5 reps = 112.5 kg
    let est_1rm = bp_pr["estimated_1rm"].as_f64().unwrap();
    assert!((est_1rm - 112.5).abs() < 0.1);

    // 7. Test Exercise Progression Endpoint (TASK-4.3.2)
    let prog_req = Request::builder()
        .method("GET")
        .uri("/api/v1/workouts/exercises/Bench%20Press/progression")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let prog_res = app.clone().oneshot(prog_req).await.unwrap();
    assert_eq!(prog_res.status(), StatusCode::OK);
    let prog_bytes = to_bytes(prog_res.into_body(), usize::MAX).await.unwrap();
    let prog_json: serde_json::Value = serde_json::from_slice(&prog_bytes).unwrap();
    assert_eq!(prog_json["exercise_name"], "Bench Press");
    assert_eq!(prog_json["history"].as_array().unwrap().len(), 3);

    // 8. Test Cross-Domain Integration: Goals & Weekly Review (TASK-4.3.3)
    // Create training goal
    let goal_req = Request::builder()
        .method("POST")
        .uri("/api/v1/goals")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "title": "Weekly Push Sessions",
                "goal_type": "training",
                "target_value": 1.0,
                "unit": "workouts",
                "start_date": "2026-10-10",
                "target_date": "2026-10-17"
            }))
            .unwrap(),
        ))
        .unwrap();

    let goal_res = app.clone().oneshot(goal_req).await.unwrap();
    assert_eq!(goal_res.status(), StatusCode::OK);
    let goal_bytes = to_bytes(goal_res.into_body(), usize::MAX).await.unwrap();
    let goal_json: serde_json::Value = serde_json::from_slice(&goal_bytes).unwrap();
    let goal_id = goal_json["id"].as_str().unwrap();

    // Query list_goals which computes dynamic calculations
    let list_goals_req = Request::builder()
        .method("GET")
        .uri("/api/v1/goals")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let list_goals_res = app.clone().oneshot(list_goals_req).await.unwrap();
    assert_eq!(list_goals_res.status(), StatusCode::OK);
    let list_bytes = to_bytes(list_goals_res.into_body(), usize::MAX).await.unwrap();
    let list_json: serde_json::Value = serde_json::from_slice(&list_bytes).unwrap();
    let goals_arr = list_json.as_array().unwrap();
    let matched_goal = goals_arr.iter().find(|g| g["id"] == goal_id).unwrap();

    // Goal dynamically counted 1 session and reached 100% progress!
    assert_eq!(matched_goal["current_value"], 1.0);
    assert_eq!(matched_goal["progress_percentage"], 100.0);

    // Check Weekly Review Summary
    let review_req = Request::builder()
        .method("GET")
        .uri("/api/v1/weekly-reviews/2026-10-10")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let review_res = app.clone().oneshot(review_req).await.unwrap();
    assert_eq!(review_res.status(), StatusCode::OK);
    let review_bytes = to_bytes(review_res.into_body(), usize::MAX).await.unwrap();
    let review_json: serde_json::Value = serde_json::from_slice(&review_bytes).unwrap();
    assert_eq!(review_json["workout_count"], 1);
    assert_eq!(review_json["total_workout_volume"], 1860.0);
}

#[tokio::test]
async fn test_legacy_workout_backfill_migration_parity() {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");

    // Insert legacy workout entry
    sqlx::query(
        r#"
        INSERT INTO workout_entries (id, work_date, kind, exercise, sets, reps, weight, duration_minutes, distance, intensity, note, created_at)
        VALUES ('leg_1', '2026-10-09', 'strength', 'Barbell Deadlift', 4, 6, 140.0, NULL, NULL, 'high', 'Heavy pulls', '2026-10-09T10:00:00Z')
        "#
    )
    .execute(&pool)
    .await
    .expect("insert legacy workout");

    // Re-run backfill migration logic on DB
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO workout_sessions (id, routine_id, work_date, started_at, ended_at, notes, energy_rating, created_at)
        SELECT 'session_legacy_' || work_date, NULL, work_date, MIN(created_at), MAX(created_at), 'Migrated from legacy workout entries', NULL, MIN(created_at)
        FROM workout_entries GROUP BY work_date;

        INSERT OR IGNORE INTO workout_exercises (id, session_id, exercise_name, order_index)
        SELECT 'we_' || id, 'session_legacy_' || work_date, exercise, ROW_NUMBER() OVER (PARTITION BY work_date ORDER BY created_at, id)
        FROM workout_entries;

        WITH RECURSIVE seq(n) AS (
            SELECT 1
            UNION ALL
            SELECT n + 1 FROM seq WHERE n < 100
        )
        INSERT OR IGNORE INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, rpe, is_warmup, completed)
        SELECT 'ws_' || e.id || '_' || seq.n, 'we_' || e.id, seq.n, e.weight, e.reps, NULL, 0, 1
        FROM workout_entries e
        JOIN seq ON seq.n <= CASE WHEN e.sets IS NOT NULL AND e.sets > 0 THEN e.sets ELSE 1 END;
        "#
    )
    .execute(&pool)
    .await
    .expect("run backfill");

    // Assert parity
    let session_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workout_sessions WHERE id = 'session_legacy_2026-10-09'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(session_count, 1);

    let exercise_name: String = sqlx::query_scalar("SELECT exercise_name FROM workout_exercises WHERE id = 'we_leg_1'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(exercise_name, "Barbell Deadlift");

    let sets_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workout_sets WHERE workout_exercise_id = 'we_leg_1'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(sets_count, 4);

    let total_volume: f64 = sqlx::query_scalar("SELECT SUM(weight * reps) FROM workout_sets WHERE workout_exercise_id = 'we_leg_1'")
        .fetch_one(&pool)
        .await
        .unwrap();
    // 4 sets * 6 reps * 140kg = 3360 kg
    assert_eq!(total_volume, 3360.0);
}
