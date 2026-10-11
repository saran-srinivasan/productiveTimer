import { FocusTask, FocusSession, WorkoutEntry, TaskCompletion, ActiveSession } from "./types/ledger";
import {
  FocusTaskDto,
  FocusSessionDto,
  WorkoutEntryDto,
  TaskCompletionDto,
  ActiveSessionDto,
  UpsertActiveSessionRequestDto,
  CompleteFocusSessionRequestDto,
  LedgerResponseDto,
  SyncRequestDto,
  AuthStatusResponseDto,
  AuthSuccessResponseDto,
  SyncChangeDto,
  SyncChangesQueryDto,
  SyncChangesResponseDto,
  ClientOperationDto,
  SyncOperationsRequestDto,
  SyncOperationsResponseDto,
  FocusSessionsQueryDto,
  ProjectDto,
  ProjectSummaryDto,
  CreateProjectRequestDto,
  UpdateProjectRequestDto,
  ActionTaskDto,
  CreateActionTaskRequestDto,
  UpdateActionTaskRequestDto,
  ActionTasksQueryDto,
  GoalDto,
  GoalMilestoneDto,
  GoalWithMilestonesDto,
  CreateGoalRequestDto,
  UpdateGoalRequestDto,
  CreateMilestoneRequestDto,
  UpdateMilestoneRequestDto,
  PlannedBlockWithTaskDto,
  CreatePlannedBlockRequestDto,
  UpdatePlannedBlockRequestDto,
  PlannedBlocksQueryDto,
  HabitWithHistoryDto,
  CreateHabitRequestDto,
  UpdateHabitRequestDto,
  ToggleHabitRequestDto,
  DailyReviewDto,
  UpsertDailyReviewRequestDto,
  WeeklyReviewSummaryDto,
  InsightItemDto,
  InsightsResponseDto,
  WorkoutRoutineDto,
  CreateRoutineRequestDto,
  UpdateRoutineRequestDto,
  StartWorkoutSessionRequestDto,
  WorkoutSessionDetailDto,
  CompleteWorkoutSessionRequestDto,
  CompleteWorkoutResponseDto,
  AddWorkoutExerciseRequestDto,
  WorkoutExerciseWithSetsDto,
  LogWorkoutSetRequestDto,
  WorkoutSetDto,
  UpdateWorkoutSetRequestDto,
  PersonalRecordItemDto,
  ExerciseProgressionDataDto,
} from "./types/api";

export * from "./types/api";

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "/api";

export const toTaskRow = (task: FocusTask): FocusTaskDto => ({
  id: task.id,
  name: task.name,
  target_minutes: task.targetMinutes,
  color: task.color,
});

export const fromTaskRow = (row: FocusTaskDto): FocusTask => ({
  id: row.id,
  name: row.name,
  targetMinutes: row.target_minutes,
  color: row.color,
});

export const toSessionRow = (session: FocusSession): FocusSessionDto => ({
  id: session.id,
  task_id: session.taskId,
  seconds: session.seconds,
  note: session.note ?? "",
  work_date: session.date,
  action_task_id: session.actionTaskId ?? undefined,
  started_at: session.startedAt,
  ended_at: session.endedAt,
});

export const fromSessionRow = (row: FocusSessionDto): FocusSession => ({
  id: row.id,
  taskId: row.task_id,
  seconds: row.seconds,
  note: row.note ?? "",
  date: row.work_date,
  actionTaskId: row.action_task_id ?? undefined,
  startedAt: row.started_at ?? undefined,
  endedAt: row.ended_at,
});

export const toWorkoutRow = (workout: WorkoutEntry): WorkoutEntryDto => ({
  id: workout.id,
  work_date: workout.date,
  kind: workout.kind,
  exercise: workout.exercise,
  sets: workout.sets,
  reps: workout.reps,
  weight: workout.weight,
  duration_minutes: workout.durationMinutes,
  distance: workout.distance,
  intensity: workout.intensity,
  note: workout.note ?? "",
  created_at: workout.createdAt,
});

export const fromWorkoutRow = (row: WorkoutEntryDto): WorkoutEntry => ({
  id: row.id,
  date: row.work_date,
  kind: (row.kind as "strength" | "cardio") || "strength",
  exercise: row.exercise,
  sets: row.sets ?? null,
  reps: row.reps ?? null,
  weight: row.weight ?? null,
  durationMinutes: row.duration_minutes ?? null,
  distance: row.distance ?? null,
  intensity: row.intensity,
  note: row.note ?? "",
  createdAt: row.created_at ?? "",
});

