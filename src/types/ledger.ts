export interface FocusTask {
  id: string;
  name: string;
  targetMinutes: number;
  color: string;
  icon?: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  seconds: number;
  note?: string;
  date: string; // YYYY-MM-DD
  actionTaskId?: string | null;
  startedAt?: string;
  endedAt: string; // ISO string
}

export interface ActiveSession {
  id: string;
  taskId: string;
  startedAt: string;
  lastResumedAt?: string | null;
  accumulatedSeconds: number;
  targetSeconds?: number | null;
  isPaused: boolean;
  clientVersion: number;
  updatedAt: string;
}

export type WorkoutKind = "strength" | "cardio";

export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: WorkoutKind;
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  durationMinutes: number | null;
  distance: number | null;
  intensity: string;
  note?: string;
  createdAt: string; // ISO string
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

export interface ActiveTimer {
  taskId: string;
  startedAt: number; // Unix ms
  elapsedSeconds: number;
  targetSeconds?: number | null;
  paused: boolean;
  sessionId?: string;
  clientVersion?: number;
}

export interface LedgerData {
  tasks: FocusTask[];
  sessions: FocusSession[];
  workouts: WorkoutEntry[];
  completions: TaskCompletion[];
  active: ActiveTimer | null;
}

export type SyncState =
  | "Connecting"
  | "Syncing"
  | "Saving"
  | "Cloud synced"
  | "Cloud error"
  | "Local only"
  | "Offline"
  | "Guest Sandbox";

export interface FocusStats {
  totalsByTask: Map<string, number>;
  todayByTask: Map<string, number>;
  todaySeconds: number;
  weekSeconds: number;
  topTask?: FocusTask & { seconds: number };
  byDate: Map<
    string,
    {
      seconds: number;
      sessions: number;
      byTask: Map<string, number>;
    }
  >;
  currentStreak: number;
}

export interface WorkoutDayStats {
  entries: WorkoutEntry[];
  strengthVolume: number;
  cardioMinutes: number;
  distance: number;
  hardSets: number;
}

export interface WorkoutStats {
  byDate: Map<string, WorkoutDayStats>;
  todayStrengthVolume: number;
  todayCardioMinutes: number;
  todayMaxWeight: number;
  weekEntries: number;
  weekCardioMinutes: number;
  weekStrengthVolume: number;
  weekMaxWeight: number;
}

export interface MonthDay {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface CalendarMonthData {
  monthDays: (MonthDay | null)[];
  monthSeconds: number;
  activeDays: number;
  workoutDays: number;
  monthCardioMinutes: number;
  autoCompletionDates: Set<string>;
  manualCompletionDates: Set<string>;
  completionDays: number;
  manualCompletionDays: number;
  focusCompletionDays: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  startDate?: string | null;
  targetDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  taskCount?: number;
  totalFocusSeconds?: number;
}

export interface ActionTask {
  id: string;
  projectId?: string | null;
  goalId?: string | null;
  focusTaskId?: string | null;
  title: string;
  description: string;
  status: "inbox" | "ready" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  estimateMinutes?: number | null;
  dueAt?: string | null;
  completedAt?: string | null;
  completionNotes: string;
  createdAt?: string;
  updatedAt?: string;
}
