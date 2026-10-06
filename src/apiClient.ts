import { FocusTask, FocusSession, WorkoutEntry, TaskCompletion } from "./types/ledger";

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "/api";

export const toTaskRow = (task: FocusTask) => ({
  id: task.id,
  name: task.name,
  target_minutes: task.targetMinutes,
  color: task.color,
});

export const fromTaskRow = (row: any): FocusTask => ({
  id: row.id,
  name: row.name,
  targetMinutes: row.target_minutes,
  color: row.color,
});

export const toSessionRow = (session: FocusSession) => ({
  id: session.id,
  task_id: session.taskId,
  seconds: session.seconds,
  note: session.note ?? "",
  work_date: session.date,
  ended_at: session.endedAt,
});

export const fromSessionRow = (row: any): FocusSession => ({
  id: row.id,
  taskId: row.task_id,
  seconds: row.seconds,
  note: row.note ?? "",
  date: row.work_date,
  endedAt: row.ended_at,
});

export const toWorkoutRow = (workout: WorkoutEntry) => ({
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

export const fromWorkoutRow = (row: any): WorkoutEntry => ({
  id: row.id,
  date: row.work_date,
  kind: row.kind,
  exercise: row.exercise,
  sets: row.sets,
  reps: row.reps,
  weight: row.weight,
  durationMinutes: row.duration_minutes,
  distance: row.distance,
  intensity: row.intensity,
  note: row.note ?? "",
  createdAt: row.created_at,
});

export const toCompletionRow = (completion: TaskCompletion) => ({
  id: completion.id,
  task_id: completion.taskId,
  completion_date: completion.date,
  created_at: completion.createdAt,
});

export const fromCompletionRow = (row: any): TaskCompletion => ({
  id: row.id,
  taskId: row.task_id,
  date: row.completion_date,
  createdAt: row.created_at,
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
    });
  } catch {
    // Ignore error on logout
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

