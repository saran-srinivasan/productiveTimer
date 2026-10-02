import React, { FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { intensityOptions, workoutPresets } from "../constants";
import { formatClock, formatLoad } from "../utils/format";
import { WorkoutRow } from "./WorkoutRow";
import { WorkoutRoutineBuilder } from "./WorkoutRoutineBuilder";
import { WorkoutEntry, WorkoutKind, WorkoutStats } from "../types/ledger";
import { useWorkoutRoutine } from "../hooks/useWorkoutRoutine";
import { useLedgerContext } from "../context/LedgerContext";

interface WorkoutSectionProps {
  addWorkout: (e: FormEvent) => void;
  deleteWorkout: (id: string) => void;
  recentWorkouts: WorkoutEntry[];
  workoutForm: {
    workoutKind: WorkoutKind;
    workoutDate: string;
    workoutExercise: string;
    customWorkoutExercise: string;
    workoutSets: number | string;
    workoutReps: number | string;
    workoutWeight: number | string;
    cardioMinutes: number | string;
    cardioDistance: number | string;
    workoutIntensity: string;
    workoutNote: string;
    setWorkoutKind: (k: WorkoutKind) => void;
    setWorkoutDate: (d: string) => void;
    setWorkoutExercise: (e: string) => void;
    setCustomWorkoutExercise: (e: string) => void;
    setWorkoutSets: (s: number | string) => void;
    setWorkoutReps: (r: number | string) => void;
    setWorkoutWeight: (w: number | string) => void;
    setCardioMinutes: (m: number | string) => void;
    setCardioDistance: (d: number | string) => void;
    setWorkoutIntensity: (i: string) => void;
    setWorkoutNote: (n: string) => void;
    adjustWeight: (d: number) => void;
    adjustSets: (d: number) => void;
    adjustReps: (d: number) => void;
    adjustCardioMinutes: (d: number) => void;
  };
  workoutStats: WorkoutStats;
}

export function WorkoutSection({
  addWorkout,
  deleteWorkout,
  recentWorkouts,
  workoutForm,
  workoutStats,
}: WorkoutSectionProps) {
  const { soundEnabled } = useLedgerContext();
  const routine = useWorkoutRoutine(soundEnabled);
  const [showBuilder, setShowBuilder] = useState(false);

  // In-session addition & swap states
  const [showInSessionAdd, setShowInSessionAdd] = useState(false);
  const [inSessionAddMode, setInSessionAddMode] = useState<"dropdown" | "custom">("dropdown");
  const [inSessionDropdown, setInSessionDropdown] = useState("");
  const [inSessionCustom, setInSessionCustom] = useState("");
  const [inSessionSets, setInSessionSets] = useState(3);
  const [inSessionReps, setInSessionReps] = useState("8-12");
  const [inSessionRest, setInSessionRest] = useState(90);

  const [swappingItemId, setSwappingItemId] = useState<string | null>(null);
  const [swapSelection, setSwapSelection] = useState("");

  const isStrength = workoutForm.workoutKind === "strength";
  const estimatedVolume = isStrength
    ? (Number(workoutForm.workoutSets) || 0) *
      (Number(workoutForm.workoutReps) || 0) *
      (Number(workoutForm.workoutWeight) || 0)
    : 0;

  // Handle auto-populating form when an exercise is selected from the active queue
  const loadExerciseFromQueue = (name: string, targetSets: number, targetReps: string | number) => {
    workoutForm.setWorkoutKind("strength");
    if (workoutPresets.strength.includes(name)) {
      workoutForm.setWorkoutExercise(name);
      workoutForm.setCustomWorkoutExercise("");
    } else {
      workoutForm.setWorkoutExercise("Custom");
      workoutForm.setCustomWorkoutExercise(name);
    }
    workoutForm.setWorkoutSets(targetSets);

    const parsedReps =
      typeof targetReps === "number"
        ? targetReps
        : parseInt(String(targetReps).split("-")[0], 10) || 8;
    workoutForm.setWorkoutReps(parsedReps);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const exerciseToRecord =
      workoutForm.workoutExercise === "Custom"
        ? workoutForm.customWorkoutExercise
        : workoutForm.workoutExercise;

    addWorkout(e);

    // If active routine has this exercise, mark progress in the queue and engage rest timer!
    if (routine.activeRoutine && exerciseToRecord) {
      routine.markQueueExerciseProgress(exerciseToRecord);
    }
  };

  return (
    <section className="workout-section">
      <div className="workout-heading">
        <div>
          <p className="eyebrow">TRN.03 // IRON & VELOCITY LEDGER</p>
          <h2>Gym & Training Pulse</h2>
        </div>
        <div className="workout-scoreboard">
          <div
            className="scoreboard-item"
            title="Total cumulative tonnage: sets × reps × weight (e.g. 3 × 12 × 15kg = 540kg total work)"
          >
            <span>Today Tonnage</span>
            <strong>{formatLoad(workoutStats.todayStrengthVolume)}</strong>
          </div>
          <div
            className="scoreboard-item"
            title="Heaviest barbell/dumbbell load lifted today"
          >
            <span>Top Load</span>
            <strong>{workoutStats.todayMaxWeight ? `${workoutStats.todayMaxWeight} kg` : "0 kg"}</strong>
          </div>
          <div className="scoreboard-item" title="Cardio minutes logged today">
            <span>Today Cardio</span>
            <strong>{workoutStats.todayCardioMinutes}m</strong>
          </div>
          <div
            className="scoreboard-item"
            title="Total workouts logged this week"
          >
            <span>Week Entries</span>
            <strong>{workoutStats.weekEntries}</strong>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBuilder((prev) => !prev)}
            style={{ minHeight: "42px", alignSelf: "center" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {showBuilder ? "Hide Pre-Gym Builder" : "⚡ Pre-Gym Routine Builder"}
          </button>
        </div>
      </div>

      {/* Routine Builder Drawer / Module */}
      {showBuilder ? (
        <WorkoutRoutineBuilder
          programs={routine.programs}
          selectedProgramId={routine.selectedProgramId}
          setSelectedProgramId={routine.setSelectedProgramId}
          selectedDayNumber={routine.selectedDayNumber}
          setSelectedDayNumber={routine.setSelectedDayNumber}
          currentProgram={routine.currentProgram}
          currentDay={routine.currentDay}
          trainingDays={routine.trainingDays}
          customExercises={routine.customExercises}
          allAvailableExercises={routine.allAvailableExercises}
          updateExerciseSets={routine.updateExerciseSets}
          updateExerciseReps={routine.updateExerciseReps}
          removeExercise={routine.removeExercise}
          addExerciseToRoutine={routine.addExerciseToRoutine}
          onEngageRoutine={() => {
            routine.engageRoutine();
            setShowBuilder(false);
          }}
          hasActiveRoutine={Boolean(routine.activeRoutine)}
        />
      ) : null}

      {/* Active Routine Session Queue & Live Guidance */}
      {routine.activeRoutine ? (
        <div
          className="glass-panel"
          style={{
            marginBottom: "20px",
            borderLeft: "4px solid var(--hazard-orange)",
            background: "linear-gradient(135deg, rgba(255, 87, 34, 0.08), var(--panel-module))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div>
              <p className="eyebrow" style={{ color: "var(--hazard-orange)" }}>
                ACTIVE SESSION QUEUE // {routine.activeRoutine.programName.toUpperCase()}
              </p>
              <h2>{routine.activeRoutine.dayName} Workout</h2>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: "var(--panel-recessed)",
                  border: "1px solid var(--milled-border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.74rem",
                }}
              >
                <span style={{ color: "var(--ink-secondary)" }}>PROGRESS:</span>
                <strong style={{ color: "var(--signal-green)" }}>
                  {routine.activeRoutine.items.filter((i) => i.completed).length} / {routine.activeRoutine.items.length} DONE
                </strong>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowInSessionAdd((s) => !s)}
                style={{ minHeight: "30px", fontSize: "0.72rem", padding: "0 10px" }}
              >
                {showInSessionAdd ? "✕ Cancel" : "+ Add / Swap Exercise"}
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={routine.clearActiveRoutine}
                title="End or discard this active routine"
                style={{ width: "30px", height: "30px" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* In-Session On-The-Fly Add Movement Form */}
          {showInSessionAdd ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name =
                  inSessionAddMode === "dropdown" ? inSessionDropdown : inSessionCustom.trim();
                if (!name) return;
                routine.addExerciseToActiveRoutine(
                  name,
                  inSessionSets,
                  inSessionReps,
                  inSessionRest,
                );
                setInSessionCustom("");
                setInSessionDropdown("");
                setShowInSessionAdd(false);
              }}
              style={{
                padding: "12px",
                background: "var(--panel-module)",
                border: "1px solid var(--milled-border)",
                borderRadius: "6px",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--hazard-orange)", fontWeight: 700 }}>
                  ⚡ INSERT MOVEMENT INTO ACTIVE SESSION (MACHINE BUSY / ALTERNATE)
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setInSessionAddMode("dropdown")}
                    style={{
                      padding: "2px 8px",
                      fontSize: "0.68rem",
                      fontFamily: "var(--font-mono)",
                      borderRadius: "3px",
                      background: inSessionAddMode === "dropdown" ? "var(--volt-lime)" : "var(--panel-recessed)",
                      color: inSessionAddMode === "dropdown" ? "#000" : "var(--ink-secondary)",
                      border: "1px solid var(--milled-border)",
                      fontWeight: 700,
                    }}
                  >
                    Preset List
                  </button>
                  <button
                    type="button"
                    onClick={() => setInSessionAddMode("custom")}
                    style={{
                      padding: "2px 8px",
                      fontSize: "0.68rem",
                      fontFamily: "var(--font-mono)",
                      borderRadius: "3px",
                      background: inSessionAddMode === "custom" ? "var(--volt-lime)" : "var(--panel-recessed)",
                      color: inSessionAddMode === "custom" ? "#000" : "var(--ink-secondary)",
                      border: "1px solid var(--milled-border)",
                      fontWeight: 700,
                    }}
                  >
                    Custom Name
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 75px 75px 75px auto", gap: "8px" }}>
                {inSessionAddMode === "dropdown" ? (
                  <select
                    value={inSessionDropdown}
                    onChange={(e) => setInSessionDropdown(e.target.value)}
                    style={{ minHeight: "34px", fontSize: "0.8rem", width: "100%", fontFamily: "var(--font-mono)" }}
                    required
                  >
                    <option value="">-- Choose Alternate Movement --</option>
                    {routine.allAvailableExercises.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Alternate exercise name..."
                    value={inSessionCustom}
                    onChange={(e) => setInSessionCustom(e.target.value)}
                    style={{ minHeight: "34px", fontSize: "0.8rem" }}
                    required
                  />
                )}
                <input
                  type="number"
                  min="1"
                  placeholder="Sets"
                  value={inSessionSets}
                  onChange={(e) => setInSessionSets(Number(e.target.value))}
                  style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
                  title="Target Sets"
                />
                <input
                  type="text"
                  placeholder="Reps"
                  value={inSessionReps}
                  onChange={(e) => setInSessionReps(e.target.value)}
                  style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
                  title="Target Reps"
                />
                <input
                  type="number"
                  min="30"
                  step="15"
                  placeholder="Rest"
                  value={inSessionRest}
                  onChange={(e) => setInSessionRest(Number(e.target.value))}
                  style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
                  title="Rest Seconds"
                />
                <button type="submit" className="btn btn-primary" style={{ minHeight: "34px", fontSize: "0.74rem", padding: "0 12px" }}>
                  + Insert
                </button>
              </div>
            </form>
          ) : null}

          {/* Progress bar across routine movements */}
          <div
            className="progress-track"
            style={{ marginBottom: "14px", height: "4px" }}
            title={`${Math.round(
              (routine.activeRoutine.items.filter((i) => i.completed).length /
                routine.activeRoutine.items.length) *
                100,
            )}% Completed`}
          >
            <span
              style={{
                width: `${Math.round(
                  (routine.activeRoutine.items.filter((i) => i.completed).length /
                    routine.activeRoutine.items.length) *
                    100,
                )}%`,
                background: "var(--signal-green)",
              }}
            />
          </div>

          {/* Rest Countdown Timer Bar */}
          {routine.restSecondsLeft !== null ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "rgba(255, 171, 0, 0.12)",
                border: "1px solid var(--phosphor-amber)",
                borderRadius: "6px",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="sync-dot" style={{ background: "var(--phosphor-amber)", animation: "hardware-blink 1s infinite" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: "var(--phosphor-amber)" }}>
                  REST PERIOD ACTIVE:
                </span>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", color: "#fff" }}>
                  {formatClock(routine.restSecondsLeft)}
                </strong>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => routine.startRestTimer((routine.restSecondsLeft || 0) + 30)}
                  style={{
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    borderRadius: "4px",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--ink-primary)",
                  }}
                >
                  +30s
                </button>
                <button
                  type="button"
                  onClick={routine.stopRestTimer}
                  style={{
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    borderRadius: "4px",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--stamp-crimson)",
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : null}

          {/* Exercise Queue Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "10px" }}>
            {routine.activeRoutine.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: item.completed
                    ? "rgba(0, 230, 118, 0.04)"
                    : "var(--panel-recessed)",
                  border: item.completed
                    ? "1px solid rgba(0, 230, 118, 0.35)"
                    : "1px solid var(--milled-border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => routine.toggleExerciseCompletion(item.id)}
                      title={item.completed ? "Click to unmark complete" : "Click to mark complete"}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "4px",
                        border: item.completed ? "1px solid var(--signal-green)" : "1px solid var(--milled-border)",
                        background: item.completed ? "var(--signal-green)" : "var(--panel-module)",
                        color: item.completed ? "#000" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>

                    <div>
                      <strong
                        style={{
                          fontSize: "0.88rem",
                          display: "block",
                          color: item.completed ? "var(--ink-secondary)" : "var(--ink-pure)",
                          textDecoration: item.completed ? "line-through" : "none",
                          textDecorationColor: item.completed ? "var(--signal-green)" : "transparent",
                          textDecorationThickness: "2px",
                          opacity: item.completed ? 0.7 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--ink-secondary)",
                        }}
                      >
                        {item.sets} Sets × {item.reps} Reps
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSwappingItemId(swappingItemId === item.id ? null : item.id);
                        setSwapSelection("");
                      }}
                      title="Swap with alternate exercise (machine busy/unavailable)"
                      style={{
                        background: swappingItemId === item.id ? "var(--volt-lime)" : "var(--panel-module)",
                        color: swappingItemId === item.id ? "#000" : "var(--ink-secondary)",
                        border: "1px solid var(--milled-border)",
                        borderRadius: "3px",
                        padding: "2px 6px",
                        fontSize: "0.66rem",
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ⇄ Alt
                    </button>
                    <button
                      type="button"
                      onClick={() => routine.removeActiveRoutineExercise(item.id)}
                      title="Remove exercise from active session"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--ink-secondary)",
                        cursor: "pointer",
                        padding: "1px 4px",
                        fontSize: "0.8rem",
                      }}
                    >
                      ✕
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: item.completed ? "var(--signal-green)" : "var(--hazard-orange)",
                      }}
                    >
                      0{idx + 1}
                    </span>
                  </div>
                </div>

                {/* Inline Swap / Alternate Movement Dropdown */}
                {swappingItemId === item.id ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      padding: "6px",
                      background: "var(--panel-module)",
                      borderRadius: "4px",
                      border: "1px solid var(--phosphor-amber)",
                    }}
                  >
                    <select
                      value={swapSelection}
                      onChange={(e) => setSwapSelection(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "28px",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        background: "var(--panel-recessed)",
                      }}
                    >
                      <option value="">-- Select Alternate Machine/Exercise --</option>
                      {routine.allAvailableExercises.map((ex) => (
                        <option key={ex} value={ex}>
                          {ex}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (swapSelection) {
                          routine.swapActiveRoutineExercise(item.id, swapSelection);
                          setSwappingItemId(null);
                          setSwapSelection("");
                        }
                      }}
                      className="btn btn-primary"
                      style={{ minHeight: "28px", fontSize: "0.68rem", padding: "0 8px" }}
                    >
                      Swap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSwappingItemId(null);
                        setSwapSelection("");
                      }}
                      className="btn btn-secondary"
                      style={{ minHeight: "28px", fontSize: "0.68rem", padding: "0 6px" }}
                    >
                      ✕
                    </button>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink-secondary)",
                    paddingTop: "4px",
                    borderTop: "1px dashed var(--milled-border)",
                  }}
                >
                  <span style={{ color: item.completed ? "var(--signal-green)" : "var(--ink-secondary)" }}>
                    {item.completed ? "✓ Stamped Done" : `${item.loggedSets}/${item.sets} Sets Logged`}
                  </span>
                  <span style={{ color: "var(--ink-primary)" }}>Rest: {item.rest_sec}s</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => loadExerciseFromQueue(item.name, item.sets, item.reps)}
                    style={{
                      minHeight: "30px",
                      fontSize: "0.72rem",
                      padding: "0 8px",
                      opacity: item.completed ? 0.85 : 1,
                    }}
                  >
                    {item.completed ? "↺ Reload in Logger" : "⚡ Load In Logger"}
                  </button>
                  <button
                    type="button"
                    onClick={() => routine.toggleExerciseCompletion(item.id)}
                    style={{
                      minHeight: "30px",
                      padding: "0 10px",
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      borderRadius: "4px",
                      background: item.completed ? "rgba(0, 230, 118, 0.15)" : "var(--panel-module)",
                      border: item.completed ? "1px solid var(--signal-green)" : "1px solid var(--milled-border)",
                      color: item.completed ? "var(--signal-green)" : "var(--ink-secondary)",
                      cursor: "pointer",
                    }}
                    title={item.completed ? "Unmark done" : "Mark done"}
                  >
                    {item.completed ? "Done" : "Mark"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="workout-layout">
        <form className="workout-form-card glass-panel" onSubmit={handleFormSubmit}>
          <div className="mode-switch" aria-label="Workout mode selection">
            {(["strength", "cardio"] as WorkoutKind[]).map((kind) => (
              <button
                type="button"
                className={workoutForm.workoutKind === kind ? "is-active" : ""}
                key={kind}
                onClick={() => workoutForm.setWorkoutKind(kind)}
              >
                {kind === "strength"
                  ? "🏋️ [LIFT] Heavy Iron"
                  : "🏃 [CARDIO] Endurance Engine"}
              </button>
            ))}
          </div>

          <div className="workout-fields">
            <label className="workout-field-label">
              <span>Date Stamp</span>
              <input
                type="date"
                value={workoutForm.workoutDate}
                onChange={(event) =>
                  workoutForm.setWorkoutDate(event.target.value)
                }
                aria-label="Workout date"
                required
              />
            </label>

            <label className="workout-field-label">
              <span>Exercise Preset</span>
              <select
                value={workoutForm.workoutExercise}
                onChange={(event) =>
                  workoutForm.setWorkoutExercise(event.target.value)
                }
                aria-label="Exercise"
              >
                {[
                  ...workoutPresets[workoutForm.workoutKind],
                  "Custom",
                ].map((exercise) => (
                  <option key={exercise} value={exercise}>
                    {exercise}
                  </option>
                ))}
              </select>
            </label>

            <label className="workout-field-label">
              <span>Intensity Rating</span>
              <select
                value={workoutForm.workoutIntensity}
                onChange={(event) =>
                  workoutForm.setWorkoutIntensity(event.target.value)
                }
                aria-label="Intensity"
              >
                {intensityOptions.map((intensity) => (
                  <option key={intensity} value={intensity}>
                    [{intensity.toUpperCase()}]
                  </option>
                ))}
              </select>
            </label>

            {workoutForm.workoutExercise === "Custom" ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <input
                  value={workoutForm.customWorkoutExercise}
                  onChange={(event) =>
                    workoutForm.setCustomWorkoutExercise(event.target.value)
                  }
                  placeholder="Custom exercise designation..."
                  required
                />
              </div>
            ) : null}

            {isStrength ? (
              <>
                <label className="workout-field-label">
                  <span>Sets</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input
                      type="number"
                      min="1"
                      value={workoutForm.workoutSets}
                      onChange={(event) =>
                        workoutForm.setWorkoutSets(event.target.value)
                      }
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                </label>
                <label className="workout-field-label">
                  <span>Reps</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input
                      type="number"
                      min="1"
                      value={workoutForm.workoutReps}
                      onChange={(event) =>
                        workoutForm.setWorkoutReps(event.target.value)
                      }
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                </label>
                <label className="workout-field-label">
                  <span>Load (Kg)</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={workoutForm.workoutWeight}
                      onChange={(event) =>
                        workoutForm.setWorkoutWeight(event.target.value)
                      }
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                </label>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink-secondary)",
                      alignSelf: "center",
                    }}
                  >
                    Quick Load:
                  </span>
                  {[-10, -5, +2.5, +5, +10].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => workoutForm.adjustWeight(delta)}
                      style={{
                        padding: "2px 8px",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        borderRadius: "4px",
                        background: "var(--panel-recessed)",
                        border: "1px solid var(--milled-border)",
                        color:
                          delta > 0
                            ? "var(--volt-lime)"
                            : "var(--stamp-crimson)",
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}kg
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label className="workout-field-label">
                  <span>Duration (Min)</span>
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.cardioMinutes}
                    onChange={(event) =>
                      workoutForm.setCardioMinutes(event.target.value)
                    }
                    required
                  />
                </label>
                <label
                  className="workout-field-label"
                  style={{ gridColumn: "span 2" }}
                >
                  <span>Distance (Km)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={workoutForm.cardioDistance}
                    onChange={(event) =>
                      workoutForm.setCardioDistance(event.target.value)
                    }
                    placeholder="Optional distance in km"
                  />
                </label>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink-secondary)",
                      alignSelf: "center",
                    }}
                  >
                    Quick Time:
                  </span>
                  {[-5, +5, +10, +15].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => workoutForm.adjustCardioMinutes(delta)}
                      style={{
                        padding: "2px 8px",
                        fontSize: "0.72rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        borderRadius: "4px",
                        background: "var(--panel-recessed)",
                        border: "1px solid var(--milled-border)",
                        color:
                          delta > 0
                            ? "var(--chrono-cyan)"
                            : "var(--stamp-crimson)",
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}m
                    </button>
                  ))}
                </div>
              </>
            )}

            <input
              className="workout-note"
              value={workoutForm.workoutNote}
              onChange={(event) =>
                workoutForm.setWorkoutNote(event.target.value)
              }
              placeholder="PR markers, mechanical adjustments, pain telemetry..."
            />

            <button className="btn btn-violet" type="submit">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Record Training Entry{" "}
              {isStrength && estimatedVolume > 0
                ? `[Tonnage: ${formatLoad(estimatedVolume)} | Bar: ${workoutForm.workoutWeight}kg]`
                : ""}
            </button>
          </div>
        </form>

        <aside className="glass-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">7-DAY TELEMETRY</p>
              <h2>Session Stream</h2>
            </div>
            <Link
              to="/telemetry"
              style={{
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono)",
                color: "var(--hazard-orange)",
                textDecoration: "none",
              }}
            >
              [View All →]
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <div className="metric-card" title="Total cumulative tonnage: sets × reps × weight">
              <span>Week Tonnage</span>
              <strong>{formatLoad(workoutStats.weekStrengthVolume)}</strong>
            </div>
            <div className="metric-card" title="Heaviest barbell/dumbbell load lifted this week">
              <span>Week Top Load</span>
              <strong>{workoutStats.weekMaxWeight ? `${workoutStats.weekMaxWeight} kg` : "0 kg"}</strong>
            </div>
          </div>

          <div className="recent-log-list">
            {recentWorkouts.length ? (
              recentWorkouts.map((workout, idx) => (
                <WorkoutRow
                  key={workout.id}
                  index={idx}
                  onDelete={deleteWorkout}
                  workout={workout}
                />
              ))
            ) : (
              <p className="empty-state">[NO WORKOUTS RECORDED THIS WEEK]</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
