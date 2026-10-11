use crate::auth::LoginRateLimiter;
use crate::db::DbPool;
use axum::extract::FromRef;

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub rate_limiter: LoginRateLimiter,
}

impl AppState {
    pub fn new(pool: DbPool) -> Self {
        Self {
            pool,
            rate_limiter: LoginRateLimiter::new(),
        }
    }
}

impl FromRef<AppState> for DbPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for LoginRateLimiter {
    fn from_ref(state: &AppState) -> Self {
        state.rate_limiter.clone()
    }
}
