use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_planner_lifecycle_and_task_joining() {
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

    // 2. Create project
    let proj_req = Request::builder()
        .method("POST")
        .uri("/api/v1/projects")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "proj-deepwork",
                "name": "Deep Work Engine",
                "color": "#3b82f6"
            }))
            .unwrap(),
        ))
        .unwrap();
    let proj_res = app.clone().oneshot(proj_req).await.unwrap();
    assert_eq!(proj_res.status(), StatusCode::OK);

    // 3. Create action task
    let task_req = Request::builder()
        .method("POST")
        .uri("/api/v1/tasks")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "task-planner-1",
                "title": "Design Day Planner Matrix",
                "project_id": "proj-deepwork",
                "priority": "high",
                "estimate_minutes": 120
            }))
            .unwrap(),
        ))
        .unwrap();
    let task_res = app.clone().oneshot(task_req).await.unwrap();
    assert_eq!(task_res.status(), StatusCode::OK);

    // 4. Create planned block
    let block_req = Request::builder()
        .method("POST")
        .uri("/api/v1/planned-blocks")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "id": "block-morning-1",
                "action_task_id": "task-planner-1",
                "plan_date": "2026-10-15",
                "start_at": "09:00",
                "end_at": "11:00",
                "status": "planned",
                "notes": "Uninterrupted deep focus block"
            }))
            .unwrap(),
        ))
        .unwrap();
    let block_res = app.clone().oneshot(block_req).await.unwrap();
    assert_eq!(block_res.status(), StatusCode::OK);
    let block_bytes = to_bytes(block_res.into_body(), usize::MAX).await.unwrap();
    let block_json: serde_json::Value = serde_json::from_slice(&block_bytes).unwrap();
    assert_eq!(block_json["id"], "block-morning-1");
    assert_eq!(block_json["task_title"], "Design Day Planner Matrix");
    assert_eq!(block_json["project_name"], "Deep Work Engine");

    // 5. Query planned blocks for date
    let list_req = Request::builder()
        .method("GET")
        .uri("/api/v1/planned-blocks?date=2026-10-15")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let list_res = app.clone().oneshot(list_req).await.unwrap();
    assert_eq!(list_res.status(), StatusCode::OK);
    let list_bytes = to_bytes(list_res.into_body(), usize::MAX).await.unwrap();
    let list_json: serde_json::Value = serde_json::from_slice(&list_bytes).unwrap();
    let blocks = list_json.as_array().unwrap();
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0]["start_at"], "09:00");
    assert_eq!(blocks[0]["end_at"], "11:00");

    // 6. Update planned block (mark completed)
    let update_req = Request::builder()
        .method("PATCH")
        .uri("/api/v1/planned-blocks/block-morning-1")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::to_vec(&serde_json::json!({
                "status": "completed",
                "notes": "Finished with 10m buffer to spare"
            }))
            .unwrap(),
        ))
        .unwrap();
    let update_res = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_res.status(), StatusCode::OK);
    let update_bytes = to_bytes(update_res.into_body(), usize::MAX).await.unwrap();
    let update_json: serde_json::Value = serde_json::from_slice(&update_bytes).unwrap();
    assert_eq!(update_json["status"], "completed");

    // 7. Delete planned block
    let delete_req = Request::builder()
        .method("DELETE")
        .uri("/api/v1/planned-blocks/block-morning-1")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let delete_res = app.clone().oneshot(delete_req).await.unwrap();
    assert_eq!(delete_res.status(), StatusCode::NO_CONTENT);

    // 8. Verify query returns empty array
    let empty_req = Request::builder()
        .method("GET")
        .uri("/api/v1/planned-blocks?date=2026-10-15")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    let empty_res = app.clone().oneshot(empty_req).await.unwrap();
    let empty_bytes = to_bytes(empty_res.into_body(), usize::MAX).await.unwrap();
    let empty_json: serde_json::Value = serde_json::from_slice(&empty_bytes).unwrap();
    assert_eq!(empty_json.as_array().unwrap().len(), 0);

    // 9. Verify sync changes recorded
    let sync_changes = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sync_changes WHERE entity_type = 'planned_block' AND entity_id = 'block-morning-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(sync_changes, 3); // 1 create upsert + 1 update upsert + 1 delete
}
