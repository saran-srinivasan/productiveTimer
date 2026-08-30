import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://ngpoiiwvungwupxyhmas.supabase.co";

export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const toTaskRow = (task) => ({
  id: task.id,
  name: task.name,
  target_minutes: task.targetMinutes,
  color: task.color,
});

export const fromTaskRow = (row) => ({
  id: row.id,
  name: row.name,
  targetMinutes: row.target_minutes,
  color: row.color,
});

export const toSessionRow = (session) => ({
  id: session.id,
  task_id: session.taskId,
  seconds: session.seconds,
  note: session.note,
  work_date: session.date,
  ended_at: session.endedAt,
});

export const fromSessionRow = (row) => ({
  id: row.id,
  taskId: row.task_id,
  seconds: row.seconds,
  note: row.note ?? "",
  date: row.work_date,
  endedAt: row.ended_at,
});

export const toWorkoutRow = (workout) => ({
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
  note: workout.note,
  created_at: workout.createdAt,
});

export const fromWorkoutRow = (row) => ({
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

export const toCompletionRow = (completion) => ({
  id: completion.id,
  task_id: completion.taskId,
  completion_date: completion.date,
  created_at: completion.createdAt,
});

export const fromCompletionRow = (row) => ({
  id: row.id,
  taskId: row.task_id,
  date: row.completion_date,
  createdAt: row.created_at,
});
