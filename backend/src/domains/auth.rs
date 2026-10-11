use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::env;

use crate::auth::{self, AuthenticatedOwner};
use crate::db::DbPool;
use crate::models::{
    AuthChangePasswordRequest, AuthLoginRequest, AuthSetupRequest, AuthStatusResponse,
    AuthSuccessResponse,
};

pub async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}

pub fn make_session_cookie(token: &str) -> String {
    let is_secure = env::var("COOKIE_SECURE")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);
    let secure_flag = if is_secure { "; Secure" } else { "" };
    format!(
        "productive_session={}; HttpOnly{}; SameSite=Lax; Path=/; Max-Age=2592000",
        token, secure_flag
    )
}

pub fn make_clear_cookie() -> String {
    let is_secure = env::var("COOKIE_SECURE")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);
    let secure_flag = if is_secure { "; Secure" } else { "" };
    format!(
        "productive_session=; HttpOnly{}; SameSite=Lax; Path=/; Max-Age=0",
        secure_flag
    )
}

pub async fn auth_status(
    State(pool): State<DbPool>,
    headers: HeaderMap,
) -> Result<Json<AuthStatusResponse>, (StatusCode, String)> {
    auth::cleanup_expired_sessions(&pool).await;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM auth_config")
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DB query failed: {}", e),
            )
        })?;

    let is_setup = count > 0;

    let mut authenticated = false;
    let mut token_opt = None;
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    if let Some(h) = auth_header {
        if h.starts_with("Bearer ") {
            token_opt = Some(h.trim_start_matches("Bearer ").trim());
        }
    }
    if token_opt.is_none() {
        if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
            for pair in cookie_header.split(';') {
                let mut kv = pair.trim().splitn(2, '=');
                if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                    if k == "productive_session" || k == "session_token" {
                        token_opt = Some(v);
                        break;
                    }
                }
            }
        }
    }

    if let Some(token) = token_opt {
        if auth::check_token_valid(&pool, token).await {
            authenticated = true;
        }
    }

    let role = if authenticated {
        "owner".to_string()
    } else {
        "guest".to_string()
    };

    Ok(Json(AuthStatusResponse {
        is_setup,
        authenticated,
        role,
    }))
}

pub async fn auth_setup(
    State(pool): State<DbPool>,
    Json(payload): Json<AuthSetupRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let trimmed = payload.password.trim();
    if let Err(msg) = auth::validate_password_strength(trimmed) {
        return Err((StatusCode::BAD_REQUEST, msg.to_string()));
    }

    let password_hash =
        auth::hash_password(trimmed).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let mut conn = pool.acquire().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to acquire connection: {}", e),
        )
    })?;

    sqlx::query("BEGIN IMMEDIATE")
        .execute(&mut *conn)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to start transaction: {}", e),
            )
        })?;

    let count: i64 = match sqlx::query_scalar("SELECT COUNT(*) FROM auth_config")
        .fetch_one(&mut *conn)
        .await
    {
        Ok(c) => c,
        Err(e) => {
            let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DB query failed: {}", e),
            ));
        }
    };

    if count > 0 {
        let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
        return Err((
            StatusCode::BAD_REQUEST,
            "Master password is already established.".to_string(),
        ));
    }

    if let Err(e) =
        sqlx::query("INSERT INTO auth_config (id, password_hash) VALUES ('primary', ?1)")
            .bind(&password_hash)
            .execute(&mut *conn)
            .await
    {
        let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Master password setup conflict: {}", e),
        ));
    }

    let token = auth::generate_session_token();
    let token_hash = auth::hash_session_token(&token);
    let expires_at = auth::default_expiry_str();

    if let Err(e) =
        sqlx::query("INSERT INTO auth_sessions (token, role, expires_at) VALUES (?1, 'owner', ?2)")
            .bind(&token_hash)
            .bind(&expires_at)
            .execute(&mut *conn)
            .await
    {
        let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create session: {}", e),
        ));
    }

    sqlx::query("COMMIT")
        .execute(&mut *conn)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to commit setup: {}", e),
            )
        })?;

    Ok((
        [(header::SET_COOKIE, make_session_cookie(&token))],
        Json(AuthSuccessResponse {
            token,
            role: "owner".to_string(),
        }),
    ))
}

