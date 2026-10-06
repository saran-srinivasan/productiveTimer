use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FocusTask {
    pub id: String,
    pub name: String,
    pub target_minutes: i64,
    pub color: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FocusSession {
    pub id: String,
    pub task_id: String,
    pub seconds: i64,
    pub note: String,
    pub work_date: String,
    pub ended_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkoutEntry {
    pub id: String,
    pub work_date: String,
    pub kind: String,
    pub exercise: String,
    pub sets: Option<i64>,
    pub reps: Option<i64>,
    pub weight: Option<f64>,
    pub duration_minutes: Option<i64>,
    pub distance: Option<f64>,
    pub intensity: String,
    pub note: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskCompletion {
    pub id: String,
    pub task_id: String,
    pub completion_date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LedgerResponse {
    pub tasks: Vec<FocusTask>,
    pub sessions: Vec<FocusSession>,
    pub workouts: Vec<WorkoutEntry>,
    pub completions: Vec<TaskCompletion>,
}

#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    #[serde(default)]
    pub tasks: Option<Vec<FocusTask>>,
    #[serde(default)]
    pub sessions: Option<Vec<FocusSession>>,
    #[serde(default)]
    pub workouts: Option<Vec<WorkoutEntry>>,
    #[serde(default)]
    pub completions: Option<Vec<TaskCompletion>>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteCompletionQuery {
    pub task_id: String,
    pub date: String,
}

#[derive(Debug, Deserialize)]
pub struct MigrateSupabaseRequest {
    pub supabase_url: Option<String>,
    pub supabase_anon_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatusResponse {
    pub is_setup: bool,
    pub authenticated: bool,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct AuthSetupRequest {
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct AuthLoginRequest {
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSuccessResponse {
    pub token: String,
    pub role: String,
}
