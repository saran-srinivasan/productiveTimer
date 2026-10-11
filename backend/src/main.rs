use productive_timer_backend::{create_app, db, AppState};
use std::env;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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

    let state = AppState::new(pool);
    let app = create_app(state);

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let ip = host
        .parse::<std::net::IpAddr>()
        .unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));
    let addr = SocketAddr::from((ip, port));
    tracing::info!("ProductiveTimer backend running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
