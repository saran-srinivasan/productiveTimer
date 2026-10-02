import { starterTasks } from "../constants";
import { FocusTask, LedgerData, WorkoutEntry, TaskCompletion, FocusSession, WorkoutKind } from "../types/ledger";
import { todayKey } from "./date";

export const safeId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 6)
  );
};

export const normalizeTaskName = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

export const getTaskStampIcon = (
  task?: FocusTask | { name?: string; icon?: string } | string | null,
): string => {
  if (!task) return "🎯";
  if (typeof task === "object" && task.icon) return task.icon;

  const rawName = typeof task === "string" ? task : task.name || "";
  const name = rawName.toLowerCase().trim();

  // Gym / Workout / Fitness / Weightlifting
  if (
    /\b(gym|workout|lift|lifting|fitness|iron|strength|weights|exercise|bodybuilding|crossfit|pull|push|legs|arms|chest|squat|bench|deadlift)\b/i.test(
      name,
    )
  ) {
    return "🏋️";
  }

  // Running / Cardio
  if (
    /\b(run|running|cardio|jog|jogging|walk|walking|treadmill|cycle|cycling|bike|marathon|swim|swimming|hiit)\b/i.test(
      name,
    )
  ) {
    return "🏃";
  }

  // Coding / Tech / Engineering
  if (
    /\b(code|coding|dev|developer|programming|program|software|build|tech|script|debug|frontend|backend|fullstack|react|rust|python|typescript|ts|js|web|app)\b/i.test(
      name,
    )
  ) {
    return "💻";
  }

  // Trading / Finance / Markets
  if (
    /\b(trade|trading|trader|stocks|stock|crypto|bitcoin|btc|eth|market|finance|invest|investing|money|forex|pnl)\b/i.test(
      name,
    )
  ) {
    return "📈";
  }

  // Reading / Study / Education
  if (
    /\b(read|reading|book|books|study|studying|learn|learning|research|docs|paper|course|lecture|exam)\b/i.test(
      name,
    )
  ) {
    return "📚";
  }

  // Writing / Notes / Content
  if (
    /\b(write|writing|blog|writer|article|newsletter|draft|author|notes|journal|copy|copywriting|essay)\b/i.test(
      name,
    )
  ) {
    return "✍️";
  }

  // Meditation / Mindfulness / Wellness
  if (
    /\b(meditate|meditation|mind|zen|yoga|breathe|breathwork|health|wellness|relax|peace)\b/i.test(
      name,
    )
  ) {
    return "🧘";
  }

  // Design / UI / Creative / Art
  if (
    /\b(design|ui|ux|art|draw|drawing|creative|figma|paint|illustration|graphics)\b/i.test(
      name,
    )
  ) {
    return "🎨";
  }

  // Music / Audio
  if (
    /\b(music|audio|guitar|piano|song|sound|produce|beats|sing|melody)\b/i.test(
      name,
    )
  ) {
    return "🎵";
  }

  // Languages / Communication
  if (
    /\b(language|languages|spanish|french|german|japanese|vocab|speak|speaking|talk)\b/i.test(
      name,
    )
  ) {
    return "🗣️";
  }

  // Deep work / Focus / Productivity
  if (
    /\b(deep|focus|flow|sprint|plan|planning|work|task|project|strategy)\b/i.test(
      name,
    )
  ) {
    return "⚡";
  }

  // Rest / Sleep
  if (/\b(sleep|nap|rest|recovery)\b/i.test(name)) {
    return "🌙";
  }

  return "🎯";
};

export const canonicalizeData = (raw?: Partial<LedgerData> | null): LedgerData => {
  const sourceTasks: FocusTask[] = raw?.tasks?.length ? raw.tasks : starterTasks;
  const tasksByName = new Map<string, FocusTask>();
  const taskIdMap = new Map<string, string>();

  for (const task of sourceTasks) {
    const name = task.name?.trim().replace(/\s+/g, " ");
    if (!name) continue;

    const nameKey = normalizeTaskName(name);
    const existing = tasksByName.get(nameKey);

    if (existing) {
      taskIdMap.set(task.id, existing.id);
      continue;
    }

    const canonicalTask: FocusTask = {
      id: task.id ?? safeId(),
      name,
      targetMinutes: Number(task.targetMinutes) || 30,
      color: task.color || "#ccff00",
      icon: task.icon || getTaskStampIcon(name),
    };

    tasksByName.set(nameKey, canonicalTask);
    taskIdMap.set(task.id, canonicalTask.id);
  }

  const taskIds = new Set([...tasksByName.values()].map((task) => task.id));
  const sessions: FocusSession[] = (raw?.sessions ?? [])
    .map((session) => ({
      ...session,
      taskId: taskIdMap.get(session.taskId) ?? session.taskId,
    }))
    .filter((session) => taskIds.has(session.taskId));

  const workouts: WorkoutEntry[] = (raw?.workouts ?? [])
    .map((workout): WorkoutEntry | null => {
      const kind: WorkoutKind = workout.kind === "cardio" ? "cardio" : "strength";
      const exercise = workout.exercise?.trim().replace(/\s+/g, " ");
      if (!exercise) return null;

      return {
        id: workout.id ?? safeId(),
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
    .filter((w): w is WorkoutEntry => w !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeTaskId = raw?.active
    ? (taskIdMap.get(raw.active.taskId) ?? raw.active.taskId)
    : null;

  const completionKeys = new Set<string>();
  const completions: TaskCompletion[] = (raw?.completions ?? [])
    .map((completion): TaskCompletion | null => {
      const taskId = taskIdMap.get(completion.taskId) ?? completion.taskId;
      const date = completion.date;
      if (!taskIds.has(taskId) || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
        return null;
      }

      const key = `${taskId}:${date}`;
      if (completionKeys.has(key)) return null;
      completionKeys.add(key);

      return {
        id: completion.id ?? safeId(),
        taskId,
        date,
        createdAt: completion.createdAt ?? new Date().toISOString(),
      };
    })
    .filter((c): c is TaskCompletion => c !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    tasks: [...tasksByName.values()],
    sessions,
    workouts,
    completions,
    active:
      raw?.active && activeTaskId && taskIds.has(activeTaskId)
        ? { ...raw.active, taskId: activeTaskId }
        : null,
  };
};

export const buildInitialLedger = (): LedgerData =>
  canonicalizeData({
    tasks: starterTasks,
    sessions: [],
    workouts: [],
    active: null,
  });

export const exportLedgerJSON = (data: LedgerData): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `focus-ledger-backup-${todayKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
