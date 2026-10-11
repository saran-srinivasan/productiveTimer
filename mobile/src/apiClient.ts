import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "./constants";
import {
  ActiveSessionDto,
  AuthStatusResponseDto,
  AuthSuccessResponseDto,
  ClientOperationDto,
  CompleteFocusSessionRequestDto,
  FocusSessionDto,
  FocusSessionsQueryDto,
  FocusTaskDto,
  LedgerResponseDto,
  SyncChangesResponseDto,
  SyncOperationsResponseDto,
  TaskCompletionDto,
  UpsertActiveSessionRequestDto,
  WorkoutEntryDto,
  ProjectDto,
  ProjectSummaryDto,
  CreateProjectRequestDto,
  UpdateProjectRequestDto,
  ActionTaskDto,
  CreateActionTaskRequestDto,
  UpdateActionTaskRequestDto,
  ActionTasksQueryDto,
} from "./types/api";

const TOKEN_KEY = "productive_timer_mobile_token";

export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(TOKEN_KEY)
        : null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

export const getAuthHeaders = async (
  customToken?: string | null,
): Promise<Record<string, string>> => {
  const token =
    customToken !== undefined ? customToken : await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// Mappers
export const toTaskRow = (task: any): FocusTaskDto => ({
  id: task.id,
  name: task.name,
  target_minutes: task.targetMinutes ?? task.target_minutes ?? 30,
  color: task.color ?? "#287c6f",
});

export const fromTaskRow = (row: FocusTaskDto): any => ({
  id: row.id,
  name: row.name,
  targetMinutes: row.target_minutes,
  color: row.color,
});

export const toSessionRow = (session: any): FocusSessionDto => ({
  id: session.id,
  task_id: session.taskId ?? session.task_id,
  seconds: session.seconds,
  note: session.note ?? "",
  work_date: session.date ?? session.work_date,
  ended_at: session.endedAt ?? session.ended_at,
  started_at: session.startedAt ?? session.started_at,
});

export const fromSessionRow = (row: FocusSessionDto): any => ({
  id: row.id,
  taskId: row.task_id,
  seconds: row.seconds,
  note: row.note ?? "",
  date: row.work_date,
  startedAt: row.started_at,
  endedAt: row.ended_at,
});

export const toWorkoutRow = (workout: any): WorkoutEntryDto => ({
  id: workout.id,
  work_date: workout.date ?? workout.work_date,
  kind: workout.kind,
  exercise: workout.exercise,
  sets: workout.sets ?? null,
  reps: workout.reps ?? null,
  weight: workout.weight ?? null,
  duration_minutes: workout.durationMinutes ?? workout.duration_minutes ?? null,
  distance: workout.distance ?? null,
  intensity: workout.intensity ?? "moderate",
  note: workout.note ?? "",
  created_at: workout.createdAt ?? workout.created_at,
});

export const fromWorkoutRow = (row: WorkoutEntryDto): any => ({
  id: row.id,
  date: row.work_date,
  kind: row.kind,
  exercise: row.exercise,
  sets: row.sets ?? null,
  reps: row.reps ?? null,
  weight: row.weight ?? null,
  durationMinutes: row.duration_minutes ?? null,
  distance: row.distance ?? null,
  intensity: row.intensity ?? "moderate",
  note: row.note ?? "",
  createdAt: row.created_at ?? "",
});

export const toCompletionRow = (completion: any): TaskCompletionDto => ({
  id: completion.id,
  task_id: completion.taskId ?? completion.task_id,
  completion_date: completion.date ?? completion.completion_date,
  created_at: completion.createdAt ?? completion.created_at,
});

export const fromCompletionRow = (row: TaskCompletionDto): any => ({
  id: row.id,
  taskId: row.task_id,
  date: row.completion_date,
  createdAt: row.created_at ?? "",
});

export const toActiveSessionRow = (session: any): UpsertActiveSessionRequestDto => ({
  id: session.sessionId || session.id,
  task_id: session.taskId || session.task_id,
  started_at:
    session.startedAtIso ||
    (typeof session.startedAt === "number"
      ? new Date(session.startedAt).toISOString()
      : session.started_at),
  last_resumed_at: session.lastResumedAtIso || session.last_resumed_at || null,
  accumulated_seconds: session.elapsedSeconds ?? session.accumulated_seconds ?? 0,
  target_seconds: session.targetSeconds ?? session.target_seconds ?? null,
  is_paused: Boolean(session.paused ?? session.is_paused),
  client_version: session.clientVersion ?? session.client_version ?? 1,
});

export const fromActiveSessionRow = (row: ActiveSessionDto): any => ({
  id: row.id,
  taskId: row.task_id,
  startedAt: row.started_at,
  lastResumedAt: row.last_resumed_at,
  accumulatedSeconds: row.accumulated_seconds,
  targetSeconds: row.target_seconds,
  isPaused: Boolean(row.is_paused),
  clientVersion: row.client_version,
  updatedAt: row.updated_at,
});

// API Calls
export const checkAuthStatusApi = async (
  token?: string | null,
): Promise<AuthStatusResponseDto> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/auth/status`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Auth status check failed: ${res.status}`);
  }
  return res.json();
};

