import { useState, useEffect, useCallback, useMemo } from "react";
import { workoutProgramsData } from "../data/workoutPrograms";
import { workoutPresets } from "../constants";
import {
  ActiveRoutineItem,
  ActiveWorkoutRoutine,
  ProgramExercise,
  WorkoutProgram,
} from "../types/workoutPrograms";
import { safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";

const ROUTINE_STORAGE_KEY = "focus-ledger-active-routine";
const REST_TARGET_KEY = "focus-ledger-rest-target-ms";
const REST_TOTAL_KEY = "focus-ledger-rest-total-sec";

export const getAllAvailableExercises = (): string[] => {
  const set = new Set<string>();
  workoutPresets.strength.forEach((e) => set.add(e));
  workoutProgramsData.forEach((p) => {
    p.schedule.forEach((d) => {
      d.exercises?.forEach((ex) => set.add(ex.name));
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

export const useWorkoutRoutine = (soundEnabled = true) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>("ppl_6_day");
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [customExercises, setCustomExercises] = useState<ProgramExercise[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<ActiveWorkoutRoutine | null>(() => {
    try {
      const stored = localStorage.getItem(ROUTINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Resilient Rest Timer State (Epoch timestamp based)
  const [restTargetMs, setRestTargetMs] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(REST_TARGET_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (parsed > Date.now()) {
          return parsed;
        }
        localStorage.removeItem(REST_TARGET_KEY);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [restDurationTotal, setRestDurationTotal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(REST_TOTAL_KEY);
      return stored ? Number(stored) || 90 : 90;
    } catch {
      return 90;
    }
  });

  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(() => {
    if (restTargetMs && restTargetMs > Date.now()) {
      return Math.max(0, Math.ceil((restTargetMs - Date.now()) / 1000));
    }
    return null;
  });

  const allAvailableExercises = useMemo(() => getAllAvailableExercises(), []);

  // Sync active routine to localStorage
  useEffect(() => {
    try {
      if (activeRoutine) {
        localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(activeRoutine));
      } else {
        localStorage.removeItem(ROUTINE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [activeRoutine]);

  // Sync rest timer target to localStorage
  useEffect(() => {
    try {
      if (restTargetMs !== null) {
        localStorage.setItem(REST_TARGET_KEY, restTargetMs.toString());
        localStorage.setItem(REST_TOTAL_KEY, restDurationTotal.toString());
      } else {
        localStorage.removeItem(REST_TARGET_KEY);
        localStorage.removeItem(REST_TOTAL_KEY);
      }
    } catch {
      // ignore
    }
  }, [restTargetMs, restDurationTotal]);

  // Resilient Rest Countdown Interval & Visibility Change Handler
  useEffect(() => {
    if (!restTargetMs) {
      setRestSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = restTargetMs - now;
      if (diffMs <= 0) {
        setRestSecondsLeft(null);
        setRestTargetMs(null);
        playTacticalSound("countdown_end", soundEnabled);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {
            // ignore
          }
        }
      } else {
        setRestSecondsLeft(Math.ceil(diffMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    const onVisibilityOrFocus = () => {
      updateTimer();
    };

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [restTargetMs, soundEnabled]);

  const currentProgram: WorkoutProgram =
    workoutProgramsData.find((p) => p.id === selectedProgramId) ||
    workoutProgramsData[0];

  const trainingDays = currentProgram.schedule.filter(
    (d) => d.status === "training" && d.exercises && d.exercises.length > 0,
  );

  const currentDay =
    currentProgram.schedule.find((d) => d.day === selectedDayNumber) ||
    trainingDays[0] ||
    currentProgram.schedule[0];

  // Initialize custom exercises when program or day changes
  useEffect(() => {
    if (currentDay && currentDay.exercises) {
      setCustomExercises([...currentDay.exercises]);
    } else {
      setCustomExercises([]);
    }
  }, [selectedProgramId, selectedDayNumber]);

  // Adjust custom exercise sets / reps
  const updateExerciseSets = (index: number, sets: number) => {
    setCustomExercises((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, sets: Math.max(1, sets) } : item,
      ),
    );
  };

  const updateExerciseReps = (index: number, reps: string) => {
    setCustomExercises((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, reps } : item)),
    );
  };

  const removeExercise = (index: number) => {
    playTacticalSound("click", soundEnabled);
    setCustomExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addExerciseToRoutine = (
    name: string,
    sets = 3,
    reps: string | number = "8-12",
    rest_sec = 90,
  ) => {
    if (!name.trim()) return;
    playTacticalSound("click", soundEnabled);
    setCustomExercises((prev) => [
      ...prev,
      {
        name: name.trim(),
        sets,
        reps,
        rest_sec,
      },
    ]);
  };

  // Engage/Start Routine into Active Queue
  const engageRoutine = () => {
    playTacticalSound("start", soundEnabled);
    const routineItems: ActiveRoutineItem[] = customExercises.map((ex) => ({
      id: safeId(),
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_sec: ex.rest_sec || 90,
      loggedSets: 0,
      completed: false,
    }));

    setActiveRoutine({
      programId: currentProgram.id,
      programName: currentProgram.name,
      dayNumber: currentDay.day,
      dayName: currentDay.name,
      startedAt: new Date().toISOString(),
      items: routineItems,
    });
  };

  const clearActiveRoutine = () => {
    playTacticalSound("click", soundEnabled);
    setActiveRoutine(null);
    setRestSecondsLeft(null);
  };

  // Add an exercise on-the-fly to an ongoing active routine
  const addExerciseToActiveRoutine = (
    name: string,
    sets = 3,
    reps: string | number = "8-12",
    rest_sec = 90,
  ) => {
    if (!name.trim()) return;
    playTacticalSound("click", soundEnabled);
    setActiveRoutine((prev) => {
      if (!prev) return null;
      const newItem: ActiveRoutineItem = {
        id: safeId(),
        name: name.trim(),
        sets: Number(sets) || 3,
        reps,
        rest_sec: Number(rest_sec) || 90,
        loggedSets: 0,
        completed: false,
      };
      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
  };

  // Swap / substitute an exercise in an ongoing active routine
  const swapActiveRoutineExercise = (
    id: string,
    newName: string,
    rest_sec?: number,
  ) => {
    if (!newName.trim()) return;
    playTacticalSound("click", soundEnabled);
    setActiveRoutine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: newName.trim(),
                rest_sec: rest_sec || item.rest_sec,
              }
            : item,
        ),
      };
    });
  };

  // Remove an exercise from an ongoing active routine
  const removeActiveRoutineExercise = (id: string) => {
    playTacticalSound("click", soundEnabled);
    setActiveRoutine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      };
    });
  };

  // Mark an exercise set as completed in active queue
  const markQueueExerciseProgress = (exerciseName: string, setsToAdd = 1) => {
    if (!activeRoutine) return;
    setActiveRoutine((prev) => {
      if (!prev) return null;
      let matchedRestSec = 90;
      const updatedItems = prev.items.map((item) => {
        if (item.name.toLowerCase() === exerciseName.toLowerCase()) {
          const nextLogged = item.loggedSets + setsToAdd;
          matchedRestSec = item.rest_sec;
          return {
            ...item,
            loggedSets: nextLogged,
            completed: nextLogged >= item.sets,
          };
        }
        return item;
      });

      // Automatically trigger rest timer
      startRestTimer(matchedRestSec);

      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  const toggleExerciseCompletion = (id: string) => {
    setActiveRoutine((prev) => {
      if (!prev) return null;
      const target = prev.items.find((item) => item.id === id);
      const nextCompleted = target ? !target.completed : false;
      playTacticalSound(nextCompleted ? "complete" : "click", soundEnabled);

      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                completed: nextCompleted,
                loggedSets: nextCompleted ? Math.max(item.sets, item.loggedSets) : 0,
              }
            : item,
        ),
      };
    });
  };

  const startRestTimer = useCallback((seconds: number) => {
    const total = Math.max(5, seconds);
    setRestDurationTotal(total);
    setRestTargetMs(Date.now() + total * 1000);
    setRestSecondsLeft(total);
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestTargetMs(null);
    setRestSecondsLeft(null);
    try {
      localStorage.removeItem(REST_TARGET_KEY);
      localStorage.removeItem(REST_TOTAL_KEY);
    } catch {
      // ignore
    }
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTargetMs((prev) => {
      const base = prev && prev > Date.now() ? prev : Date.now();
      const updated = Math.max(Date.now() + 5000, base + deltaSeconds * 1000);
      setRestSecondsLeft(Math.max(1, Math.ceil((updated - Date.now()) / 1000)));
      return updated;
    });
  }, []);

  return {
    programs: workoutProgramsData,
    selectedProgramId,
    setSelectedProgramId,
    selectedDayNumber,
    setSelectedDayNumber,
    currentProgram,
    currentDay,
    trainingDays,
    customExercises,
    allAvailableExercises,
    updateExerciseSets,
    updateExerciseReps,
    removeExercise,
    addExerciseToRoutine,
    engageRoutine,
    activeRoutine,
    clearActiveRoutine,
    addExerciseToActiveRoutine,
    swapActiveRoutineExercise,
    removeActiveRoutineExercise,
    markQueueExerciseProgress,
    toggleExerciseCompletion,
    restSecondsLeft,
    restDurationTotal,
    startRestTimer,
    stopRestTimer,
    adjustRestTimer,
  };
};
