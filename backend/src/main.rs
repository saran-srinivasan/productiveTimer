mod auth;
mod db;
mod handlers;
mod models;

use axum::{
    routing::{delete, get, post},
    Router,
};
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Attempt to load .env from current directory or parent directory
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename("../.env");

    // Initialize structured logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "productive_timer_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database connection URL (defaults to data/productive_timer.db)
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://data/productive_timer.db".to_string());

    tracing::info!("Initializing SQLite database at: {}", database_url);
    let pool = db::init_db(&database_url).await?;
    tracing::info!("Database initialized and migrations applied successfully.");

    // CORS configuration for local web development
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let serve_dir = ServeDir::new("dist")
        .not_found_service(ServeFile::new("dist/index.html"));

    // API Router
    let app = Router::new()
        .route("/api/health", get(handlers::health_check))
        .route("/api/auth/status", get(handlers::auth_status))
        .route("/api/auth/setup", post(handlers::auth_setup))
        .route("/api/auth/login", post(handlers::auth_login))
        .route("/api/auth/logout", post(handlers::auth_logout))
        .route("/api/ledger", get(handlers::get_ledger))
        .route("/api/sync", post(handlers::sync_ledger))
        .route("/api/tasks/:id", delete(handlers::delete_task))
        .route("/api/sessions/:id", delete(handlers::delete_session))
        .route("/api/workouts/:id", delete(handlers::delete_workout))
        .route("/api/completions", delete(handlers::delete_completion))
        .route("/api/migrate-from-supabase", post(handlers::migrate_from_supabase))
        .fallback_service(serve_dir)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let ip = host.parse::<std::net::IpAddr>().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));
    let addr = SocketAddr::from((ip, port));
    tracing::info!("ProductiveTimer backend running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
