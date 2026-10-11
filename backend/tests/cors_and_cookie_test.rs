use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use productive_timer_backend::{create_app, db, AppState};
use tower::ServiceExt;

#[tokio::test]
async fn test_cors_origin_filtering() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("init in-memory test db");
    let state = AppState::new(pool);
    let app = create_app(state);

    // 1. Authorized origin (http://localhost:5173) sends preflight OPTIONS request
    let req_authorized = Request::builder()
        .method("OPTIONS")
        .uri("/api/health")
        .header(header::ORIGIN, "http://localhost:5173")
        .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
        .body(Body::empty())
        .unwrap();

    let res_authorized = app.clone().oneshot(req_authorized).await.unwrap();
    assert_eq!(res_authorized.status(), StatusCode::OK);
    let allow_origin = res_authorized
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_ORIGIN);
    assert_eq!(
        allow_origin.and_then(|v| v.to_str().ok()),
        Some("http://localhost:5173"),
        "Authorized origin must receive Access-Control-Allow-Origin header"
    );

    // 2. Unauthorized origin (http://evil-attacker.com) sends preflight OPTIONS request
    let req_unauthorized = Request::builder()
        .method("OPTIONS")
        .uri("/api/health")
        .header(header::ORIGIN, "http://evil-attacker.com")
        .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
        .body(Body::empty())
        .unwrap();

    let res_unauthorized = app.clone().oneshot(req_unauthorized).await.unwrap();
    let reject_origin = res_unauthorized
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_ORIGIN);
    assert!(
        reject_origin.is_none(),
        "Unauthorized origin must NOT receive Access-Control-Allow-Origin header"
    );
}

#[tokio::test]
async fn test_cookie_authentication_strategy() {
    let pool = db::init_db("sqlite::memory:")
        .await
        .expect("init in-memory test db");
    let state = AppState::new(pool.clone());
    let app = create_app(state);

    // 1. Setup master password
    let setup_payload = serde_json::json!({
        "password": "correct-horse-battery-staple"
    });
    let req_setup = Request::builder()
        .method("POST")
        .uri("/api/auth/setup")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(serde_json::to_vec(&setup_payload).unwrap()))
        .unwrap();

    let res_setup = app.clone().oneshot(req_setup).await.unwrap();
    assert_eq!(res_setup.status(), StatusCode::OK);

    // Assert Set-Cookie is returned
    let set_cookie = res_setup.headers().get(header::SET_COOKIE);
    assert!(set_cookie.is_some(), "Setup must return Set-Cookie header");
    let cookie_str = set_cookie.unwrap().to_str().unwrap();
    assert!(cookie_str.contains("productive_session="));
    assert!(cookie_str.contains("HttpOnly"));
    assert!(cookie_str.contains("SameSite=Lax"));

    // Extract cookie value
    let session_val = cookie_str.split(';').next().unwrap().trim(); // "productive_session=..."

    // 2. Call /api/ledger with ONLY the Cookie header (NO Authorization Bearer header!)
    let req_ledger_with_cookie = Request::builder()
        .method("GET")
        .uri("/api/ledger")
        .header(header::COOKIE, session_val)
        .body(Body::empty())
        .unwrap();

    let res_ledger = app.clone().oneshot(req_ledger_with_cookie).await.unwrap();
    assert_eq!(
        res_ledger.status(),
        StatusCode::OK,
        "Request with cookie credentials must authenticate without Authorization header"
    );

    // 3. Call /api/auth/status with ONLY the Cookie header
    let req_status_cookie = Request::builder()
        .method("GET")
        .uri("/api/auth/status")
        .header(header::COOKIE, session_val)
        .body(Body::empty())
        .unwrap();

    let res_status = app.clone().oneshot(req_status_cookie).await.unwrap();
    assert_eq!(res_status.status(), StatusCode::OK);
    let bytes = to_bytes(res_status.into_body(), usize::MAX).await.unwrap();
    let status_json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(status_json["authenticated"], true);
    assert_eq!(status_json["role"], "owner");

    // 4. Logout with Cookie clears the cookie
    let req_logout = Request::builder()
        .method("POST")
        .uri("/api/auth/logout")
        .header(header::COOKIE, session_val)
        .body(Body::empty())
        .unwrap();

    let res_logout = app.clone().oneshot(req_logout).await.unwrap();
    assert_eq!(res_logout.status(), StatusCode::OK);
    let clear_cookie = res_logout
        .headers()
        .get(header::SET_COOKIE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(clear_cookie.contains("Max-Age=0"));
}
