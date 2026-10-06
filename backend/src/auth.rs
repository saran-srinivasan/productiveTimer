use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts, StatusCode},
};
use chrono::{Duration, Utc};
use rand::RngCore;

use crate::db::DbPool;

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| format!("Password hashing failed: {}", e))
}

pub fn verify_password(password: &str, hash_str: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash_str) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn generate_session_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub fn default_expiry_str() -> String {
    (Utc::now() + Duration::days(30))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string()
}

pub async fn check_token_valid(pool: &DbPool, token: &str) -> bool {
    sqlx::query_scalar::<_, String>(
        "SELECT token FROM auth_sessions WHERE token = ?1 AND expires_at > datetime('now')",
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .unwrap_or(None)
    .is_some()
}

pub struct AuthenticatedOwner;

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedOwner
where
    DbPool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let pool = DbPool::from_ref(state);

        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok());

        let token = match auth_header {
            Some(h) if h.starts_with("Bearer ") => h.trim_start_matches("Bearer ").trim(),
            _ => return Err((StatusCode::UNAUTHORIZED, "Missing or invalid Authorization header")),
        };

        if check_token_valid(&pool, token).await {
            Ok(AuthenticatedOwner)
        } else {
            Err((StatusCode::UNAUTHORIZED, "Unauthorized: Invalid or expired owner session"))
        }
    }
}
