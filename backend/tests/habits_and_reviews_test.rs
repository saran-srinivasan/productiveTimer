use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_habits_streaks_and_review_lifecycle() {
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

    // 2. Create Habit definition
    let create_habit_req = Request::builder()
        .method("POST")
        .uri("/api/v1/habits")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "habit-deep-work",
                "name": "Daily Deep Work 90m",
                "schedule_rule": "daily",
                "color": "#10b981"
            }))
            .unwrap(),
        ))
        .unwrap();
    let habit_res = app.clone().oneshot(create_habit_req).await.unwrap();
    assert_eq!(habit_res.status(), StatusCode::OK);

    // 3. Toggle habit for 2 consecutive days: 2026-10-10 and 2026-10-11
    for date in &["2026-10-10", "2026-10-11"] {
        let toggle_req = Request::builder()
            .method("POST")
            .uri("/api/v1/habits/habit-deep-work/toggle")
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                serde_json::to_vec(&serde_json::json!({
                    "date": date,
                    "note": "Completed first thing in the morning"
                }))
                .unwrap(),
            ))
            .unwrap();
        let toggle_res = app.clone().oneshot(toggle_req).await.unwrap();
        assert_eq!(toggle_res.status(), StatusCode::OK);
        let toggle_bytes = to_bytes(toggle_res.into_body(), usize::MAX).await.unwrap();
        let toggle_json: serde_json::Value = serde_json::from_slice(&toggle_bytes).unwrap();
        assert_eq!(toggle_json["completed"], true);
    }

    // 4. Query habits: verify current streak is 2
    let list_req = Request::builder()
        .method("GET")
        .uri("/api/v1/habits")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let list_res = app.clone().oneshot(list_req).await.unwrap();
    assert_eq!(list_res.status(), StatusCode::OK);
    let list_bytes = to_bytes(list_res.into_body(), usize::MAX).await.unwrap();
    let habits_json: serde_json::Value = serde_json::from_slice(&list_bytes).unwrap();
    let habit_arr = habits_json.as_array().unwrap();
    assert_eq!(habit_arr.len(), 1);
    assert_eq!(habit_arr[0]["current_streak"], 2);
    assert_eq!(habit_arr[0]["recent_dates"].as_array().unwrap().len(), 2);

    // 5. Upsert Daily Review for 2026-10-11
    let review_req = Request::builder()
        .method("PUT")
        .uri("/api/v1/daily-reviews/2026-10-11")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "accomplishments": "Completed Phase 2 backend & frontend architectures",
                "blockers": "Minor context window compaction",
                "reflection": "High velocity paired programming with caveman precision",
                "energy_rating": 5,
                "focus_rating": 5
            }))
            .unwrap(),
        ))
        .unwrap();
    let review_res = app.clone().oneshot(review_req).await.unwrap();
    assert_eq!(review_res.status(), StatusCode::OK);

    // 6. Query Daily Review for 2026-10-11
    let get_rev_req = Request::builder()
        .method("GET")
        .uri("/api/v1/daily-reviews/2026-10-11")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let get_rev_res = app.clone().oneshot(get_rev_req).await.unwrap();
    assert_eq!(get_rev_res.status(), StatusCode::OK);
    let get_rev_bytes = to_bytes(get_rev_res.into_body(), usize::MAX).await.unwrap();
    let rev_json: serde_json::Value = serde_json::from_slice(&get_rev_bytes).unwrap();
    assert_eq!(rev_json["energy_rating"], 5);
    assert_eq!(rev_json["focus_rating"], 5);
    assert!(rev_json["accomplishments"].as_str().unwrap().contains("Phase 2"));

    // 7. Query Weekly Review for week starting 2026-10-05 (which contains Oct 10 and 11)
    let weekly_req = Request::builder()
        .method("GET")
        .uri("/api/v1/weekly-reviews/2026-10-05")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let weekly_res = app.clone().oneshot(weekly_req).await.unwrap();
    assert_eq!(weekly_res.status(), StatusCode::OK);
    let weekly_bytes = to_bytes(weekly_res.into_body(), usize::MAX).await.unwrap();
    let weekly_json: serde_json::Value = serde_json::from_slice(&weekly_bytes).unwrap();
    assert_eq!(weekly_json["start_date"], "2026-10-05");
    assert_eq!(weekly_json["end_date"], "2026-10-11");
    assert_eq!(weekly_json["daily_reviews"].as_array().unwrap().len(), 1);
}
