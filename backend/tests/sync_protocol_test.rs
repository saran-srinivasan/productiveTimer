use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_sync_operations_and_incremental_changes() {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // 1. Setup auth to get owner token
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

    // 2. Initial sync changes query - should be empty cursor 0
    let changes_req = Request::builder()
        .method("GET")
        .uri("/api/v1/sync/changes?cursor=0")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let changes_res = app.clone().oneshot(changes_req).await.unwrap();
    assert_eq!(changes_res.status(), StatusCode::OK);
    let bytes = to_bytes(changes_res.into_body(), usize::MAX).await.unwrap();
    let changes_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(changes_json["changes"].as_array().unwrap().len(), 0);
    assert_eq!(changes_json["latest_cursor"].as_i64().unwrap(), 0);

    // 3. Post batch operations with unique op_ids
    let ops_payload = serde_json::json!({
        "client_id": "mobile-test-client-1",
        "operations": [
            {
                "op_id": "op-001",
                "entity_type": "task",
                "entity_id": "task-sync-1",
                "op_type": "upsert",
                "payload": {
                    "id": "task-sync-1",
                    "name": "Sync Task One",
                    "target_minutes": 30,
                    "color": "#10b981",
                    "created_at": "2026-10-10 12:00:00"
                },
                "client_version": 1
            },
            {
                "op_id": "op-002",
                "entity_type": "session",
                "entity_id": "session-sync-1",
                "op_type": "upsert",
                "payload": {
                    "id": "session-sync-1",
                    "task_id": "task-sync-1",
                    "seconds": 1800,
                    "note": "Synced session",
                    "work_date": "2026-10-10",
                    "started_at": "2026-10-10 11:30:00",
                    "ended_at": "2026-10-10 12:00:00"
                },
                "client_version": 1
            }
        ]
    });

    let ops_req = Request::builder()
        .method("POST")
        .uri("/api/v1/sync/operations")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&ops_payload).unwrap()))
        .unwrap();

    let ops_res = app.clone().oneshot(ops_req).await.unwrap();
    assert_eq!(ops_res.status(), StatusCode::OK);
    let bytes = to_bytes(ops_res.into_body(), usize::MAX).await.unwrap();
    let ops_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(ops_json["applied_count"].as_u64().unwrap(), 2);
    assert_eq!(ops_json["deduplicated_count"].as_u64().unwrap(), 0);
    let first_cursor = ops_json["latest_cursor"].as_i64().unwrap();
    assert!(first_cursor >= 2);

    // 4. Send identical batch again -> verify 100% deduplication
    let ops_req2 = Request::builder()
        .method("POST")
        .uri("/api/v1/sync/operations")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&ops_payload).unwrap()))
        .unwrap();

    let ops_res2 = app.clone().oneshot(ops_req2).await.unwrap();
    assert_eq!(ops_res2.status(), StatusCode::OK);
    let bytes = to_bytes(ops_res2.into_body(), usize::MAX).await.unwrap();
    let ops_json2: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(ops_json2["applied_count"].as_u64().unwrap(), 0);
    assert_eq!(ops_json2["deduplicated_count"].as_u64().unwrap(), 2);

    // 5. Query changes delta since cursor 0
    let changes_req2 = Request::builder()
        .method("GET")
        .uri("/api/v1/sync/changes?cursor=0")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let changes_res2 = app.clone().oneshot(changes_req2).await.unwrap();
    assert_eq!(changes_res2.status(), StatusCode::OK);
    let bytes = to_bytes(changes_res2.into_body(), usize::MAX).await.unwrap();
    let changes_json2: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let changes_array = changes_json2["changes"].as_array().unwrap();
    assert_eq!(changes_array.len(), 2);

    // 6. Query changes delta from first_cursor -> 0 changes
    let changes_req3 = Request::builder()
        .method("GET")
        .uri(format!("/api/v1/sync/changes?cursor={}", first_cursor))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let changes_res3 = app.clone().oneshot(changes_req3).await.unwrap();
    assert_eq!(changes_res3.status(), StatusCode::OK);
    let bytes = to_bytes(changes_res3.into_body(), usize::MAX).await.unwrap();
    let changes_json3: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(changes_json3["changes"].as_array().unwrap().len(), 0);

    // 7. Verify History pagination and filter on GET /api/v1/focus-sessions
    let filter_req = Request::builder()
        .method("GET")
        .uri("/api/v1/focus-sessions?start_date=2026-10-01&end_date=2026-10-31&limit=10&offset=0")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let filter_res = app.clone().oneshot(filter_req).await.unwrap();
    assert_eq!(filter_res.status(), StatusCode::OK);
    let bytes = to_bytes(filter_res.into_body(), usize::MAX).await.unwrap();
    let sessions_filtered: Vec<serde_json::Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(sessions_filtered.len(), 1);
    assert_eq!(sessions_filtered[0]["id"].as_str().unwrap(), "session-sync-1");
}
