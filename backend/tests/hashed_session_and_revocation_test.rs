use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{auth, create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_hashed_session_tokens_and_global_logout() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("init in-memory test db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // 1. Setup master password
    let setup_payload = serde_json::json!({
        "password": "correct-horse-battery-staple"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&setup_payload).unwrap()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body_bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let setup_json: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let token1 = setup_json["token"].as_str().unwrap().to_string();

    // 2. Login to get a second active session
    let login_payload = serde_json::json!({
        "password": "correct-horse-battery-staple"
    });
    let req_login = Request::builder()
        .method("POST")
        .uri("/api/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .header("x-forwarded-for", "127.0.0.1")
        .body(Body::from(serde_json::to_vec(&login_payload).unwrap()))
        .unwrap();

    let res_login = app.clone().oneshot(req_login).await.unwrap();
    assert_eq!(res_login.status(), StatusCode::OK);
    let body_bytes2 = to_bytes(res_login.into_body(), usize::MAX).await.unwrap();
    let login_json: serde_json::Value = serde_json::from_slice(&body_bytes2).unwrap();
    let token2 = login_json["token"].as_str().unwrap().to_string();

    // Assert tokens are different
    assert_ne!(token1, token2);

    // 3. Inspect database directly: assert tokens stored are SHA-256 hashes, NOT raw tokens!
    let stored_tokens: Vec<String> = sqlx::query_scalar("SELECT token FROM auth_sessions")
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(stored_tokens.len(), 2, "Expected 2 active sessions in DB");
    for stored in &stored_tokens {
        // Assert stored is a 64-char hex SHA-256 hash
        assert_eq!(
            stored.len(),
            64,
            "Stored session token must be 64-character SHA-256 hex string"
        );
        // Assert stored token is NOT equal to raw plaintext token1 or token2
        assert_ne!(
            stored, &token1,
            "Database must NOT contain raw token1 in plaintext"
        );
        assert_ne!(
            stored, &token2,
            "Database must NOT contain raw token2 in plaintext"
        );
    }

    let expected_hash1 = auth::hash_session_token(&token1);
    let expected_hash2 = auth::hash_session_token(&token2);
    assert!(
        stored_tokens.contains(&expected_hash1),
        "DB must contain SHA-256 hash of token1"
    );
    assert!(
        stored_tokens.contains(&expected_hash2),
        "DB must contain SHA-256 hash of token2"
    );

    // 4. Verify both tokens authenticate successfully
    for token in &[&token1, &token2] {
        let req_status = Request::builder()
            .method("GET")
            .uri("/api/auth/status")
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let res_status = app.clone().oneshot(req_status).await.unwrap();
        assert_eq!(res_status.status(), StatusCode::OK);
        let b = to_bytes(res_status.into_body(), usize::MAX).await.unwrap();
        let status_json: serde_json::Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(status_json["authenticated"], true);
        assert_eq!(status_json["role"], "owner");
    }

    // 5. Call /api/auth/logout-all with token1
    let req_logout_all = Request::builder()
        .method("POST")
        .uri("/api/auth/logout-all")
        .header(header::AUTHORIZATION, format!("Bearer {}", token1))
        .body(Body::empty())
        .unwrap();

    let res_logout_all = app.clone().oneshot(req_logout_all).await.unwrap();
    assert_eq!(res_logout_all.status(), StatusCode::OK);

    // 6. Verify BOTH token1 and token2 are now revoked (return 401 on protected ledger endpoint)
    for token in &[&token1, &token2] {
        let req_ledger = Request::builder()
            .method("GET")
            .uri("/api/ledger")
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .unwrap();

        let res_ledger = app.clone().oneshot(req_ledger).await.unwrap();
        assert_eq!(
            res_ledger.status(),
            StatusCode::UNAUTHORIZED,
            "Revoked token must return 401 UNAUTHORIZED"
        );
    }

    // Assert zero active sessions in DB
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_sessions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0, "All sessions must be wiped after logout-all");
}
