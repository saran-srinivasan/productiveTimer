export const STORAGE_KEY = "focus-ledger-v1";

export const starterTasks = [
  { id: crypto.randomUUID(), name: "Gym", targetMinutes: 45, color: "#d84b35" },
  { id: crypto.randomUUID(), name: "Code", targetMinutes: 120, color: "#287c6f" },
  { id: crypto.randomUUID(), name: "Trade", targetMinutes: 60, color: "#c8952d" },
];

export const workoutPresets = {
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
