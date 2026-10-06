import { LedgerData, FocusTask, FocusSession, WorkoutEntry, TaskCompletion } from "../types/ledger";

// Helper to format date offset from today
const getDateOffset = (dayOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
};

export const buildSampleGuestLedger = (): LedgerData => {
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const day2 = getDateOffset(-2);
  const day3 = getDateOffset(-3);
  const day4 = getDateOffset(-4);
  const day5 = getDateOffset(-5);
  const day6 = getDateOffset(-6);

  const tasks: FocusTask[] = [
    {
      id: "task-guest-01",
      name: "Deep Architecture & Core Engine",
      targetMinutes: 60,
      color: "#00e5ff",
    },
    {
      id: "task-guest-02",
      name: "Full Body Resistance Training",
      targetMinutes: 45,
      color: "#ccff00",
    },
    {
      id: "task-guest-03",
      name: "System Security & Token Audits",
      targetMinutes: 30,
      color: "#ffab00",
    },
    {
      id: "task-guest-04",
      name: "Cardio Endurance & Mobility",
      targetMinutes: 35,
      color: "#ff1744",
    },
  ];

  const sessions: FocusSession[] = [
    {
      id: "session-guest-01",
      taskId: "task-guest-01",
      seconds: 3600,
      note: "Refactored token verification pipeline & zero-trust sandbox layer",
      date: today,
      endedAt: `${today}T11:45:00.000Z`,
    },
    {
      id: "session-guest-02",
      taskId: "task-guest-03",
      seconds: 1800,
      note: "Audited cryptographic password hashing with Argon2id parameters",
      date: today,
      endedAt: `${today}T12:30:00.000Z`,
    },
    {
      id: "session-guest-03",
      taskId: "task-guest-01",
      seconds: 3000,
      note: "Optimized SQLite write-ahead-logging and WAL pool concurrency",
      date: yesterday,
      endedAt: `${yesterday}T16:15:00.000Z`,
    },
    {
      id: "session-guest-04",
      taskId: "task-guest-04",
      seconds: 2100,
      note: "High-cadence interval run and thoracic mobility decompression",
      date: yesterday,
      endedAt: `${yesterday}T18:00:00.000Z`,
    },
    {
      id: "session-guest-05",
      taskId: "task-guest-02",
      seconds: 2700,
      note: "Barbell compound loading: Squat, Bench, and Pendlay rows",
      date: day2,
      endedAt: `${day2}T17:30:00.000Z`,
    },
    {
      id: "session-guest-06",
      taskId: "task-guest-01",
      seconds: 3600,
      note: "Drafted frontend telemetry metrics visualization components",
      date: day3,
      endedAt: `${day3}T14:00:00.000Z`,
    },
    {
      id: "session-guest-07",
      taskId: "task-guest-03",
      seconds: 1800,
      note: "Benchmarked memory allocations across TanStack route transitions",
      date: day4,
      endedAt: `${day4}T11:20:00.000Z`,
    },
    {
      id: "session-guest-08",
      taskId: "task-guest-02",
      seconds: 3100,
      note: "Overhead press progression and eccentric pull-up variations",
      date: day5,
      endedAt: `${day5}T18:45:00.000Z`,
    },
    {
      id: "session-guest-09",
      taskId: "task-guest-04",
      seconds: 2400,
      note: "Zone 2 aerobic threshold run (5.4 km maintaining 142 bpm)",
      date: day6,
      endedAt: `${day6}T08:15:00.000Z`,
    },
  ];

  const workouts: WorkoutEntry[] = [
    {
      id: "workout-guest-01",
      date: today,
      kind: "strength",
      exercise: "Barbell Back Squat",
      sets: 4,
      reps: 8,
      weight: 105,
      durationMinutes: 25,
      distance: null,
      intensity: "high",
      note: "Felt strong; stable bar path with 3-second eccentric tempo.",
      createdAt: `${today}T09:30:00.000Z`,
    },
    {
      id: "workout-guest-02",
      date: today,
      kind: "strength",
      exercise: "Incline Dumbbell Press",
      sets: 3,
      reps: 10,
      weight: 34,
      durationMinutes: 15,
      distance: null,
      intensity: "moderate",
      note: "Full stretch at bottom, strict lockout.",
      createdAt: `${today}T10:00:00.000Z`,
    },
    {
      id: "workout-guest-03",
      date: yesterday,
      kind: "cardio",
      exercise: "Zone 2 Road Run",
      sets: null,
      reps: null,
      weight: null,
      durationMinutes: 32,
      distance: 5.5,
      intensity: "moderate",
      note: "Consistent nasal breathing pace.",
      createdAt: `${yesterday}T07:45:00.000Z`,
    },
    {
      id: "workout-guest-04",
      date: day2,
      kind: "strength",
      exercise: "Conventional Deadlift",
      sets: 3,
      reps: 5,
      weight: 140,
      durationMinutes: 20,
      distance: null,
      intensity: "high",
      note: "Double overhand grip on warmups, hook grip on top set.",
      createdAt: `${day2}T17:00:00.000Z`,
    },
  ];

  const completions: TaskCompletion[] = [
    {
      id: "comp-guest-01",
      taskId: "task-guest-01",
      date: today,
      createdAt: `${today}T12:00:00.000Z`,
    },
    {
      id: "comp-guest-02",
      taskId: "task-guest-02",
      date: today,
      createdAt: `${today}T10:30:00.000Z`,
    },
    {
      id: "comp-guest-03",
      taskId: "task-guest-01",
      date: yesterday,
      createdAt: `${yesterday}T16:30:00.000Z`,
    },
    {
      id: "comp-guest-04",
      taskId: "task-guest-04",
      date: yesterday,
      createdAt: `${yesterday}T18:15:00.000Z`,
    },
    {
      id: "comp-guest-05",
      taskId: "task-guest-01",
      date: day2,
      createdAt: `${day2}T15:00:00.000Z`,
    },
    {
      id: "comp-guest-06",
      taskId: "task-guest-02",
      date: day2,
      createdAt: `${day2}T17:40:00.000Z`,
    },
    {
      id: "comp-guest-07",
      taskId: "task-guest-03",
      date: day3,
      createdAt: `${day3}T14:30:00.000Z`,
    },
    {
      id: "comp-guest-08",
      taskId: "task-guest-01",
      date: day4,
      createdAt: `${day4}T12:00:00.000Z`,
    },
    {
      id: "comp-guest-09",
      taskId: "task-guest-02",
      date: day5,
      createdAt: `${day5}T19:00:00.000Z`,
    },
    {
      id: "comp-guest-10",
      taskId: "task-guest-04",
      date: day6,
      createdAt: `${day6}T09:00:00.000Z`,
    },
  ];

  return {
    tasks,
    sessions,
    workouts,
    completions,
    active: null,
  };
};