export const toCompletionRow = (completion: TaskCompletion): TaskCompletionDto => ({
  id: completion.id,
  task_id: completion.taskId,
  completion_date: completion.date,
  created_at: completion.createdAt,
});

export const fromCompletionRow = (row: TaskCompletionDto): TaskCompletion => ({
  id: row.id,
  taskId: row.task_id,
  date: row.completion_date,
  createdAt: row.created_at ?? "",
});

const TOKEN_KEY = "productive_timer_auth_token";

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

export const getAuthHeaders = (customToken?: string | null): Record<string, string> => {
  const token = customToken !== undefined ? customToken : getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export interface AuthStatusResponse {
  is_setup: boolean;
  authenticated: boolean;
  role: "owner" | "guest";
}

export interface AuthSuccessResponse {
  token: string;
  role: string;
}

export const checkAuthStatusApi = async (token?: string | null): Promise<AuthStatusResponse> => {
  const res = await fetch(`${API_BASE}/auth/status`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Auth status check failed: ${res.status}`);
  }
  return res.json();
};

export const setupMasterPasswordApi = async (password: string): Promise<AuthSuccessResponse> => {
  const res = await fetch(`${API_BASE}/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Setup failed: ${res.status}`);
  }
  return res.json();
};

export const loginMasterPasswordApi = async (password: string): Promise<AuthSuccessResponse> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Login failed: ${res.status}`);
  }
  return res.json();
};

export const logoutApi = async (token?: string | null): Promise<void> => {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(token),
      credentials: "include",
    });
  } catch {
    // Ignore error on logout
  }
};

export const logoutAllApi = async (token?: string | null): Promise<void> => {
  const res = await fetch(`${API_BASE}/auth/logout-all`, {
    method: "POST",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Logout all failed: ${res.status}`);
  }
};

export interface RemoteLedgerData {
  tasks: FocusTask[];
  sessions: FocusSession[];
  workouts: WorkoutEntry[];
  completions: TaskCompletion[];
}

export const fetchLedger = async (token?: string | null): Promise<RemoteLedgerData> => {
  const res = await fetch(`${API_BASE}/ledger`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ledger: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return {
    tasks: (json.tasks ?? []).map(fromTaskRow),
    sessions: (json.sessions ?? []).map(fromSessionRow),
    workouts: (json.workouts ?? []).map(fromWorkoutRow),
    completions: (json.completions ?? []).map(fromCompletionRow),
  };
};

export const syncLedger = async (
  data: {
    tasks?: FocusTask[];
    sessions?: FocusSession[];
    workouts?: WorkoutEntry[];
    completions?: TaskCompletion[];
  },
  token?: string | null,
): Promise<void> => {
  const effectiveToken = token !== undefined ? token : getAuthToken();
  if (!effectiveToken) return;

  const payload = {
    tasks: data.tasks ? data.tasks.map(toTaskRow) : undefined,
    sessions: data.sessions ? data.sessions.map(toSessionRow) : undefined,
    workouts: data.workouts ? data.workouts.map(toWorkoutRow) : undefined,
    completions: data.completions ? data.completions.map(toCompletionRow) : undefined,
  };

  const res = await fetch(`${API_BASE}/sync`, {
    method: "POST",
    headers: getAuthHeaders(effectiveToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Sync error: ${res.status} ${res.statusText}`);
  }
};

export const deleteTaskApi = async (taskId: string, token?: string | null): Promise<void> => {
  const effectiveToken = token !== undefined ? token : getAuthToken();
  if (!effectiveToken) return;

  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(effectiveToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Delete task failed: ${res.status}`);
  }
};

export const deleteSessionApi = async (sessionId: string, token?: string | null): Promise<void> => {
  const effectiveToken = token !== undefined ? token : getAuthToken();
  if (!effectiveToken) return;

  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(effectiveToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Delete session failed: ${res.status}`);
  }
};

export const deleteWorkoutApi = async (workoutId: string, token?: string | null): Promise<void> => {
  const effectiveToken = token !== undefined ? token : getAuthToken();
  if (!effectiveToken) return;

  const res = await fetch(`${API_BASE}/workouts/${encodeURIComponent(workoutId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(effectiveToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Delete workout failed: ${res.status}`);
  }
};