pub async fn auth_login(
    State(pool): State<DbPool>,
    State(rate_limiter): State<auth::LoginRateLimiter>,
    headers: HeaderMap,
    Json(payload): Json<AuthLoginRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let client_id = headers
        .get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .unwrap_or("client_default")
        .to_string();

    if let Err(retry_after) = rate_limiter.check_allowed(&client_id) {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            format!(
                "Too many failed login attempts. Please wait {} seconds.",
                retry_after
            ),
        ));
    }

    let hash: Option<String> =
        sqlx::query_scalar("SELECT password_hash FROM auth_config WHERE id = 'primary'")
            .fetch_optional(&pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("DB error: {}", e),
                )
            })?;

    let hash = match hash {
        Some(h) => h,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                "No master password configured yet. Complete setup first.".to_string(),
            ))
        }
    };

    if !auth::verify_password(&payload.password, &hash) {
        rate_limiter.record_failure(&client_id);
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid master password.".to_string(),
        ));
    }

    rate_limiter.record_success(&client_id);

    let token = auth::generate_session_token();
    let token_hash = auth::hash_session_token(&token);
    let expires_at = auth::default_expiry_str();

    sqlx::query("INSERT INTO auth_sessions (token, role, expires_at) VALUES (?1, 'owner', ?2)")
        .bind(&token_hash)
        .bind(&expires_at)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create session: {}", e),
            )
        })?;

    Ok((
        [(header::SET_COOKIE, make_session_cookie(&token))],
        Json(AuthSuccessResponse {
            token,
            role: "owner".to_string(),
        }),
    ))
}

pub async fn auth_logout(
    State(pool): State<DbPool>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut token_opt = None;
    if let Some(h) = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
    {
        if h.starts_with("Bearer ") {
            token_opt = Some(h.trim_start_matches("Bearer ").trim());
        }
    }
    if token_opt.is_none() {
        if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
            for pair in cookie_header.split(';') {
                let mut kv = pair.trim().splitn(2, '=');
                if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                    if k == "productive_session" || k == "session_token" {
                        token_opt = Some(v);
                        break;
                    }
                }
            }
        }
    }

    if let Some(token) = token_opt {
        let token_hash = auth::hash_session_token(token);
        let _ = sqlx::query("DELETE FROM auth_sessions WHERE token = ?1")
            .bind(token_hash)
            .execute(&pool)
            .await;
    }

    Ok((
        [(header::SET_COOKIE, make_clear_cookie())],
        Json(json!({ "status": "logged_out" })),
    ))
}

pub async fn auth_logout_all(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    sqlx::query("DELETE FROM auth_sessions")
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to revoke sessions: {}", e),
            )
        })?;

    Ok((
        [(header::SET_COOKIE, make_clear_cookie())],
        Json(json!({ "status": "all_sessions_revoked" })),
    ))
}

pub async fn auth_change_password(
    _auth: AuthenticatedOwner,
    State(pool): State<DbPool>,
    Json(payload): Json<AuthChangePasswordRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let hash: Option<String> =
        sqlx::query_scalar("SELECT password_hash FROM auth_config WHERE id = 'primary'")
            .fetch_optional(&pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("DB error: {}", e),
                )
            })?;

    let hash = match hash {
        Some(h) => h,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                "No master password configured yet. Complete setup first.".to_string(),
            ))
        }
    };

    if !auth::verify_password(&payload.current_password, &hash) {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Current master password is incorrect.".to_string(),
        ));
    }

    let trimmed = payload.new_password.trim();
    if let Err(msg) = auth::validate_password_strength(trimmed) {
        return Err((StatusCode::BAD_REQUEST, msg.to_string()));
    }

    let new_hash =
        auth::hash_password(trimmed).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    sqlx::query("UPDATE auth_config SET password_hash = ?1 WHERE id = 'primary'")
        .bind(&new_hash)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to update master password: {}", e),
            )
        })?;

    Ok(Json(json!({ "status": "password_updated" })))
}
