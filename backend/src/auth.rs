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

pub const MIN_PASSWORD_LEN: usize = 12;
pub const MAX_PASSWORD_LEN: usize = 128;

pub fn validate_password_strength(password: &str) -> Result<(), &'static str> {
    let trimmed = password.trim();
    if trimmed.len() < MIN_PASSWORD_LEN {
        return Err("Password must be at least 12 characters long.");
    }
    if trimmed.len() > MAX_PASSWORD_LEN {
        return Err("Password cannot exceed 128 characters.");
    }
    Ok(())
}

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

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Clone, Default)]
pub struct LoginRateLimiter {
    attempts: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
}

impl LoginRateLimiter {
    pub fn new() -> Self {
        Self {
            attempts: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Checks if a client is allowed to attempt login.
    /// Returns Ok(()) if under limit (<= 5 failed attempts within 60s),
    /// or Err(retry_after_secs) if 5+ failed attempts recorded.
    pub fn check_allowed(&self, client_id: &str) -> Result<(), u64> {
        let mut map = self.attempts.lock().unwrap();
        let now = Instant::now();
        let window = std::time::Duration::from_secs(60);

        if let Some(history) = map.get_mut(client_id) {
            history.retain(|t| now.duration_since(*t) < window);
            if history.len() >= 5 {
                let oldest = history[0];
                let elapsed = now.duration_since(oldest);
                let retry_after = if elapsed < window {
                    (window - elapsed).as_secs().max(1)
                } else {
                    1
                };
                return Err(retry_after);
            }
        }
        Ok(())
    }

    pub fn record_failure(&self, client_id: &str) {
        let mut map = self.attempts.lock().unwrap();
        let now = Instant::now();
        let window = std::time::Duration::from_secs(60);
        let history = map.entry(client_id.to_string()).or_default();
        history.retain(|t| now.duration_since(*t) < window);
        history.push(now);
    }

    pub fn record_success(&self, client_id: &str) {
        let mut map = self.attempts.lock().unwrap();
        map.remove(client_id);
    }
}

use sha2::{Digest, Sha256};

pub fn hash_session_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

pub async fn cleanup_expired_sessions(pool: &DbPool) {
    let _ = sqlx::query("DELETE FROM auth_sessions WHERE expires_at <= datetime('now')")
        .execute(pool)
        .await;
}

pub async fn check_token_valid(pool: &DbPool, token: &str) -> bool {
    let hashed = hash_session_token(token);
    sqlx::query_scalar::<_, String>(
        "SELECT token FROM auth_sessions WHERE token = ?1 AND expires_at > datetime('now')",
    )
    .bind(hashed)
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

        let mut token_opt: Option<&str> = match auth_header {
            Some(h) if h.starts_with("Bearer ") => Some(h.trim_start_matches("Bearer ").trim()),
            _ => None,
        };

        if token_opt.is_none() {
            if let Some(cookie_header) = parts
                .headers
                .get(header::COOKIE)
                .and_then(|v| v.to_str().ok())
            {
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

        let token = match token_opt {
            Some(t) if !t.is_empty() => t,
            _ => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    "Missing or invalid authorization credentials",
                ))
            }
        };

        if check_token_valid(&pool, token).await {
            Ok(AuthenticatedOwner)
        } else {
            Err((
                StatusCode::UNAUTHORIZED,
                "Unauthorized: Invalid or expired owner session",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_password_strength_policy() {
        assert!(validate_password_strength("short").is_err());
        assert!(validate_password_strength("12345678901").is_err());
        assert!(validate_password_strength("   12345678901   ").is_err());
        assert!(validate_password_strength("123456789012").is_ok());
        assert!(validate_password_strength("correct-horse-battery-staple").is_ok());

        let max_len = "a".repeat(128);
        assert!(validate_password_strength(&max_len).is_ok());

        let too_long = "a".repeat(129);
        assert!(validate_password_strength(&too_long).is_err());
    }
}
