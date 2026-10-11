use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_goals_dynamic_progress_and_milestones() {
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

    // 2. Create focus lane
    let lane_req = Request::builder()
        .method("POST")
        .uri("/api/sync")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "tasks": [{
                    "id": "lane-arch",
                    "name": "Architecture",
                    "target_minutes": 60,
                    "color": "#6366f1"
                }]
            }))
            .unwrap(),
        ))
        .unwrap();
    let lane_res = app.clone().oneshot(lane_req).await.unwrap();
    assert_eq!(lane_res.status(), StatusCode::OK);

    // 3. Create Time Goal (50 Hours in October)
    let create_goal_req = Request::builder()
        .method("POST")
        .uri("/api/v1/goals")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "title": "50 Deep Work Hours",
                "goal_type": "time",
                "target_value": 50.0,
                "unit": "hours",
                "start_date": "2026-10-01",
                "target_date": "2026-10-31"
            }))
            .unwrap(),
        ))
        .unwrap();

    let create_goal_res = app.clone().oneshot(create_goal_req).await.unwrap();
    assert_eq!(create_goal_res.status(), StatusCode::OK);
    let bytes = to_bytes(create_goal_res.into_body(), usize::MAX).await.unwrap();
    let created_goal: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let goal_id = created_goal["id"].as_str().unwrap().to_string();

    // 4. Log 7200 seconds (= 2.0 hours) in October
    let session_req = Request::builder()
        .method("POST")
        .uri("/api/v1/focus-sessions")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "session-oct-1",
                "task_id": "lane-arch",
                "seconds": 7200,
                "note": "2 hours architecture work",
                "work_date": "2026-10-11"
            }))
            .unwrap(),
        ))
        .unwrap();

    let session_res = app.clone().oneshot(session_req).await.unwrap();
    assert_eq!(session_res.status(), StatusCode::OK);

    // 5. Query goals - dynamic engine should compute current_value = 2.0, progress = 4%
    let list_req = Request::builder()
        .method("GET")
        .uri("/api/v1/goals")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let list_res = app.clone().oneshot(list_req).await.unwrap();
    assert_eq!(list_res.status(), StatusCode::OK);
    let bytes = to_bytes(list_res.into_body(), usize::MAX).await.unwrap();
    let goals: Vec<serde_json::Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(goals.len(), 1);
    assert_eq!(goals[0]["id"], goal_id);
    assert_eq!(goals[0]["current_value"], 2.0);
    assert_eq!(goals[0]["progress_percentage"], 4.0);

    // 6. Add milestone
    let milestone_req = Request::builder()
        .method("POST")
        .uri(format!("/api/v1/goals/{}/milestones", goal_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "title": "Reach 25 hours milestone",
                "target_date": "2026-10-15"
            }))
            .unwrap(),
        ))
        .unwrap();

    let milestone_res = app.clone().oneshot(milestone_req).await.unwrap();
    assert_eq!(milestone_res.status(), StatusCode::OK);
    let bytes = to_bytes(milestone_res.into_body(), usize::MAX).await.unwrap();
    let created_ms: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let milestone_id = created_ms["id"].as_str().unwrap().to_string();

    // 7. Update milestone to completed
    let update_ms_req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/goals/{}/milestones/{}", goal_id, milestone_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "status": "completed"
            }))
            .unwrap(),
        ))
        .unwrap();

    let update_ms_res = app.clone().oneshot(update_ms_req).await.unwrap();
    assert_eq!(update_ms_res.status(), StatusCode::OK);
    let bytes = to_bytes(update_ms_res.into_body(), usize::MAX).await.unwrap();
    let updated_ms: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(updated_ms["status"], "completed");
    assert!(updated_ms["completed_at"].is_string());
}