export const setupMasterPasswordApi = async (
  password: string,
): Promise<AuthSuccessResponseDto> => {
  const res = await fetch(`${API_BASE_URL}/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Setup failed: ${res.status}`);
  }
  const data: AuthSuccessResponseDto = await res.json();
  await setAuthToken(data.token);
  return data;
};

export const loginMasterPasswordApi = async (
  password: string,
): Promise<AuthSuccessResponseDto> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Login failed: ${res.status}`);
  }
  const data: AuthSuccessResponseDto = await res.json();
  await setAuthToken(data.token);
  return data;
};

export const logoutApi = async (token?: string | null): Promise<void> => {
  try {
    const headers = await getAuthHeaders(token);
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers,
    });
  } catch {
    // Ignore network errors on logout
  } finally {
    await setAuthToken(null);
  }
};

export const fetchLedger = async (
  token?: string | null,
): Promise<{
  tasks: any[];
  sessions: any[];
  workouts: any[];
  completions: any[];
}> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/ledger`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ledger: ${res.status} ${res.statusText}`);
  }
  const json: LedgerResponseDto = await res.json();
  return {
    tasks: (json.tasks ?? []).map(fromTaskRow),
    sessions: (json.sessions ?? []).map(fromSessionRow),
    workouts: (json.workouts ?? []).map(fromWorkoutRow),
    completions: (json.completions ?? []).map(fromCompletionRow),
  };
};

export const syncLedger = async (
  data: {
    tasks?: any[];
    sessions?: any[];
    workouts?: any[];
    completions?: any[];
  },
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const payload = {
    tasks: data.tasks ? data.tasks.map(toTaskRow) : undefined,
    sessions: data.sessions ? data.sessions.map(toSessionRow) : undefined,
    workouts: data.workouts ? data.workouts.map(toWorkoutRow) : undefined,
    completions: data.completions ? data.completions.map(toCompletionRow) : undefined,
  };

  const res = await fetch(`${API_BASE_URL}/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Sync error: ${res.status} ${res.statusText}`);
  }
};

export const deleteTaskApi = async (
  taskId: string,
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete task failed: ${res.status}`);
  }
};

export const deleteSessionApi = async (
  sessionId: string,
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete session failed: ${res.status}`);
  }
};

export const deleteWorkoutApi = async (
  workoutId: string,
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/workouts/${encodeURIComponent(workoutId)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete workout failed: ${res.status}`);
  }
};

export const deleteCompletionApi = async (
  taskId: string,
  date: string,
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const params = new URLSearchParams({ task_id: taskId, date });
  const res = await fetch(`${API_BASE_URL}/completions?${params.toString()}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete completion failed: ${res.status}`);
  }
};

