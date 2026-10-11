use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_race_proof_concurrent_setup() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("init in-memory test db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // Launch 10 concurrent setup requests with distinct passphrases
    let mut handles = Vec::new();
    for i in 0..10 {
        let app_clone = app.clone();
        let handle = tokio::spawn(async move {
            let payload = serde_json::json!({
                "password": format!("passphrase-candidate-{:04}", i)
            });
            let req = Request::builder()
                .method("POST")
                .uri("/api/auth/setup")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(serde_json::to_vec(&payload).unwrap()))
                .unwrap();

            app_clone.oneshot(req).await.unwrap()
        });
        handles.push(handle);
    }

    let mut ok_count = 0;
    let mut bad_request_count = 0;

    for handle in handles {
        let res = handle.await.unwrap();
        match res.status() {
            StatusCode::OK => ok_count += 1,
            StatusCode::BAD_REQUEST => bad_request_count += 1,
            other => panic!("Unexpected status code from concurrent setup: {}", other),
        }
    }

    assert_eq!(ok_count, 1, "Exactly one setup attempt must succeed");
    assert_eq!(
        bad_request_count, 9,
        "All 9 competing attempts must fail with BAD_REQUEST"
    );

    // Verify DB integrity: exactly 1 config and 1 session
    let config_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_config")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(config_count, 1, "auth_config must contain exactly 1 entry");

    let session_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_sessions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        session_count, 1,
        "auth_sessions must contain exactly 1 session"
    );
}
