import { useEffect, useState, Dispatch, SetStateAction, FormEvent } from "react";
import { workoutPresets } from "../constants";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { todayKey } from "../utils/date";
import { safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";
import { LedgerData, SyncState, WorkoutKind } from "../types/ledger";

interface UseWorkoutFormParams {
  setData: Dispatch<SetStateAction<LedgerData>>;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  soundEnabled?: boolean;
}

export const useWorkoutForm = ({
  setData,
  setSyncState,
  soundEnabled = true,
}: UseWorkoutFormParams) => {
  const [workoutKind, setWorkoutKind] = useState<WorkoutKind>("strength");
  const [workoutDate, setWorkoutDate] = useState<string>(todayKey());
  const [workoutExercise, setWorkoutExercise] = useState<string>(
    workoutPresets.strength[0],
  );
  const [customWorkoutExercise, setCustomWorkoutExercise] = useState("");
  const [workoutSets, setWorkoutSets] = useState<number | string>(3);
  const [workoutReps, setWorkoutReps] = useState<number | string>(10);
  const [workoutWeight, setWorkoutWeight] = useState<number | string>(40);
  const [cardioMinutes, setCardioMinutes] = useState<number | string>(20);
  const [cardioDistance, setCardioDistance] = useState<number | string>(2);
  const [workoutIntensity, setWorkoutIntensity] = useState("moderate");
  const [workoutNote, setWorkoutNote] = useState("");

  useEffect(() => {
    setWorkoutExercise(workoutPresets[workoutKind][0]);
    setCustomWorkoutExercise("");
  }, [workoutKind]);

  const addWorkout = (event: FormEvent) => {
    event.preventDefault();
    const exercise =
      workoutExercise === "Custom"
        ? customWorkoutExercise.trim().replace(/\s+/g, " ")
        : workoutExercise;
    if (!exercise || !workoutDate) return;

    const isStrength = workoutKind === "strength";
    const sets = Number(workoutSets);
    const reps = Number(workoutReps);
    const weight = Number(workoutWeight);
    const durationMinutes = Number(cardioMinutes);
    const distance = Number(cardioDistance);

    if (isStrength && (!sets || sets < 1 || !reps || reps < 1)) return;
    if (!isStrength && (!durationMinutes || durationMinutes < 1)) return;

    playTacticalSound("complete", soundEnabled);

    setData((current) => ({
      ...current,
      workouts: [
        {
          id: safeId(),
          date: workoutDate,
          kind: workoutKind,
          exercise,
          sets: isStrength ? sets : null,
          reps: isStrength ? reps : null,
          weight: isStrength ? Math.max(0, weight || 0) : null,
          durationMinutes: isStrength ? null : durationMinutes,
          distance: isStrength ? null : Math.max(0, distance || 0),
          intensity: workoutIntensity,
          note: workoutNote.trim(),
          createdAt: new Date().toISOString(),
        },
        ...current.workouts,
      ],
    }));
    setWorkoutNote("");

    if (isStrength) {
      setWorkoutSets(3);
      setWorkoutReps(10);
    } else {
      setCardioMinutes(20);
    }
  };

  const deleteWorkout = (workoutId: string) => {
    playTacticalSound("click", soundEnabled);

    setData((current) => ({
      ...current,
      workouts: current.workouts.filter((workout) => workout.id !== workoutId),
    }));

    const client = supabase;
    if (isSupabaseConfigured && client) {
      client
        .from("workout_entries")
        .delete()
        .eq("id", workoutId)
        .then(({ error }) => {
          if (error) setSyncState("Cloud error");
        });
    }
  };

  // Quick steppers
  const adjustWeight = (delta: number) => {
    setWorkoutWeight((w) => Math.max(0, (Number(w) || 0) + delta));
  };
  const adjustSets = (delta: number) => {
    setWorkoutSets((s) => Math.max(1, (Number(s) || 1) + delta));
  };
  const adjustReps = (delta: number) => {
    setWorkoutReps((r) => Math.max(1, (Number(r) || 1) + delta));
  };
  const adjustCardioMinutes = (delta: number) => {
    setCardioMinutes((m) => Math.max(1, (Number(m) || 1) + delta));
  };

  return {
    workoutForm: {
      workoutKind,
      workoutDate,
      workoutExercise,
      customWorkoutExercise,
      workoutSets,
      workoutReps,
      workoutWeight,
      cardioMinutes,
      cardioDistance,
      workoutIntensity,
      workoutNote,
      setWorkoutKind,
      setWorkoutDate,
      setWorkoutExercise,
      setCustomWorkoutExercise,
      setWorkoutSets,
      setWorkoutReps,
      setWorkoutWeight,
      setCardioMinutes,
      setCardioDistance,
      setWorkoutIntensity,
      setWorkoutNote,
      adjustWeight,
      adjustSets,
      adjustReps,
      adjustCardioMinutes,
    },
    addWorkout,
    deleteWorkout,
  };
};
