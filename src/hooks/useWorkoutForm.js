import { useEffect, useState } from "react";
import { workoutPresets } from "../constants";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { todayKey } from "../utils/date";

export const useWorkoutForm = ({ setData, setSyncState }) => {
  const [workoutKind, setWorkoutKind] = useState("strength");
  const [workoutDate, setWorkoutDate] = useState(todayKey());
  const [workoutExercise, setWorkoutExercise] = useState(
    workoutPresets.strength[0],
  );
  const [customWorkoutExercise, setCustomWorkoutExercise] = useState("");
  const [workoutSets, setWorkoutSets] = useState(3);
  const [workoutReps, setWorkoutReps] = useState(10);
  const [workoutWeight, setWorkoutWeight] = useState(40);
  const [cardioMinutes, setCardioMinutes] = useState(20);
  const [cardioDistance, setCardioDistance] = useState(2);
  const [workoutIntensity, setWorkoutIntensity] = useState("moderate");
  const [workoutNote, setWorkoutNote] = useState("");

  useEffect(() => {
    setWorkoutExercise(workoutPresets[workoutKind][0]);
    setCustomWorkoutExercise("");
  }, [workoutKind]);

  const addWorkout = (event) => {
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

    setData((current) => ({
      ...current,
      workouts: [
        {
          id: crypto.randomUUID(),
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

  const deleteWorkout = (workoutId) => {
    setData((current) => ({
      ...current,
      workouts: current.workouts.filter((workout) => workout.id !== workoutId),
    }));

    if (isSupabaseConfigured) {
      supabase
        .from("workout_entries")
        .delete()
        .eq("id", workoutId)
        .then(({ error }) => {
          if (error) setSyncState("Cloud error");
        });
    }
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
    },
    addWorkout,
    deleteWorkout,
  };
};
