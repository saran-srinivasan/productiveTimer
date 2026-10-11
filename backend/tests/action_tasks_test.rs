use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_action_tasks_lifecycle_and_session_linking() {
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

    // 2. Create a focus lane task first
    let lane_req = Request::builder()
        .method("POST")
        .uri("/api/sync")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "tasks": [{
                    "id": "lane-coding",
                    "name": "Deep Coding",
                    "target_minutes": 60,
                    "color": "#3b82f6"
                }]
            }))
            .unwrap(),
        ))
        .unwrap();
    let lane_res = app.clone().oneshot(lane_req).await.unwrap();
    assert_eq!(lane_res.status(), StatusCode::OK);

    // 3. Create project
    let proj_req = Request::builder()
        .method("POST")
        .uri("/api/v1/projects")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "name": "Core Engine Refactor",
                "color": "#10b981"
            }))
            .unwrap(),
        ))
        .unwrap();
    let proj_res = app.clone().oneshot(proj_req).await.unwrap();
    assert_eq!(proj_res.status(), StatusCode::OK);
    let proj_bytes = to_bytes(proj_res.into_body(), usize::MAX).await.unwrap();
    let project: serde_json::Value = serde_json::from_slice(&proj_bytes).unwrap();
    let project_id = project["id"].as_str().unwrap().to_string();

    // 4. Create Action Task
    let create_task_req = Request::builder()
        .method("POST")
        .uri("/api/v1/tasks")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "title": "Implement SQLite connection pooling",
                "description": "Ensure Wal mode and 5 pool conns",
                "project_id": project_id,
                "focus_task_id": "lane-coding",
                "status": "ready",
                "priority": "high",
                "estimate_minutes": 45
            }))
            .unwrap(),
        ))
        .unwrap();

    let create_task_res = app.clone().oneshot(create_task_req).await.unwrap();
    let status = create_task_res.status();
    let bytes = to_bytes(create_task_res.into_body(), usize::MAX).await.unwrap();
    if status != StatusCode::OK {
        panic!("create_task failed with {}: {}", status, String::from_utf8_lossy(&bytes));
    }
    let created_task: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let task_id = created_task["id"].as_str().unwrap().to_string();
    assert_eq!(created_task["status"], "ready");
    assert_eq!(created_task["priority"], "high");
    assert_eq!(created_task["estimate_minutes"], 45);

    // 5. Query tasks by status
    let query_req = Request::builder()
        .method("GET")
        .uri("/api/v1/tasks?status=ready&priority=high")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let query_res = app.clone().oneshot(query_req).await.unwrap();
    assert_eq!(query_res.status(), StatusCode::OK);
    let bytes = to_bytes(query_res.into_body(), usize::MAX).await.unwrap();
    let tasks: Vec<serde_json::Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["id"], task_id);

    // 6. Complete focus session linked to this action task
    let session_req = Request::builder()
        .method("POST")
        .uri("/api/v1/focus-sessions")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "session-linked-1",
                "task_id": "lane-coding",
                "action_task_id": task_id,
                "seconds": 2700,
                "note": "Finished connection pooling logic",
                "work_date": "2026-10-11"
            }))
            .unwrap(),
        ))
        .unwrap();

    let session_res = app.clone().oneshot(session_req).await.unwrap();
    assert_eq!(session_res.status(), StatusCode::OK);

    // 7. Verify session retrieved includes action_task_id
    let get_sessions_req = Request::builder()
        .method("GET")
        .uri("/api/v1/focus-sessions")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_sessions_res = app.clone().oneshot(get_sessions_req).await.unwrap();
    assert_eq!(get_sessions_res.status(), StatusCode::OK);
    let bytes = to_bytes(get_sessions_res.into_body(), usize::MAX).await.unwrap();
    let sessions: Vec<serde_json::Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0]["action_task_id"], task_id);

    // 8. Update task status to completed
    let update_req = Request::builder()
        .method("PATCH")
        .uri(format!("/api/v1/tasks/{}", task_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "status": "completed",
                "completion_notes": "Tested in memory pool"
            }))
            .unwrap(),
        ))
        .unwrap();

    let update_res = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_res.status(), StatusCode::OK);
    let bytes = to_bytes(update_res.into_body(), usize::MAX).await.unwrap();
    let updated: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(updated["status"], "completed");
    assert!(updated["completed_at"].is_string());

    // 9. Verify project rollups reflect the task and focus seconds
    let proj_rollup_req = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/projects/{}", project_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let proj_rollup_res = app.clone().oneshot(proj_rollup_req).await.unwrap();
    assert_eq!(proj_rollup_res.status(), StatusCode::OK);
    let bytes = to_bytes(proj_rollup_res.into_body(), usize::MAX).await.unwrap();
    let proj_summary: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(proj_summary["task_count"], 1);
    assert_eq!(proj_summary["total_focus_seconds"], 2700);
}