export const deleteCompletionApi = async (taskId: string, date: string, token?: string | null): Promise<void> => {
  const effectiveToken = token !== undefined ? token : getAuthToken();
  if (!effectiveToken) return;

  const params = new URLSearchParams({ task_id: taskId, date });
  const res = await fetch(`${API_BASE}/completions?${params.toString()}`, {
    method: "DELETE",
    headers: getAuthHeaders(effectiveToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Delete completion failed: ${res.status}`);
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
};

export const migrateFromSupabaseApi = async (
  supabaseUrl?: string,
  supabaseAnonKey?: string,
  token?: string | null,
): Promise<{ status: string; migrated: { tasks: number; sessions: number; workouts: number; completions: number } }> => {
  const res = await fetch(`${API_BASE}/migrate-from-supabase`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      supabase_url: supabaseUrl,
      supabase_anon_key: supabaseAnonKey,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Migration failed: ${res.status} ${text}`);
  }
  return res.json();
};

export const fetchActiveSessionApi = async (token?: string | null): Promise<ActiveSession | null> => {
  try {
    const res = await fetch(`${API_BASE}/v1/active-session`, {
      headers: getAuthHeaders(token),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    return {
      id: data.id,
      taskId: data.task_id,
      startedAt: data.started_at,
      lastResumedAt: data.last_resumed_at,
      accumulatedSeconds: data.accumulated_seconds,
      targetSeconds: data.target_seconds,
      isPaused: data.is_paused,
      clientVersion: data.client_version,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
};

export const upsertActiveSessionApi = async (
  session: {
    id: string;
    taskId: string;
    startedAt: string;
    lastResumedAt?: string | null;
    accumulatedSeconds: number;
    targetSeconds?: number | null;
    isPaused: boolean;
    clientVersion: number;
  },
  token?: string | null,
): Promise<void> => {
  try {
    const payload = {
      id: session.id,
      task_id: session.taskId,
      started_at: session.startedAt,
      last_resumed_at: session.lastResumedAt,
      accumulated_seconds: session.accumulatedSeconds,
      target_seconds: session.targetSeconds,
      is_paused: session.isPaused,
      client_version: session.clientVersion,
    };
    await fetch(`${API_BASE}/v1/active-session`, {
      method: "PUT",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch {
    // Ignore network drop on background upsert
  }
};

export const deleteActiveSessionApi = async (token?: string | null): Promise<void> => {
  try {
    await fetch(`${API_BASE}/v1/active-session`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
      credentials: "include",
    });
  } catch {
    // Ignore network drop
  }
};

export const completeFocusSessionApi = async (
  session: {
    id: string;
    taskId: string;
    seconds: number;
    note?: string;
    date: string;
    actionTaskId?: string | null;
    startedAt?: string;
    endedAt: string;
  },
  token?: string | null,
): Promise<void> => {
  const payload = {
    id: session.id,
    task_id: session.taskId,
    seconds: session.seconds,
    note: session.note,
    work_date: session.date,
    action_task_id: session.actionTaskId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
  };
  const res = await fetch(`${API_BASE}/v1/focus-sessions`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to complete session: ${res.status}`);
  }
};

const OFFLINE_QUEUE_KEY = "productive_timer_offline_mutation_queue";

export interface QueuedMutation {
  op_id: string;
  entity_type: "task" | "session" | "workout" | "completion";
  entity_id: string;
  op_type: "upsert" | "delete";
  payload?: any;
  created_at: string;
}

export const getOfflineQueue = (): QueuedMutation[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const enqueueOfflineMutation = (mutation: Omit<QueuedMutation, "op_id" | "created_at"> & { op_id?: string }): void => {
  try {
    const queue = getOfflineQueue();
    const item: QueuedMutation = {
      op_id: mutation.op_id || `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      entity_type: mutation.entity_type,
      entity_id: mutation.entity_id,
      op_type: mutation.op_type,
      payload: mutation.payload,
      created_at: new Date().toISOString(),
    };
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage issues
  }
};

export const clearOfflineQueue = (): void => {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // Ignore
  }
};

export const getPendingMutationCount = (): number => {
  return getOfflineQueue().length;
};

export const applySyncOperationsApi = async (
  operations: ClientOperationDto[],
  clientId = "web-client",
  token?: string | null,
): Promise<SyncOperationsResponseDto> => {
  const res = await fetch(`${API_BASE}/v1/sync/operations`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      client_id: clientId,
      operations,
    }),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to apply sync operations: ${res.status}`);
  }
  return res.json();
};

export const drainOfflineQueueApi = async (token?: string | null): Promise<SyncOperationsResponseDto | null> => {
  const queue = getOfflineQueue();
  if (!queue.length) return null;

  const ops: ClientOperationDto[] = queue.map((q) => ({
    op_id: q.op_id,
    entity_type: q.entity_type,
    entity_id: q.entity_id,
    op_type: q.op_type,
    payload: q.payload,
    client_version: 1,
  }));

  const res = await applySyncOperationsApi(ops, "web-client", token);
  clearOfflineQueue();
  return res;
};

export const fetchSyncChangesApi = async (
  cursor = 0,
  limit = 100,
  token?: string | null,
): Promise<SyncChangesResponseDto> => {
  const res = await fetch(`${API_BASE}/v1/sync/changes?cursor=${cursor}&limit=${limit}`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sync changes: ${res.status}`);
  }
  return res.json();
};

export const fetchFocusSessionsHistoryApi = async (
  query?: FocusSessionsQueryDto,
  token?: string | null,
): Promise<FocusSession[]> => {
  const params = new URLSearchParams();
  if (query?.start_date) params.set("start_date", query.start_date);
  if (query?.end_date) params.set("end_date", query.end_date);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.offset) params.set("offset", String(query.offset));

  const url = `${API_BASE}/v1/focus-sessions${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch session history: ${res.status}`);
  }
  const json: FocusSessionDto[] = await res.json();
  return json.map(fromSessionRow);
};

