export interface FocusTask {
  id: string;
  name: string;
  targetMinutes: number;
  color: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  seconds: number;
  note?: string;
  date: string; // YYYY-MM-DD
  endedAt: string; // ISO string
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
  | "Local only";

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
  weekEntries: number;
  weekCardioMinutes: number;
  weekStrengthVolume: number;
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