export const fetchActiveSessionApi = async (
  token?: string | null,
): Promise<any | null> => {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${API_BASE_URL}/v1/active-session`, {
      headers,
    });
    if (!res.ok) return null;
    const data: ActiveSessionDto | null = await res.json();
    if (!data) return null;
    return fromActiveSessionRow(data);
  } catch {
    return null;
  }
};

export const upsertActiveSessionApi = async (
  session: any,
  token?: string | null,
): Promise<void> => {
  try {
    const headers = await getAuthHeaders(token);
    const payload = toActiveSessionRow(session);
    await fetch(`${API_BASE_URL}/v1/active-session`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore network drop
  }
};

export const deleteActiveSessionApi = async (
  token?: string | null,
): Promise<void> => {
  try {
    const headers = await getAuthHeaders(token);
    await fetch(`${API_BASE_URL}/v1/active-session`, {
      method: "DELETE",
      headers,
    });
  } catch {
    // Ignore network drop
  }
};

export const completeFocusSessionApi = async (
  session: any,
  token?: string | null,
): Promise<void> => {
  const headers = await getAuthHeaders(token);
  const payload: CompleteFocusSessionRequestDto = {
    id: session.id,
    task_id: session.taskId || session.task_id,
    seconds: session.seconds,
    note: session.note || null,
    work_date: session.date || session.work_date,
    action_task_id: (session as any).actionTaskId || (session as any).action_task_id || null,
    started_at: session.startedAt || session.started_at || null,
    ended_at: session.endedAt || session.ended_at || null,
  };
  const res = await fetch(`${API_BASE_URL}/v1/focus-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to complete session: ${res.status}`);
  }
};

const OFFLINE_QUEUE_KEY = "productive_timer_mobile_offline_queue";

export interface QueuedMutation {
  op_id: string;
  entity_type: "task" | "session" | "workout" | "completion";
  entity_id: string;
  op_type: "upsert" | "delete";
  payload?: any;
  created_at: string;
}

export const getOfflineQueue = async (): Promise<QueuedMutation[]> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const enqueueOfflineMutation = async (
  mutation: Omit<QueuedMutation, "op_id" | "created_at"> & { op_id?: string },
): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    const item: QueuedMutation = {
      op_id:
        mutation.op_id ||
        `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      entity_type: mutation.entity_type,
      entity_id: mutation.entity_id,
      op_type: mutation.op_type,
      payload: mutation.payload,
      created_at: new Date().toISOString(),
    };
    queue.push(item);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage errors
  }
};

export const clearOfflineQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // Ignore
  }
};

export const applySyncOperationsApi = async (
  operations: ClientOperationDto[],
  clientId = "mobile-client",
  token?: string | null,
): Promise<SyncOperationsResponseDto> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/sync/operations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      client_id: clientId,
      operations,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to apply sync operations: ${res.status}`);
  }
  return res.json();
};

export const drainOfflineQueueApi = async (
  token?: string | null,
): Promise<SyncOperationsResponseDto | null> => {
  const queue = await getOfflineQueue();
  if (!queue.length) return null;

  const ops: ClientOperationDto[] = queue.map((q) => ({
    op_id: q.op_id,
    entity_type: q.entity_type,
    entity_id: q.entity_id,
    op_type: q.op_type,
    payload: q.payload,
    client_version: 1,
  }));

  const res = await applySyncOperationsApi(ops, "mobile-client", token);
  await clearOfflineQueue();
  return res;
};

export const fetchSyncChangesApi = async (
  cursor = 0,
  limit = 100,
  token?: string | null,
): Promise<SyncChangesResponseDto> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(
    `${API_BASE_URL}/v1/sync/changes?cursor=${cursor}&limit=${limit}`,
    {
      headers,
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch sync changes: ${res.status}`);
  }
  return res.json();
};

export const fetchFocusSessionsHistoryApi = async (
  query?: FocusSessionsQueryDto,
  token?: string | null,
): Promise<any[]> => {
  const headers = await getAuthHeaders(token);
  const params = new URLSearchParams();
  if (query?.start_date) params.set("start_date", query.start_date);
  if (query?.end_date) params.set("end_date", query.end_date);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.offset) params.set("offset", String(query.offset));

  const url = `${API_BASE_URL}/v1/focus-sessions${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const res = await fetch(url, {
    headers,
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
  const headers = await getAuthHeaders(token);
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const url = `${API_BASE_URL}/v1/projects${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status}`);
  }
  return res.json();
};

export const createProjectApi = async (
  project: CreateProjectRequestDto,
  token?: string | null,
): Promise<ProjectDto> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/projects`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(project),
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
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
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
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to delete project: ${res.status}`);
  }
};

export const fetchActionTasksApi = async (
  query?: ActionTasksQueryDto,
  token?: string | null,
): Promise<ActionTaskDto[]> => {
  const headers = await getAuthHeaders(token);
  const params = new URLSearchParams();
  if (query?.project_id) params.set("project_id", query.project_id);
  if (query?.status) params.set("status", query.status);
  if (query?.priority) params.set("priority", query.priority);
  if (query?.due_date) params.set("due_date", query.due_date);

  const url = `${API_BASE_URL}/v1/tasks${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch action tasks: ${res.status}`);
  }
  return res.json();
};

export const createActionTaskApi = async (
  task: CreateActionTaskRequestDto,
  token?: string | null,
): Promise<ActionTaskDto> => {
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/tasks`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(task),
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
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
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
  const headers = await getAuthHeaders(token);
  const res = await fetch(`${API_BASE_URL}/v1/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to delete action task: ${res.status}`);
  }
};