export const fetchProjectsApi = async (
  status?: string,
  token?: string | null,
): Promise<ProjectSummaryDto[]> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const url = `${API_BASE}/v1/projects${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status}`);
  }
  return res.json();
};

export const createProjectApi = async (
  project: CreateProjectRequestDto,
  token?: string | null,
): Promise<ProjectDto> => {
  const res = await fetch(`${API_BASE}/v1/projects`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(project),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create project: ${res.status}`);
  }
  return res.json();
};

export const updateProjectApi = async (
  id: string,
  updates: UpdateProjectRequestDto,
  token?: string | null,
): Promise<ProjectDto> => {
  const res = await fetch(`${API_BASE}/v1/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update project: ${res.status}`);
  }
  return res.json();
};

export const deleteProjectApi = async (
  id: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/v1/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete project: ${res.status}`);
  }
};

export const fetchActionTasksApi = async (
  query?: ActionTasksQueryDto,
  token?: string | null,
): Promise<ActionTaskDto[]> => {
  const params = new URLSearchParams();
  if (query?.project_id) params.set("project_id", query.project_id);
  if (query?.status) params.set("status", query.status);
  if (query?.priority) params.set("priority", query.priority);
  if (query?.due_date) params.set("due_date", query.due_date);

  const url = `${API_BASE}/v1/tasks${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch action tasks: ${res.status}`);
  }
  return res.json();
};

export const createActionTaskApi = async (
  task: CreateActionTaskRequestDto,
  token?: string | null,
): Promise<ActionTaskDto> => {
  const res = await fetch(`${API_BASE}/v1/tasks`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(task),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create action task: ${res.status}`);
  }
  return res.json();
};

export const updateActionTaskApi = async (
  id: string,
  updates: UpdateActionTaskRequestDto,
  token?: string | null,
): Promise<ActionTaskDto> => {
  const res = await fetch(`${API_BASE}/v1/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update action task: ${res.status}`);
  }
  return res.json();
};

export const deleteActionTaskApi = async (
  id: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/v1/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete action task: ${res.status}`);
  }
};

export const fetchGoalsApi = async (
  token?: string | null,
): Promise<GoalWithMilestonesDto[]> => {
  const res = await fetch(`${API_BASE}/v1/goals`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch goals: ${res.status}`);
  }
  return res.json();
};

export const createGoalApi = async (
  goal: CreateGoalRequestDto,
  token?: string | null,
): Promise<GoalDto> => {
  const res = await fetch(`${API_BASE}/v1/goals`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(goal),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create goal: ${res.status}`);
  }
  return res.json();
};

export const updateGoalApi = async (
  id: string,
  updates: UpdateGoalRequestDto,
  token?: string | null,
): Promise<GoalDto> => {
  const res = await fetch(`${API_BASE}/v1/goals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update goal: ${res.status}`);
  }
  return res.json();
};

export const deleteGoalApi = async (
  id: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/v1/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete goal: ${res.status}`);
  }
};

export const addMilestoneApi = async (
  goalId: string,
  milestone: CreateMilestoneRequestDto,
  token?: string | null,
): Promise<GoalMilestoneDto> => {
  const res = await fetch(`${API_BASE}/v1/goals/${encodeURIComponent(goalId)}/milestones`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(milestone),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to add milestone: ${res.status}`);
  }
  return res.json();
};

