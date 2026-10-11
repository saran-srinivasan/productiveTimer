use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_login_rate_limiting_six_rapid_bad_logins() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("init in-memory test db");
    let state = AppState::new(pool);
    let app = create_app(state);

    // 1. Initial setup with master password
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

    // 2. Perform 5 bad logins from IP 192.168.1.50 -> expect 401 UNAUTHORIZED
    let bad_login_payload = serde_json::json!({
        "password": "wrong-password-123"
    });

    for i in 1..=5 {
        let req = Request::builder()
            .method("POST")
            .uri("/api/auth/login")
            .header(header::CONTENT_TYPE, "application/json")
            .header("x-forwarded-for", "192.168.1.50")
            .body(Body::from(serde_json::to_vec(&bad_login_payload).unwrap()))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(
            res.status(),
            StatusCode::UNAUTHORIZED,
            "Attempt {} should be 401 UNAUTHORIZED",
            i
        );
    }

    // 3. Perform 6th bad login from same IP -> expect 429 TOO_MANY_REQUESTS
    let req6 = Request::builder()
        .method("POST")
        .uri("/api/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .header("x-forwarded-for", "192.168.1.50")
        .body(Body::from(serde_json::to_vec(&bad_login_payload).unwrap()))
        .unwrap();

    let res6 = app.clone().oneshot(req6).await.unwrap();
    assert_eq!(
        res6.status(),
        StatusCode::TOO_MANY_REQUESTS,
        "6th consecutive bad login must trigger 429 TOO_MANY_REQUESTS"
    );

    // 4. Request from a different IP (192.168.1.51) should NOT be rate limited
    let req_other_ip = Request::builder()
        .method("POST")
        .uri("/api/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .header("x-forwarded-for", "192.168.1.51")
        .body(Body::from(serde_json::to_vec(&bad_login_payload).unwrap()))
        .unwrap();

    let res_other = app.clone().oneshot(req_other_ip).await.unwrap();
    assert_eq!(
        res_other.status(),
        StatusCode::UNAUTHORIZED,
        "Different IP should return 401 UNAUTHORIZED, not rate-limited 429"
    );
}
