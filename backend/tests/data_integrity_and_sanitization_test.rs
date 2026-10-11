use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use serde_json::json;
use tower::ServiceExt;

async fn setup_test_app() -> (axum::Router, String) {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");
    let state = AppState::new(pool);
    let app = create_app(state);

    // Initial setup with strong master password
    let setup_req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "password": "correct-horse-battery-staple-1234"
            })
            .to_string(),
        ))
        .unwrap();

    let res = app.clone().oneshot(setup_req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = to_bytes(res.into_body(), 1024 * 1024).await.unwrap();
    let setup_json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let token = setup_json["token"].as_str().unwrap().to_string();

    (app, token)
}

#[tokio::test]
async fn test_payload_size_limit_rejection() {
    let (app, token) = setup_test_app().await;

    // Create payload larger than 2MB limit (2.2 MB string)
    let huge_data = "a".repeat(2_200_000);
    let payload = json!({
        "tasks": [{
            "id": "t-huge",
            "name": huge_data,
            "target_minutes": 30,
            "color": "#fff"
        }],
        "sessions": [],
        "workouts": [],
        "completions": []
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/sync")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn test_data_sanitization_and_injection_resilience() {
    let (app, token) = setup_test_app().await;

    // 1. Task name with SQL injection and XSS attempts
    let malicious_name = "Task'; DROP TABLE focus_tasks; -- <script>alert('xss')</script>";
    let sync_payload = json!({
        "tasks": [{
            "id": "task-sec-1",
            "name": malicious_name,
            "target_minutes": 45,
            "color": "#ccff00"
        }],
        "sessions": [],
        "workouts": [],
        "completions": []
    });

    let sync_req = Request::builder()
        .method("POST")
        .uri("/api/sync")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(sync_payload.to_string()))
        .unwrap();

    let sync_res = app.clone().oneshot(sync_req).await.unwrap();
    assert_eq!(sync_res.status(), StatusCode::OK);

    // Fetch back and assert table still exists and data preserved accurately verbatim
    let get_req = Request::builder()
        .method("GET")
        .uri("/api/ledger")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap();

    let get_res = app.clone().oneshot(get_req).await.unwrap();
    assert_eq!(get_res.status(), StatusCode::OK);

    let body = to_bytes(get_res.into_body(), 1024 * 1024).await.unwrap();
    let data_json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let tasks = data_json["tasks"].as_array().unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["name"].as_str().unwrap(), malicious_name);
}

#[tokio::test]
async fn test_password_policy_and_whitespace_rejection() {
    let pool = db::init_db("sqlite::memory:").await.expect("init db");
    let state = AppState::new(pool);
    let app = create_app(state);

    // Too short (< 12 chars)
    let short_req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "password": "short" }).to_string()))
        .unwrap();

    let res = app.clone().oneshot(short_req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // Whitespace only
    let ws_req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({ "password": "              " }).to_string(),
        ))
        .unwrap();

    let res = app.clone().oneshot(ws_req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}
