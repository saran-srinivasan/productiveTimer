import React, { useState, useEffect, useCallback } from "react";
import {
  WorkoutSessionDetailDto,
  WorkoutExerciseWithSetsDto,
  WorkoutSetDto,
  PersonalRecordItemDto,
  CompleteWorkoutResponseDto,
} from "../../types/api";
import {
  fetchActiveWorkoutSessionApi,
  startWorkoutSessionApi,
  completeWorkoutSessionApi,
  addWorkoutExerciseApi,
  logWorkoutSetApi,
  deleteWorkoutSetApi,
  deleteWorkoutExerciseApi,
} from "../../apiClient";
import { RestTimer } from "./RestTimer";
import { useWorkoutRoutine, getAllAvailableExercises } from "../../hooks/useWorkoutRoutine";
import { useLedgerContext } from "../../context/LedgerContext";
import { playTacticalSound } from "../../utils/sound";

interface LiveWorkoutStageProps {
  onWorkoutCompleted?: (res: CompleteWorkoutResponseDto) => void;
  onOpenHistory?: (exerciseName: string) => void;
}

export const LiveWorkoutStage: React.FC<LiveWorkoutStageProps> = ({
  onWorkoutCompleted,
  onOpenHistory,
}) => {
  const { soundEnabled } = useLedgerContext();
  const routine = useWorkoutRoutine(soundEnabled);

  const [activeSession, setActiveSession] = useState<WorkoutSessionDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [interruptedFound, setInterruptedFound] = useState<WorkoutSessionDetailDto | null>(null);

  // Form states for completing workout
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [celebrationPrs, setCelebrationPrs] = useState<PersonalRecordItemDto[] | null>(null);

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState<boolean>(false);
  const [newExerciseName, setNewExerciseName] = useState<string>("");
  const allExercises = getAllAvailableExercises();

  // Load active session from server on mount for crash/reload recovery (TASK-4.2.3)
  const refreshActiveSession = useCallback(async () => {
    try {
      setLoading(true);
      const session = await fetchActiveWorkoutSessionApi();
      if (session) {
        setActiveSession(session);
        setInterruptedFound(null);
      } else {
        setActiveSession(null);
      }
    } catch {
      // Backend unavailable or offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession]);

  // Start workout from routine or ad-hoc
  const handleStartWorkout = async (routineId?: string) => {
    playTacticalSound("start", soundEnabled);
    try {
      const res = await startWorkoutSessionApi({
        routine_id: routineId || undefined,
        work_date: new Date().toISOString().slice(0, 10),
      });
      setActiveSession(res);
      setInterruptedFound(null);
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  // Log / Check off a set (TASK-4.2.1)
  const handleToggleSetComplete = async (
    exercise: WorkoutExerciseWithSetsDto,
    set: WorkoutSetDto,
    newWeight?: number,
    newReps?: number,
    newRpe?: number,
    isWarmup?: boolean,
  ) => {
    const isNowCompleted = !set.completed;
    playTacticalSound(isNowCompleted ? "complete" : "click", soundEnabled);

    const weightVal = newWeight !== undefined ? newWeight : (set.weight ?? 0);
    const repsVal = newReps !== undefined ? newReps : (set.reps ?? 10);
    const rpeVal = newRpe !== undefined ? newRpe : (set.rpe ?? 8.0);
    const warmupVal = isWarmup !== undefined ? isWarmup : set.is_warmup;

    try {
      const updatedSet = await logWorkoutSetApi({
        id: set.id,
        workout_exercise_id: exercise.id,
        set_number: set.set_number,
        weight: weightVal,
        reps: repsVal,
        rpe: rpeVal,
        is_warmup: warmupVal,
        completed: isNowCompleted,
      });

      // Update state locally
      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exercise.id
              ? {
                  ...ex,
                  sets: ex.sets.map((s) => (s.id === set.id ? updatedSet : s)),
                }
              : ex,
          ),
        };
      });

      // If completing set, trigger resilient rest timer (TASK-4.2.2)
      if (isNowCompleted && !warmupVal) {
        routine.startRestTimer(90);
      }
    } catch (err) {
      console.error("Failed to update set:", err);
    }
  };

  // Add new set to exercise
  const handleAddSet = async (exercise: WorkoutExerciseWithSetsDto) => {
    playTacticalSound("click", soundEnabled);
    const nextSetNumber = exercise.sets.length + 1;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const defaultWeight = lastSet?.weight ?? 40;
    const defaultReps = lastSet?.reps ?? 10;
    const defaultRpe = lastSet?.rpe ?? 8.0;

    try {
      const newSet = await logWorkoutSetApi({
        workout_exercise_id: exercise.id,
        set_number: nextSetNumber,
        weight: defaultWeight,
        reps: defaultReps,
        rpe: defaultRpe,
        is_warmup: false,
        completed: false,
      });

      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exercise.id
              ? {
                  ...ex,
                  sets: [...ex.sets, newSet],
                }
              : ex,
          ),
        };
      });
    } catch (err) {
      console.error("Failed to add set:", err);
    }
  };

  // Delete a set
  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    playTacticalSound("click", soundEnabled);
    try {
      await deleteWorkoutSetApi(setId);
      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.filter((s) => s.id !== setId),
                }
              : ex,
          ),
        };
      });
    } catch (err) {
      console.error("Failed to delete set:", err);
    }
  };

  // Add exercise to active session
  const handleAddExerciseToSession = async () => {
    if (!activeSession || !newExerciseName.trim()) return;
    playTacticalSound("click", soundEnabled);
    try {
      const createdEx = await addWorkoutExerciseApi({
        session_id: activeSession.id,
        exercise_name: newExerciseName.trim(),
      });

      // Automatically add 3 initial planned sets
      const createdSets: WorkoutSetDto[] = [];
      for (let i = 1; i <= 3; i++) {
        const s = await logWorkoutSetApi({
          workout_exercise_id: createdEx.id,
          set_number: i,
          weight: 40,
          reps: 10,
          rpe: 8.0,
          is_warmup: false,
          completed: false,
        });
        createdSets.push(s);
      }
      createdEx.sets = createdSets;

      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: [...prev.exercises, createdEx],
        };
      });

      setNewExerciseName("");
      setShowAddExercise(false);
    } catch (err) {
      console.error("Failed to add exercise:", err);
    }
  };

  // Complete entire workout session (TASK-4.3.1 PR detection)
  const handleFinishWorkout = async () => {
    if (!activeSession) return;
    playTacticalSound("complete", soundEnabled);
    try {
      const res = await completeWorkoutSessionApi(activeSession.id, {
        notes: sessionNotes,
        energy_rating: energyRating,
      });

      setShowFinishModal(false);
      setActiveSession(null);
      routine.stopRestTimer();

      if (res.new_prs && res.new_prs.length > 0) {
        setCelebrationPrs(res.new_prs);
      }

      if (onWorkoutCompleted) {
        onWorkoutCompleted(res);
      }
    } catch (err) {
      console.error("Failed to complete workout:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-emerald-500 rounded-full" />
        <p className="mt-2 text-sm">Synchronizing fitness telemetry...</p>
      </div>
    );
  }

  // Not in a workout yet: Display Start Launcher
  if (!activeSession) {
    return (
      <div className="space-y-6">
        {celebrationPrs && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-indigo-500/20 border border-amber-500/40 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h3 className="text-lg font-bold text-amber-200">
                    New Personal Records Achieved!
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    Progressive overload registered in database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCelebrationPrs(null)}
                className="text-xs px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {celebrationPrs.map((pr) => (
                <div
                  key={pr.exercise_name}
                  className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs"
                >
                  <div className="font-semibold text-slate-100 text-sm mb-1">
                    {pr.exercise_name}
                  </div>
                  <div className="text-emerald-400 font-mono font-bold">
                    Peak Load: {pr.heaviest_weight} kg
                  </div>
                  {pr.estimated_1rm && (
                    <div className="text-amber-300 font-mono">
                      Estimated 1RM: {pr.estimated_1rm.toFixed(1)} kg
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
            🏋️‍♂️
          </div>
          <h2 className="text-2xl font-black text-slate-100 mb-2">
            Structured Real-Time Workout Logger
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
            Track per-set loads, auto-compute 1RM progression, check off sets in real time, and
            power rest timers that survive tab switches and reloads.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleStartWorkout()}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950 transition-all transform hover:-translate-y-0.5"
            >
              🚀 Start Ad-Hoc Session
            </button>
            <button
              type="button"
              onClick={() => routine.engageRoutine()}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              📋 Load Program Day ({routine.currentProgram.name})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Workout View
  return (
    <div className="space-y-6">
      {/* Resilient Rest Timer banner (TASK-4.2.2) */}
      <RestTimer
        secondsLeft={routine.restSecondsLeft}
        totalSeconds={routine.restDurationTotal}
        onStop={routine.stopRestTimer}
        onAdjust={routine.adjustRestTimer}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Live Workout Session
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {activeSession.routine_name || "Ad-Hoc Training Session"}
            </h2>
            <div className="text-xs text-slate-400">
              Date: {activeSession.work_date} • Completed sets:{" "}
              <span className="text-emerald-400 font-mono font-bold">
                {activeSession.total_completed_sets}
              </span>{" "}
              • Total Volume:{" "}
              <span className="text-amber-400 font-mono font-bold">
                {activeSession.total_volume.toLocaleString()} kg
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddExercise(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            + Add Exercise
          </button>
          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
          >
            ✓ Complete Workout
          </button>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-5">
        {activeSession.exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏋️</span>
                <h3 className="text-base font-bold text-slate-100">
                  {exercise.exercise_name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => onOpenHistory(exercise.exercise_name)}
                    className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                    title="View exercise progression charts"
                  >
                    📈 History & 1RM
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    deleteWorkoutExerciseApi(exercise.id).then(() =>
                      refreshActiveSession(),
                    )
                  }
                  className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 transition-colors"
                  title="Remove exercise"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/60 font-semibold">
                    <th className="pb-2 w-16">SET</th>
                    <th className="pb-2 w-24">WARMUP</th>
                    <th className="pb-2 w-32">WEIGHT (KG)</th>
                    <th className="pb-2 w-28">REPS</th>
                    <th className="pb-2 w-28">RPE</th>
                    <th className="pb-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {exercise.sets.map((set) => (
                    <tr
                      key={set.id}
                      className={`transition-colors ${
                        set.completed ? "bg-emerald-950/20 text-slate-200" : "text-slate-300"
                      }`}
                    >
                      <td className="py-2.5 font-bold font-mono">#{set.set_number}</td>
                      <td className="py-2.5">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={set.is_warmup}
                            onChange={(e) =>
                              handleToggleSetComplete(
                                exercise,
                                set,
                                set.weight ?? undefined,
                                set.reps ?? undefined,
                                set.rpe ?? undefined,
                                e.target.checked,
                              )
                            }
                            className="rounded border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <span className="text-[10px] text-slate-400">Warm</span>
                        </label>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={set.weight ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setActiveSession((prev) => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  exercises: prev.exercises.map((ex) =>
                                    ex.id === exercise.id
                                      ? {
                                          ...ex,
                                          sets: ex.sets.map((s) =>
                                            s.id === set.id ? { ...s, weight: val } : s,
                                          ),
                                        }
                                      : ex,
                                  ),
                                };
                              });
                            }}
                            className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          value={set.reps ?? 10}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setActiveSession((prev) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                exercises: prev.exercises.map((ex) =>
                                  ex.id === exercise.id
                                    ? {
                                        ...ex,
                                        sets: ex.sets.map((s) =>
                                          s.id === set.id ? { ...s, reps: val } : s,
                                        ),
                                      }
                                    : ex,
                                ),
                              };
                            });
                          }}
                          className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5">
                        <select
                          value={set.rpe ?? 8.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleToggleSetComplete(
                              exercise,
                              set,
                              set.weight ?? undefined,
                              set.reps ?? undefined,
                              val,
                            );
                          }}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                        >
                          <option value="6.0">6 (Light)</option>
                          <option value="7.0">7 (3 reps left)</option>
                          <option value="7.5">7.5</option>
                          <option value="8.0">8 (2 reps left)</option>
                          <option value="8.5">8.5</option>
                          <option value="9.0">9 (1 rep left)</option>
                          <option value="9.5">9.5</option>
                          <option value="10.0">10 (Failure / PR)</option>
                        </select>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSetComplete(
                                exercise,
                                set,
                                set.weight ?? undefined,
                                set.reps ?? undefined,
                                set.rpe ?? undefined,
                              )
                            }
                            className={`px-3 py-1 rounded font-bold transition-all text-xs flex items-center gap-1 ${
                              set.completed
                                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            }`}
                          >
                            {set.completed ? "✓ Done" : "Mark Set"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(exercise.id, set.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="Delete set"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Set Button */}
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleAddSet(exercise)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold border border-slate-700 transition-colors"
              >
                + Add Set
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add Exercise to Workout</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Choose from presets or enter custom name
                </label>
                <input
                  type="text"
                  list="exercises-list"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="e.g. Barbell Squat, Romanian Deadlift"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <datalist id="exercises-list">
                  {allExercises.map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExercise(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddExerciseToSession}
                  disabled={!newExerciseName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  Add Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Workout Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Complete Workout Session</h3>
            <p className="text-xs text-slate-400 mb-4">
              Finish session and evaluate personal records across completed sets.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Energy & Execution Rating (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyRating(lvl)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${
                        energyRating === lvl
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Workout Reflection / Notes
                </label>
                <textarea
                  rows={3}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Notes on fatigue, pump, load progression..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Back to Training
                </button>
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                >
                  ✓ Finish & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
