import { FocusTask, WorkoutKind } from "./types/ledger";

export const STORAGE_KEY = "focus-ledger-v1";

export const starterTasks: FocusTask[] = [
  { id: "task-gym", name: "Gym", targetMinutes: 45, color: "#ff5722" },
  { id: "task-code", name: "Code", targetMinutes: 120, color: "#ccff00" },
  { id: "task-trade", name: "Trade", targetMinutes: 60, color: "#00e5ff" },
];

export const workoutPresets: Record<WorkoutKind, string[]> = {
  strength: [
    "Bench press",
    "Squat",
    "Deadlift",
    "Shoulder press",
    "Bent-over row",
    "Lat pulldown",
    "Leg press",
    "Bicep curl",
    "Tricep pushdown",
  ],
  cardio: [
    "Treadmill",
    "Cycling",
    "Elliptical",
    "Rowing machine",
    "Stair climber",
  ],
};

export const intensityOptions = ["easy", "moderate", "hard", "max"];

export const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
