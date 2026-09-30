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

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restDurationTotal, setRestDurationTotal] = useState<number>(90);

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

  // Rest Countdown Interval
  useEffect(() => {
    if (restSecondsLeft === null || restSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          playTacticalSound("countdown_end", soundEnabled);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restSecondsLeft, soundEnabled]);

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
  const markQueueExerciseProgress = (exerciseName: string) => {
    if (!activeRoutine) return;
    setActiveRoutine((prev) => {
      if (!prev) return null;
      let matchedRestSec = 90;
      const updatedItems = prev.items.map((item) => {
        if (item.name.toLowerCase() === exerciseName.toLowerCase()) {
          const nextLogged = item.loggedSets + 1;
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
    setRestDurationTotal(seconds);
    setRestSecondsLeft(seconds);
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestSecondsLeft(null);
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
  };
};
