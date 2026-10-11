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
    pub action_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActiveSession {
    pub id: String,
    pub task_id: String,
    pub started_at: String,
    pub last_resumed_at: Option<String>,
    pub accumulated_seconds: i64,
    pub target_seconds: Option<i64>,
    pub is_paused: bool,
    pub client_version: i64,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpsertActiveSessionRequest {
    pub id: String,
    pub task_id: String,
    pub started_at: String,
    pub last_resumed_at: Option<String>,
    pub accumulated_seconds: i64,
    pub target_seconds: Option<i64>,
    pub is_paused: bool,
    pub client_version: i64,
}

#[derive(Debug, Deserialize)]
pub struct CompleteFocusSessionRequest {
    pub id: String,
    pub task_id: String,
    pub seconds: i64,
    pub note: Option<String>,
    pub work_date: String,
    pub action_task_id: Option<String>,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct AuthChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSuccessResponse {
    pub token: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncChange {
    pub change_id: i64,
    pub entity_type: String,
    pub entity_id: String,
    pub op_type: String,
    pub payload: Option<String>,
    pub version: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncChangesQuery {
    pub cursor: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncChangesResponse {
    pub changes: Vec<SyncChange>,
    pub latest_cursor: i64,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientOperation {
    pub op_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub op_type: String,
    pub payload: Option<serde_json::Value>,
    pub client_version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SyncOperationsRequest {
    pub client_id: Option<String>,
    pub operations: Vec<ClientOperation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncOperationsResponse {
    pub applied_count: usize,
    pub deduplicated_count: usize,
    pub latest_cursor: i64,
}

#[derive(Debug, Deserialize)]
pub struct FocusSessionsQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub status: String,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub status: String,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub task_count: i64,
    pub total_focus_seconds: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectsQuery {
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActionTask {
    pub id: String,
    pub project_id: Option<String>,
    pub goal_id: Option<String>,
    pub focus_task_id: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub estimate_minutes: Option<i64>,
    pub due_at: Option<String>,
    pub completed_at: Option<String>,
    pub completion_notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateActionTaskRequest {
    pub id: Option<String>,
    pub project_id: Option<String>,
    pub goal_id: Option<String>,
    pub focus_task_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub estimate_minutes: Option<i64>,
    pub due_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateActionTaskRequest {
    pub project_id: Option<String>,
    pub goal_id: Option<String>,
    pub focus_task_id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub estimate_minutes: Option<i64>,
    pub due_at: Option<String>,
    pub completed_at: Option<String>,
    pub completion_notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ActionTasksQuery {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GoalMilestone {
    pub id: String,
    pub goal_id: String,
    pub title: String,
    pub target_date: Option<String>,
    pub status: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Goal {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub goal_type: String,
    pub target_value: f64,
    pub current_value: f64,
    pub unit: String,
    pub start_date: String,
    pub target_date: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalWithMilestones {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub goal_type: String,
    pub target_value: f64,
    pub current_value: f64,
    pub unit: String,
    pub start_date: String,
    pub target_date: String,
    pub status: String,
    pub created_at: Option<String>,
    pub milestones: Vec<GoalMilestone>,
    pub progress_percentage: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateGoalRequest {
    pub id: Option<String>,
    pub project_id: Option<String>,
    pub title: String,
    pub goal_type: String,
    pub target_value: f64,
    pub current_value: Option<f64>,
    pub unit: String,
    pub start_date: String,
    pub target_date: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoalRequest {
    pub project_id: Option<String>,
    pub title: Option<String>,
    pub target_value: Option<f64>,
    pub current_value: Option<f64>,
    pub unit: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMilestoneRequest {
    pub id: Option<String>,
    pub title: String,
    pub target_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMilestoneRequest {
    pub title: Option<String>,
    pub target_date: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlannedBlock {
    pub id: String,
    pub action_task_id: Option<String>,
    pub plan_date: String,
    pub start_at: String,
    pub end_at: String,
    pub status: String,
    pub notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedBlockWithTask {
    pub id: String,
    pub action_task_id: Option<String>,
    pub plan_date: String,
    pub start_at: String,
    pub end_at: String,
    pub status: String,
    pub notes: String,
    pub created_at: Option<String>,
    pub task_title: Option<String>,
    pub task_priority: Option<String>,
    pub project_name: Option<String>,
    pub project_color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlannedBlockRequest {
    pub id: Option<String>,
    pub action_task_id: Option<String>,
    pub plan_date: String,
    pub start_at: String,
    pub end_at: String,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlannedBlockRequest {
    pub action_task_id: Option<String>,
    pub plan_date: Option<String>,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PlannedBlocksQuery {
    pub date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HabitDefinition {
    pub id: String,
    pub name: String,
    pub schedule_rule: String,
    pub target_frequency: i64,
    pub color: String,
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HabitWithHistory {
    pub id: String,
    pub name: String,
    pub schedule_rule: String,
    pub target_frequency: i64,
    pub color: String,
    pub active: bool,
    pub created_at: Option<String>,
    pub current_streak: i64,
    pub recent_dates: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHabitRequest {
    pub id: Option<String>,
    pub name: String,
    pub schedule_rule: Option<String>,
    pub target_frequency: Option<i64>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHabitRequest {
    pub name: Option<String>,
    pub schedule_rule: Option<String>,
    pub target_frequency: Option<i64>,
    pub color: Option<String>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ToggleHabitRequest {
    pub date: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailyReview {
    pub id: String,
    pub review_date: String,
    pub accomplishments: String,
    pub blockers: String,
    pub reflection: String,
    pub energy_rating: Option<i64>,
    pub focus_rating: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertDailyReviewRequest {
    pub accomplishments: Option<String>,
    pub blockers: Option<String>,
    pub reflection: Option<String>,
    pub energy_rating: Option<i64>,
    pub focus_rating: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyReviewSummary {
    pub start_date: String,
    pub end_date: String,
    pub total_focus_seconds: i64,
    pub completed_tasks_count: i64,
    pub workout_count: i64,
    #[serde(default)]
    pub total_workout_volume: f64,
    pub habit_completion_rate: f64,
    pub daily_reviews: Vec<DailyReview>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InsightItem {
    pub id: String,
    pub rule_id: String,
    pub title: String,
    pub message: String,
    pub severity: String, // "warning", "info", "success", "alert"
    pub category: String, // "focus", "tasks", "goals", "estimation", "habits"
    pub metric_name: String,
    pub formula: String,
    pub data_points: serde_json::Value,
    pub supporting_record_ids: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InsightsResponse {
    pub insights: Vec<InsightItem>,
    pub days_logged: i64,
    pub total_focus_seconds: i64,
    pub has_sufficient_data: bool,
}

// ---------------------------------------------------------
// Structured Workouts Domain (Phase 4)
// ---------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkoutRoutine {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoutineExercise {
    pub id: String,
    pub routine_id: String,
    pub exercise_name: String,
    pub target_sets: i64,
    pub target_reps: i64,
    pub target_rpe: Option<f64>,
    pub rest_seconds: i64,
    pub order_index: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutRoutineWithExercises {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub exercises: Vec<RoutineExercise>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRoutineExerciseInput {
    pub exercise_name: String,
    pub target_sets: i64,
    pub target_reps: i64,
    pub target_rpe: Option<f64>,
    pub rest_seconds: Option<i64>,
    pub order_index: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRoutineRequest {
    pub name: String,
    pub description: Option<String>,
    pub exercises: Vec<CreateRoutineExerciseInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRoutineRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub exercises: Option<Vec<CreateRoutineExerciseInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkoutSessionRow {
    pub id: String,
    pub routine_id: Option<String>,
    pub work_date: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub notes: String,
    pub energy_rating: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkoutExerciseRow {
    pub id: String,
    pub session_id: String,
    pub exercise_name: String,
    pub order_index: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkoutSetRow {
    pub id: String,
    pub workout_exercise_id: String,
    pub set_number: i64,
    pub weight: Option<f64>,
    pub reps: Option<i64>,
    pub rpe: Option<f64>,
    pub is_warmup: bool,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutExerciseWithSets {
    pub id: String,
    pub session_id: String,
    pub exercise_name: String,
    pub order_index: i64,
    pub sets: Vec<WorkoutSetRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkoutSessionDetail {
    pub id: String,
    pub routine_id: Option<String>,
    pub routine_name: Option<String>,
    pub work_date: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub notes: String,
    pub energy_rating: Option<i64>,
    pub created_at: String,
    pub exercises: Vec<WorkoutExerciseWithSets>,
    pub total_volume: f64,
    pub total_completed_sets: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartWorkoutSessionRequest {
    pub routine_id: Option<String>,
    pub work_date: Option<String>,
    pub started_at: Option<String>,
    pub exercises: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteWorkoutSessionRequest {
    pub ended_at: Option<String>,
    pub notes: Option<String>,
    pub energy_rating: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddWorkoutExerciseRequest {
    pub session_id: String,
    pub exercise_name: String,
    pub order_index: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogWorkoutSetRequest {
    pub id: Option<String>,
    pub workout_exercise_id: String,
    pub set_number: i64,
    pub weight: Option<f64>,
    pub reps: Option<i64>,
    pub rpe: Option<f64>,
    pub is_warmup: Option<bool>,
    pub completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkoutSetRequest {
    pub weight: Option<f64>,
    pub reps: Option<i64>,
    pub rpe: Option<f64>,
    pub is_warmup: Option<bool>,
    pub completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PersonalRecordItem {
    pub exercise_name: String,
    pub heaviest_weight: Option<f64>,
    pub max_reps: Option<i64>,
    pub estimated_1rm: Option<f64>,
    pub max_volume_set: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExerciseProgressionData {
    pub exercise_name: String,
    pub records: PersonalRecordItem,
    pub history: Vec<ExerciseHistoryPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExerciseHistoryPoint {
    pub work_date: String,
    pub set_number: i64,
    pub weight: f64,
    pub reps: i64,
    pub estimated_1rm: f64,
    pub volume: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteWorkoutResponse {
    pub session: WorkoutSessionDetail,
    pub new_prs: Vec<PersonalRecordItem>,
}


