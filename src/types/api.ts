/**
 * Shared API contracts and DTOs matching backend Rust types in backend/src/models.rs.
 * All property keys strictly mirror Rust serde serialization (snake_case database representation).
 */

export interface FocusTaskDto {
  id: string;
  name: string;
  target_minutes: number;
  color: string;
  created_at?: string | null;
}

export interface FocusSessionDto {
  id: string;
  task_id: string;
  seconds: number;
  note: string;
  work_date: string; // YYYY-MM-DD
  ended_at: string; // ISO timestamp
  action_task_id?: string | null;
  started_at?: string | null;
  created_at?: string | null;
}

export interface ActiveSessionDto {
  id: string;
  task_id: string;
  started_at: string;
  last_resumed_at?: string | null;
  accumulated_seconds: number;
  target_seconds?: number | null;
  is_paused: boolean;
  client_version: number;
  updated_at: string;
}

export interface UpsertActiveSessionRequestDto {
  id: string;
  task_id: string;
  started_at: string;
  last_resumed_at?: string | null;
  accumulated_seconds: number;
  target_seconds?: number | null;
  is_paused: boolean;
  client_version: number;
}

export interface CompleteFocusSessionRequestDto {
  id: string;
  task_id: string;
  seconds: number;
  note?: string | null;
  work_date: string;
  action_task_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface WorkoutEntryDto {
  id: string;
  work_date: string;
  kind: "strength" | "cardio" | string;
  exercise: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  duration_minutes?: number | null;
  distance?: number | null;
  intensity: string;
  note: string;
  created_at?: string | null;
}

export interface TaskCompletionDto {
  id: string;
  task_id: string;
  completion_date: string; // YYYY-MM-DD
  created_at?: string | null;
}

export interface LedgerResponseDto {
  tasks: FocusTaskDto[];
  sessions: FocusSessionDto[];
  workouts: WorkoutEntryDto[];
  completions: TaskCompletionDto[];
}

export interface SyncRequestDto {
  tasks?: FocusTaskDto[];
  sessions?: FocusSessionDto[];
  workouts?: WorkoutEntryDto[];
  completions?: TaskCompletionDto[];
}

export interface DeleteCompletionQueryDto {
  task_id: string;
  date: string;
}

export interface AuthStatusResponseDto {
  is_setup: boolean;
  authenticated: boolean;
  role: "owner" | "guest" | string;
}

export interface AuthSetupRequestDto {
  password: string;
}

export interface AuthLoginRequestDto {
  password: string;
}

export interface AuthChangePasswordRequestDto {
  current_password: string;
  new_password: string;
}

export interface AuthSuccessResponseDto {
  token: string;
  role: string;
}

export interface SyncChangeDto {
  change_id: number;
  entity_type: string;
  entity_id: string;
  op_type: "upsert" | "delete";
  payload?: string | null;
  version: number;
  created_at: string;
}

export interface SyncChangesQueryDto {
  cursor?: number;
  limit?: number;
}

export interface SyncChangesResponseDto {
  changes: SyncChangeDto[];
  latest_cursor: number;
  has_more: boolean;
}

export interface ClientOperationDto {
  op_id: string;
  entity_type: "task" | "session" | "workout" | "completion" | string;
  entity_id: string;
  op_type: "upsert" | "delete";
  payload?: any;
  client_version?: number;
}

export interface SyncOperationsRequestDto {
  client_id?: string;
  operations: ClientOperationDto[];
}

export interface SyncOperationsResponseDto {
  applied_count: number;
  deduplicated_count: number;
  latest_cursor: number;
}

export interface FocusSessionsQueryDto {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  start_date?: string | null;
  target_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectSummaryDto extends ProjectDto {
  task_count: number;
  total_focus_seconds: number;
}

export interface CreateProjectRequestDto {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  status?: string;
  start_date?: string | null;
  target_date?: string | null;
}

export interface UpdateProjectRequestDto {
  name?: string;
  description?: string;
  color?: string;
  status?: string;
  start_date?: string | null;
  target_date?: string | null;
}

export interface ActionTaskDto {
  id: string;
  project_id?: string | null;
  goal_id?: string | null;
  focus_task_id?: string | null;
  title: string;
  description: string;
  status: "inbox" | "ready" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  estimate_minutes?: number | null;
  due_at?: string | null;
  completed_at?: string | null;
  completion_notes: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateActionTaskRequestDto {
  id?: string;
  project_id?: string | null;
  goal_id?: string | null;
  focus_task_id?: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate_minutes?: number | null;
  due_at?: string | null;
}

export interface UpdateActionTaskRequestDto {
  project_id?: string | null;
  goal_id?: string | null;
  focus_task_id?: string | null;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate_minutes?: number | null;
  due_at?: string | null;
  completed_at?: string | null;
  completion_notes?: string;
}

export interface ActionTasksQueryDto {
  project_id?: string;
  status?: string;
  priority?: string;
  due_date?: string;
}

export interface GoalMilestoneDto {
  id: string;
  goal_id: string;
  title: string;
  target_date?: string | null;
  status: "pending" | "completed";
  completed_at?: string | null;
}

export interface GoalDto {
  id: string;
  project_id?: string | null;
  title: string;
  goal_type: "outcome" | "time" | "consistency" | "habit" | "training";
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string;
  status: string;
  created_at?: string | null;
}

export interface GoalWithMilestonesDto extends GoalDto {
  milestones: GoalMilestoneDto[];
  progress_percentage: number;
}

export interface CreateGoalRequestDto {
  id?: string;
  project_id?: string | null;
  title: string;
  goal_type: string;
  target_value: number;
  current_value?: number;
  unit: string;
  start_date: string;
  target_date: string;
  status?: string;
}

export interface UpdateGoalRequestDto {
  project_id?: string | null;
  title?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date?: string;
  target_date?: string;
  status?: string;
}

export interface CreateMilestoneRequestDto {
  id?: string;
  title: string;
  target_date?: string | null;
}

export interface UpdateMilestoneRequestDto {
  title?: string;
  target_date?: string | null;
  status?: string;
  completed_at?: string | null;
}

export interface PlannedBlockWithTaskDto {
  id: string;
  action_task_id?: string | null;
  plan_date: string;
  start_at: string;
  end_at: string;
  status: "planned" | "completed" | "skipped" | "rescheduled";
  notes: string;
  created_at?: string | null;
  task_title?: string | null;
  task_priority?: "low" | "medium" | "high" | "urgent" | null;
  project_name?: string | null;
  project_color?: string | null;
}

export interface CreatePlannedBlockRequestDto {
  id?: string;
  action_task_id?: string | null;
  plan_date: string;
  start_at: string;
  end_at: string;
  status?: string;
  notes?: string;
}

export interface UpdatePlannedBlockRequestDto {
  action_task_id?: string | null;
  plan_date?: string;
  start_at?: string;
  end_at?: string;
  status?: string;
  notes?: string;
}

export interface PlannedBlocksQueryDto {
  date?: string;
  start_date?: string;
  end_date?: string;
}

export interface HabitWithHistoryDto {
  id: string;
  name: string;
  schedule_rule: string;
  target_frequency: number;
  color: string;
  active: boolean;
  created_at?: string | null;
  current_streak: number;
  recent_dates: string[];
}

export interface CreateHabitRequestDto {
  id?: string;
  name: string;
  schedule_rule?: string;
  target_frequency?: number;
  color?: string;
}

export interface UpdateHabitRequestDto {
  name?: string;
  schedule_rule?: string;
  target_frequency?: number;
  color?: string;
  active?: boolean;
}

export interface ToggleHabitRequestDto {
  date: string;
  note?: string;
}

export interface DailyReviewDto {
  id: string;
  review_date: string;
  accomplishments: string;
  blockers: string;
  reflection: string;
  energy_rating?: number | null;
  focus_rating?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UpsertDailyReviewRequestDto {
  accomplishments?: string;
  blockers?: string;
  reflection?: string;
  energy_rating?: number | null;
  focus_rating?: number | null;
}

export interface WeeklyReviewSummaryDto {
  start_date: string;
  end_date: string;
  total_focus_seconds: number;
  completed_tasks_count: number;
  workout_count: number;
  total_workout_volume?: number;
  habit_completion_rate: number;
  daily_reviews: DailyReviewDto[];
}

export interface InsightItemDto {
  id: string;
  rule_id: string;
  title: string;
  message: string;
  severity: "warning" | "info" | "success" | "alert";
  category: "focus" | "tasks" | "goals" | "estimation" | "habits";
  metric_name: string;
  formula: string;
  data_points: Record<string, any>;
  supporting_record_ids: string[];
  created_at: string;
}

export interface InsightsResponseDto {
  insights: InsightItemDto[];
  days_logged: number;
  total_focus_seconds: number;
  has_sufficient_data: boolean;
}

// ---------------------------------------------------------
// Phase 4: Structured Workouts Domain DTOs
// ---------------------------------------------------------

export interface RoutineExerciseDto {
  id: string;
  routine_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  target_rpe?: number | null;
  rest_seconds: number;
  order_index: number;
}

export interface WorkoutRoutineDto {
  id: string;
  name: string;
  description: string;
  created_at: string;
  exercises: RoutineExerciseDto[];
}

export interface CreateRoutineExerciseInputDto {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  target_rpe?: number | null;
  rest_seconds?: number | null;
  order_index?: number | null;
}

export interface CreateRoutineRequestDto {
  name: string;
  description?: string;
  exercises: CreateRoutineExerciseInputDto[];
}

export interface UpdateRoutineRequestDto {
  name?: string;
  description?: string;
  exercises?: CreateRoutineExerciseInputDto[];
}

export interface WorkoutSetDto {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  is_warmup: boolean;
  completed: boolean;
}

export interface WorkoutExerciseWithSetsDto {
  id: string;
  session_id: string;
  exercise_name: string;
  order_index: number;
  sets: WorkoutSetDto[];
}

export interface WorkoutSessionDetailDto {
  id: string;
  routine_id?: string | null;
  routine_name?: string | null;
  work_date: string;
  started_at: string;
  ended_at?: string | null;
  notes: string;
  energy_rating?: number | null;
  created_at: string;
  exercises: WorkoutExerciseWithSetsDto[];
  total_volume: number;
  total_completed_sets: number;
}

export interface StartWorkoutSessionRequestDto {
  routine_id?: string | null;
  work_date?: string | null;
  started_at?: string | null;
  exercises?: string[] | null;
}

export interface CompleteWorkoutSessionRequestDto {
  ended_at?: string | null;
  notes?: string | null;
  energy_rating?: number | null;
}

export interface AddWorkoutExerciseRequestDto {
  session_id: string;
  exercise_name: string;
  order_index?: number | null;
}

export interface LogWorkoutSetRequestDto {
  id?: string | null;
  workout_exercise_id: string;
  set_number: number;
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  is_warmup?: boolean | null;
  completed?: boolean | null;
}

export interface UpdateWorkoutSetRequestDto {
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  is_warmup?: boolean | null;
  completed?: boolean | null;
}

export interface PersonalRecordItemDto {
  exercise_name: string;
  heaviest_weight?: number | null;
  max_reps?: number | null;
  estimated_1rm?: number | null;
  max_volume_set?: number | null;
}

export interface ExerciseHistoryPointDto {
  work_date: string;
  set_number: number;
  weight: number;
  reps: number;
  estimated_1rm: number;
  volume: number;
}

export interface ExerciseProgressionDataDto {
  exercise_name: string;
  records: PersonalRecordItemDto;
  history: ExerciseHistoryPointDto[];
}

export interface CompleteWorkoutResponseDto {
  session: WorkoutSessionDetailDto;
  new_prs: PersonalRecordItemDto[];
}


