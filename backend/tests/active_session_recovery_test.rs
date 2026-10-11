use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_active_session_lifecycle_and_idempotent_completion() {
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

    // 2. Create focus task
    sqlx::query("INSERT INTO focus_tasks (id, name, target_minutes, color) VALUES ('t1', 'Deep Coding', 45, '#3b82f6')")
        .execute(&pool)
        .await
        .unwrap();

    // 3. Start Active Session (PUT /api/v1/active-session)
    let start_payload = serde_json::json!({
        "id": "as-001",
        "task_id": "t1",
        "started_at": "2026-10-10 10:00:00",
        "last_resumed_at": "2026-10-10 10:00:00",
        "accumulated_seconds": 0,
        "target_seconds": 2700,
        "is_paused": false,
        "client_version": 1
    });

    let put_req = Request::builder()
        .method("PUT")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&start_payload).unwrap()))
        .unwrap();

    let put_res = app.clone().oneshot(put_req).await.unwrap();
    assert_eq!(put_res.status(), StatusCode::OK);

    // 4. GET /api/v1/active-session returns the running session
    let get_req = Request::builder()
        .method("GET")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let get_res = app.clone().oneshot(get_req).await.unwrap();
    assert_eq!(get_res.status(), StatusCode::OK);
    let bytes = to_bytes(get_res.into_body(), usize::MAX).await.unwrap();
    let active_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(active_json["id"], "as-001");
    assert_eq!(active_json["is_paused"], false);
    assert_eq!(active_json["client_version"], 1);

    // 5. Update session: Pause with client_version = 2
    let pause_payload = serde_json::json!({
        "id": "as-001",
        "task_id": "t1",
        "started_at": "2026-10-10 10:00:00",
        "last_resumed_at": null,
        "accumulated_seconds": 600,
        "target_seconds": 2700,
        "is_paused": true,
        "client_version": 2
    });

    let pause_req = Request::builder()
        .method("PUT")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&pause_payload).unwrap()))
        .unwrap();

    let pause_res = app.clone().oneshot(pause_req).await.unwrap();
    assert_eq!(pause_res.status(), StatusCode::OK);

    // 6. Test optimistic lock conflict: send update with stale client_version = 1 -> expect 409 CONFLICT
    let stale_payload = serde_json::json!({
        "id": "as-001",
        "task_id": "t1",
        "started_at": "2026-10-10 10:00:00",
        "last_resumed_at": null,
        "accumulated_seconds": 500,
        "target_seconds": 2700,
        "is_paused": false,
        "client_version": 1
    });

    let conflict_req = Request::builder()
        .method("PUT")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&stale_payload).unwrap()))
        .unwrap();

    let conflict_res = app.clone().oneshot(conflict_req).await.unwrap();
    assert_eq!(conflict_res.status(), StatusCode::CONFLICT);

    // 7. Complete focus session: POST /api/v1/focus-sessions
    let complete_payload = serde_json::json!({
        "id": "session-100",
        "task_id": "t1",
        "seconds": 2700,
        "note": "Completed feature implementation",
        "work_date": "2026-10-10",
        "started_at": "2026-10-10 10:00:00",
        "ended_at": "2026-10-10 10:48:30"
    });

    let complete_req1 = Request::builder()
        .method("POST")
        .uri("/api/v1/focus-sessions")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&complete_payload).unwrap()))
        .unwrap();

    let complete_res1 = app.clone().oneshot(complete_req1).await.unwrap();
    assert_eq!(complete_res1.status(), StatusCode::OK);

    // 8. Idempotency test: duplicate POST with identical session ID
    let complete_req2 = Request::builder()
        .method("POST")
        .uri("/api/v1/focus-sessions")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&complete_payload).unwrap()))
        .unwrap();

    let complete_res2 = app.clone().oneshot(complete_req2).await.unwrap();
    assert_eq!(complete_res2.status(), StatusCode::OK);
    let c2_bytes = to_bytes(complete_res2.into_body(), usize::MAX)
        .await
        .unwrap();
    let c2_json: serde_json::Value = serde_json::from_slice(&c2_bytes).unwrap();
    assert_eq!(c2_json["idempotent"], true);

    // Assert exactly 1 session recorded in focus_sessions with wall-clock bounds
    let session_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM focus_sessions WHERE id = 'session-100'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        session_count, 1,
        "Duplicate submission must produce exactly 1 record"
    );

    let (seconds, started_at, ended_at): (i64, Option<String>, String) = sqlx::query_as(
        "SELECT seconds, started_at, ended_at FROM focus_sessions WHERE id = 'session-100'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(seconds, 2700);
    assert_eq!(started_at, Some("2026-10-10 10:00:00".to_string()));
    assert_eq!(ended_at, "2026-10-10 10:48:30");

    // Assert active session was atomically cleared on completion
    let active_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM active_sessions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(active_count, 0, "Active session must be cleared atomically");

    // 9. Start and Cancel Active Session (DELETE /api/v1/active-session)
    let put_req2 = Request::builder()
        .method("PUT")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&start_payload).unwrap()))
        .unwrap();

    let _ = app.clone().oneshot(put_req2).await.unwrap();

    let del_req = Request::builder()
        .method("DELETE")
        .uri("/api/v1/active-session")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();

    let del_res = app.clone().oneshot(del_req).await.unwrap();
    assert_eq!(del_res.status(), StatusCode::OK);

    let active_after_del: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM active_sessions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(active_after_del, 0);
}
