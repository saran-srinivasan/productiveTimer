import * as Crypto from "expo-crypto";
import { starterTasks } from "../constants";
import { todayKey } from "./date";

export const normalizeTaskName = (name) =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

export const canonicalizeData = (raw) => {
  const sourceTasks = raw?.tasks?.length ? raw.tasks : starterTasks;
  const tasksByName = new Map();
  const taskIdMap = new Map();

  for (const task of sourceTasks) {
    const name = task.name?.trim().replace(/\s+/g, " ");
    if (!name) continue;

    const nameKey = normalizeTaskName(name);
    const existing = tasksByName.get(nameKey);

    if (existing) {
      taskIdMap.set(task.id, existing.id);
      continue;
    }

    const canonicalTask = {
      id: task.id ?? Crypto.randomUUID(),
      name,
      targetMinutes: Number(task.targetMinutes) || 30,
      color: task.color || "#287c6f",
    };

    tasksByName.set(nameKey, canonicalTask);
    taskIdMap.set(task.id, canonicalTask.id);
  }

  const taskIds = new Set([...tasksByName.values()].map((task) => task.id));
  const sessions = (raw?.sessions ?? [])
    .map((session) => ({
      ...session,
      taskId: taskIdMap.get(session.taskId) ?? session.taskId,
    }))
    .filter((session) => taskIds.has(session.taskId));

  const workouts = (raw?.workouts ?? [])
    .map((workout) => {
      const kind = workout.kind === "cardio" ? "cardio" : "strength";
      const exercise = workout.exercise?.trim().replace(/\s+/g, " ");
      if (!exercise) return null;

      return {
        id: workout.id ?? Crypto.randomUUID(),
        date: workout.date ?? todayKey(),
        kind,
        exercise,
        sets: kind === "strength" ? Number(workout.sets) || 0 : null,
        reps: kind === "strength" ? Number(workout.reps) || 0 : null,
        weight:
          kind === "strength" && workout.weight !== null
            ? Number(workout.weight) || 0
            : null,
        durationMinutes:
          kind === "cardio" ? Number(workout.durationMinutes) || 0 : null,
        distance:
          kind === "cardio" && workout.distance !== null
            ? Number(workout.distance) || 0
            : null,
        intensity: workout.intensity || "moderate",
        note: workout.note ?? "",
        createdAt: workout.createdAt ?? new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeTaskId = raw?.active
    ? (taskIdMap.get(raw.active.taskId) ?? raw.active.taskId)
    : null;

  return {
    tasks: [...tasksByName.values()],
    sessions,
    workouts,
    active:
      raw?.active && taskIds.has(activeTaskId)
        ? { ...raw.active, taskId: activeTaskId }
        : null,
  };
};

export const buildInitialLedger = () =>
  canonicalizeData({
    tasks: starterTasks,
    sessions: [],
    workouts: [],
    active: null,
  });