export const updateMilestoneApi = async (
  goalId: string,
  milestoneId: string,
  updates: UpdateMilestoneRequestDto,
  token?: string | null,
): Promise<GoalMilestoneDto> => {
  const res = await fetch(
    `${API_BASE}/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "PATCH",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to update milestone: ${res.status}`);
  }
  return res.json();
};

export const deleteMilestoneApi = async (
  goalId: string,
  milestoneId: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(
    `${API_BASE}/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to delete milestone: ${res.status}`);
  }
};

export const fetchPlannedBlocksApi = async (
  query?: PlannedBlocksQueryDto,
  token?: string | null,
): Promise<PlannedBlockWithTaskDto[]> => {
  const params = new URLSearchParams();
  if (query?.date) params.append("date", query.date);
  if (query?.start_date) params.append("start_date", query.start_date);
  if (query?.end_date) params.append("end_date", query.end_date);

  const qs = params.toString();
  const url = `${API_BASE}/v1/planned-blocks${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch planned blocks: ${res.status}`);
  }
  return res.json();
};

export const createPlannedBlockApi = async (
  block: CreatePlannedBlockRequestDto,
  token?: string | null,
): Promise<PlannedBlockWithTaskDto> => {
  const res = await fetch(`${API_BASE}/v1/planned-blocks`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(block),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create planned block: ${res.status}`);
  }
  return res.json();
};

export const updatePlannedBlockApi = async (
  id: string,
  updates: UpdatePlannedBlockRequestDto,
  token?: string | null,
): Promise<PlannedBlockWithTaskDto> => {
  const res = await fetch(`${API_BASE}/v1/planned-blocks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update planned block: ${res.status}`);
  }
  return res.json();
};

export const deletePlannedBlockApi = async (
  id: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/v1/planned-blocks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete planned block: ${res.status}`);
  }
};

export const fetchHabitsApi = async (
  token?: string | null,
): Promise<HabitWithHistoryDto[]> => {
  const res = await fetch(`${API_BASE}/v1/habits`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch habits: ${res.status}`);
  }
  return res.json();
};

export const createHabitApi = async (
  habit: CreateHabitRequestDto,
  token?: string | null,
): Promise<HabitWithHistoryDto> => {
  const res = await fetch(`${API_BASE}/v1/habits`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(habit),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create habit: ${res.status}`);
  }
  return res.json();
};

export const updateHabitApi = async (
  id: string,
  updates: UpdateHabitRequestDto,
  token?: string | null,
): Promise<HabitWithHistoryDto> => {
  const res = await fetch(`${API_BASE}/v1/habits/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update habit: ${res.status}`);
  }
  return res.json();
};

export const deleteHabitApi = async (
  id: string,
  token?: string | null,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/v1/habits/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete habit: ${res.status}`);
  }
};

export const toggleHabitApi = async (
  id: string,
  req: ToggleHabitRequestDto,
  token?: string | null,
): Promise<{ completed: boolean; date: string }> => {
  const res = await fetch(`${API_BASE}/v1/habits/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to toggle habit: ${res.status}`);
  }
  return res.json();
};

export const fetchDailyReviewApi = async (
  date: string,
  token?: string | null,
): Promise<DailyReviewDto | null> => {
  const res = await fetch(`${API_BASE}/v1/daily-reviews/${encodeURIComponent(date)}`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch daily review: ${res.status}`);
  }
  return res.json();
};

export const upsertDailyReviewApi = async (
  date: string,
  review: UpsertDailyReviewRequestDto,
  token?: string | null,
): Promise<DailyReviewDto> => {
  const res = await fetch(`${API_BASE}/v1/daily-reviews/${encodeURIComponent(date)}`, {
    method: "PUT",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(review),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to save daily review: ${res.status}`);
  }
  return res.json();
};

export const fetchWeeklyReviewApi = async (
  startDate: string,
  token?: string | null,
): Promise<WeeklyReviewSummaryDto> => {
  const res = await fetch(`${API_BASE}/v1/weekly-reviews/${encodeURIComponent(startDate)}`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch weekly review: ${res.status}`);
  }
  return res.json();
};

