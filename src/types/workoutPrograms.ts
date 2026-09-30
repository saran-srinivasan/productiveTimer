export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string | number;
  rest_sec?: number;
  load_rule?: string;
  category?: string;
}

export interface ProgramScheduleDay {
  day: number;
  name: string;
  status: "training" | "rest";
  focus?: string[] | string;
  rotation?: string;
  main_lift?: string;
  rest_sec_main_lift?: number;
  supplemental?: {
    name: string;
    sets: number;
    reps: number;
    load_rule?: string;
  };
  accessories?: Array<{
    category: string;
    sets: number;
    reps: string;
    rest_sec: number;
  }>;
  exercises?: ProgramExercise[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  full_name?: string;
  type: string;
  goal: string;
  experience: string;
  days_per_week: number;
  training_days: number;
  rest_days: number;
  default_cycle_weeks?: number;
  schedule: ProgramScheduleDay[];
  progression?: Record<string, any>;
  deload?: Record<string, any>;
}

export interface ActiveRoutineItem {
  id: string;
  name: string;
  sets: number;
  reps: string | number;
  rest_sec: number;
  loggedSets: number;
  completed: boolean;
}

export interface ActiveWorkoutRoutine {
  programId: string;
  programName: string;
  dayNumber: number;
  dayName: string;
  startedAt: string;
  items: ActiveRoutineItem[];
}
