pub mod auth;
pub mod db;
pub mod domains;
pub mod handlers;
pub mod models;
pub mod state;

use axum::extract::DefaultBodyLimit;
use axum::http::{header, HeaderName, HeaderValue, Method};
use axum::Router;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

pub use state::AppState;

pub fn create_app(state: AppState) -> Router {
    let allowed_origins: Vec<HeaderValue> = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| {
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173".to_string()
        })
        .split(',')
        .filter_map(|s| s.trim().parse::<HeaderValue>().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
            Method::PATCH,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            header::COOKIE,
            HeaderName::from_static("x-forwarded-for"),
            HeaderName::from_static("x-real-ip"),
        ])
        .allow_credentials(true);

    let serve_dir = ServeDir::new("dist").not_found_service(ServeFile::new("dist/index.html"));

    Router::new()
        .route("/api/health", axum::routing::get(handlers::health_check))
        .route(
            "/api/auth/status",
            axum::routing::get(handlers::auth_status),
        )
        .route("/api/auth/setup", axum::routing::post(handlers::auth_setup))
        .route("/api/auth/login", axum::routing::post(handlers::auth_login))
        .route(
            "/api/auth/logout",
            axum::routing::post(handlers::auth_logout),
        )
        .route(
            "/api/auth/logout-all",
            axum::routing::post(handlers::auth_logout_all),
        )
        .route(
            "/api/auth/change-password",
            axum::routing::post(handlers::auth_change_password),
        )
        .route("/api/ledger", axum::routing::get(handlers::get_ledger))
        .route("/api/sync", axum::routing::post(handlers::sync_ledger))
        .route(
            "/api/tasks/:id",
            axum::routing::delete(handlers::delete_task),
        )
        .route(
            "/api/sessions/:id",
            axum::routing::delete(handlers::delete_session),
        )
        .route(
            "/api/workouts/:id",
            axum::routing::delete(handlers::delete_workout),
        )
        .route(
            "/api/completions",
            axum::routing::delete(handlers::delete_completion),
        )
        .route(
            "/api/migrate-from-supabase",
            axum::routing::post(handlers::migrate_from_supabase),
        )
        .route(
            "/api/v1/active-session",
            axum::routing::get(handlers::get_active_session),
        )
        .route(
            "/api/v1/active-session",
            axum::routing::put(handlers::upsert_active_session),
        )
        .route(
            "/api/v1/active-session",
            axum::routing::delete(handlers::delete_active_session),
        )
        .route(
            "/api/v1/focus-sessions",
            axum::routing::get(handlers::list_focus_sessions),
        )
        .route(
            "/api/v1/focus-sessions",
            axum::routing::post(handlers::complete_focus_session),
        )
        .route(
            "/api/v1/sync/changes",
            axum::routing::get(handlers::get_sync_changes),
        )
        .route(
            "/api/v1/sync/operations",
            axum::routing::post(handlers::apply_sync_operations),
        )
        .route(
            "/api/v1/projects",
            axum::routing::get(handlers::list_projects)
                .post(handlers::create_project),
        )
        .route(
            "/api/v1/projects/:id",
            axum::routing::get(handlers::get_project)
                .patch(handlers::update_project)
                .delete(handlers::delete_project),
        )
        .route(
            "/api/v1/tasks",
            axum::routing::get(handlers::list_action_tasks)
                .post(handlers::create_action_task),
        )
        .route(
            "/api/v1/tasks/:id",
            axum::routing::get(handlers::get_action_task)
                .patch(handlers::update_action_task)
                .delete(handlers::delete_action_task),
        )
        .route(
            "/api/v1/goals",
            axum::routing::get(handlers::list_goals)
                .post(handlers::create_goal),
        )
        .route(
            "/api/v1/goals/:id",
            axum::routing::patch(handlers::update_goal)
                .delete(handlers::delete_goal),
        )
        .route(
            "/api/v1/goals/:id/milestones",
            axum::routing::post(handlers::add_milestone),
        )
        .route(
            "/api/v1/goals/:goal_id/milestones/:milestone_id",
            axum::routing::patch(handlers::update_milestone)
                .delete(handlers::delete_milestone),
        )
        .route(
            "/api/v1/planned-blocks",
            axum::routing::get(handlers::list_planned_blocks)
                .post(handlers::create_planned_block),
        )
        .route(
            "/api/v1/planned-blocks/:id",
            axum::routing::patch(handlers::update_planned_block)
                .delete(handlers::delete_planned_block),
        )
        .route(
            "/api/v1/habits",
            axum::routing::get(handlers::list_habits)
                .post(handlers::create_habit),
        )
        .route(
            "/api/v1/habits/:id",
            axum::routing::patch(handlers::update_habit)
                .delete(handlers::delete_habit),
        )
        .route(
            "/api/v1/habits/:id/toggle",
            axum::routing::post(handlers::toggle_habit),
        )
        .route(
            "/api/v1/daily-reviews/:date",
            axum::routing::get(handlers::get_daily_review)
                .put(handlers::upsert_daily_review),
        )
        .route(
            "/api/v1/weekly-reviews/:start_date",
            axum::routing::get(handlers::get_weekly_review),
        )
        .route(
            "/api/v1/insights",
            axum::routing::get(handlers::get_deterministic_insights),
        )
        .route(
            "/api/v1/workouts/routines",
            axum::routing::get(handlers::list_workout_routines)
                .post(handlers::create_workout_routine),
        )
        .route(
            "/api/v1/workouts/routines/:id",
            axum::routing::get(handlers::get_workout_routine)
                .put(handlers::update_workout_routine)
                .delete(handlers::delete_workout_routine),
        )
        .route(
            "/api/v1/workouts/sessions",
            axum::routing::get(handlers::list_workout_sessions),
        )
        .route(
            "/api/v1/workouts/sessions/start",
            axum::routing::post(handlers::start_workout_session),
        )
        .route(
            "/api/v1/workouts/sessions/active",
            axum::routing::get(handlers::get_active_workout_session),
        )
        .route(
            "/api/v1/workouts/sessions/:id",
            axum::routing::get(handlers::get_workout_session)
                .delete(handlers::delete_workout_session),
        )
        .route(
            "/api/v1/workouts/sessions/:id/complete",
            axum::routing::post(handlers::complete_workout_session),
        )
        .route(
            "/api/v1/workouts/exercises",
            axum::routing::post(handlers::add_workout_exercise),
        )
        .route(
            "/api/v1/workouts/exercises/:id",
            axum::routing::delete(handlers::delete_workout_exercise),
        )
        .route(
            "/api/v1/workouts/sets",
            axum::routing::post(handlers::log_workout_set),
        )
        .route(
            "/api/v1/workouts/sets/:id",
            axum::routing::patch(handlers::update_workout_set)
                .delete(handlers::delete_workout_set),
        )
        .route(
            "/api/v1/workouts/prs",
            axum::routing::get(handlers::list_all_prs),
        )
        .route(
            "/api/v1/workouts/exercises/:exercise_name/progression",
            axum::routing::get(handlers::get_exercise_progression),
        )
        .fallback_service(serve_dir)
        .layer(cors)
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