export const fetchInsightsApi = async (
  token?: string | null,
): Promise<InsightsResponseDto> => {
  const res = await fetch(`${API_BASE}/v1/insights`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch insights: ${res.status}`);
  }
  return res.json();
};

// ---------------------------------------------------------
// Phase 4: Structured Workouts Domain APIs
// ---------------------------------------------------------

export const fetchWorkoutRoutinesApi = async (
  token?: string | null,
): Promise<WorkoutRoutineDto[]> => {
  const res = await fetch(`${API_BASE}/v1/workouts/routines`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch routines: ${res.status}`);
  }
  return res.json();
};

export const createWorkoutRoutineApi = async (
  req: CreateRoutineRequestDto,
  token?: string | null,
): Promise<WorkoutRoutineDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/routines`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to create routine: ${res.status}`);
  }
  return res.json();
};

export const updateWorkoutRoutineApi = async (
  id: string,
  req: UpdateRoutineRequestDto,
  token?: string | null,
): Promise<WorkoutRoutineDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/routines/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update routine: ${res.status}`);
  }
  return res.json();
};

export const deleteWorkoutRoutineApi = async (
  id: string,
  token?: string | null,
): Promise<{ status: string; id: string }> => {
  const res = await fetch(`${API_BASE}/v1/workouts/routines/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete routine: ${res.status}`);
  }
  return res.json();
};

export const startWorkoutSessionApi = async (
  req: StartWorkoutSessionRequestDto,
  token?: string | null,
): Promise<WorkoutSessionDetailDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sessions/start`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to start workout session: ${res.status}`);
  }
  return res.json();
};

export const fetchActiveWorkoutSessionApi = async (
  token?: string | null,
): Promise<WorkoutSessionDetailDto | null> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sessions/active`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch active workout session: ${res.status}`);
  }
  return res.json();
};

export const fetchWorkoutSessionsApi = async (
  startDate?: string,
  endDate?: string,
  limit?: number,
  token?: string | null,
): Promise<WorkoutSessionDetailDto[]> => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (limit) params.set("limit", limit.toString());

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/v1/workouts/sessions${query}`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch workout sessions: ${res.status}`);
  }
  return res.json();
};

export const fetchWorkoutSessionApi = async (
  id: string,
  token?: string | null,
): Promise<WorkoutSessionDetailDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sessions/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch workout session: ${res.status}`);
  }
  return res.json();
};

export const completeWorkoutSessionApi = async (
  id: string,
  req: CompleteWorkoutSessionRequestDto,
  token?: string | null,
): Promise<CompleteWorkoutResponseDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sessions/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to complete workout session: ${res.status}`);
  }
  return res.json();
};

export const deleteWorkoutSessionApi = async (
  id: string,
  token?: string | null,
): Promise<{ status: string; id: string }> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete workout session: ${res.status}`);
  }
  return res.json();
};

export const addWorkoutExerciseApi = async (
  req: AddWorkoutExerciseRequestDto,
  token?: string | null,
): Promise<WorkoutExerciseWithSetsDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/exercises`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to add workout exercise: ${res.status}`);
  }
  return res.json();
};

export const deleteWorkoutExerciseApi = async (
  id: string,
  token?: string | null,
): Promise<{ status: string; id: string }> => {
  const res = await fetch(`${API_BASE}/v1/workouts/exercises/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete workout exercise: ${res.status}`);
  }
  return res.json();
};

export const logWorkoutSetApi = async (
  req: LogWorkoutSetRequestDto,
  token?: string | null,
): Promise<WorkoutSetDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sets`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to log workout set: ${res.status}`);
  }
  return res.json();
};

export const updateWorkoutSetApi = async (
  id: string,
  req: UpdateWorkoutSetRequestDto,
  token?: string | null,
): Promise<WorkoutSetDto> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to update workout set: ${res.status}`);
  }
  return res.json();
};

export const deleteWorkoutSetApi = async (
  id: string,
  token?: string | null,
): Promise<{ status: string; id: string }> => {
  const res = await fetch(`${API_BASE}/v1/workouts/sets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete workout set: ${res.status}`);
  }
  return res.json();
};

export const fetchAllPrsApi = async (
  token?: string | null,
): Promise<PersonalRecordItemDto[]> => {
  const res = await fetch(`${API_BASE}/v1/workouts/prs`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch PRs: ${res.status}`);
  }
  return res.json();
};

export const fetchExerciseProgressionApi = async (
  exerciseName: string,
  token?: string | null,
): Promise<ExerciseProgressionDataDto> => {
  const res = await fetch(
    `${API_BASE}/v1/workouts/exercises/${encodeURIComponent(exerciseName)}/progression`,
    {
      headers: getAuthHeaders(token),
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch exercise progression: ${res.status}`);
  }
  return res.json();
};




