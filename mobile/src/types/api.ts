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

