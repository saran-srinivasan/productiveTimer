import React, { useState } from "react";
import { WorkoutProgram, ProgramScheduleDay, ProgramExercise } from "../types/workoutPrograms";

interface WorkoutRoutineBuilderProps {
  programs: WorkoutProgram[];
  selectedProgramId: string;
  setSelectedProgramId: (id: string) => void;
  selectedDayNumber: number;
  setSelectedDayNumber: (day: number) => void;
  currentProgram: WorkoutProgram;
  currentDay: ProgramScheduleDay;
  trainingDays: ProgramScheduleDay[];
  customExercises: ProgramExercise[];
  allAvailableExercises: string[];
  updateExerciseSets: (index: number, sets: number) => void;
  updateExerciseReps: (index: number, reps: string) => void;
  removeExercise: (index: number) => void;
  addExerciseToRoutine: (name: string, sets?: number, reps?: string, rest_sec?: number) => void;
  onEngageRoutine: () => void;
  hasActiveRoutine: boolean;
}

export function WorkoutRoutineBuilder({
  programs,
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
  onEngageRoutine,
  hasActiveRoutine,
}: WorkoutRoutineBuilderProps) {
  const [addMode, setAddMode] = useState<"dropdown" | "custom">("dropdown");
  const [selectedDropdownExercise, setSelectedDropdownExercise] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState("8-12");
  const [newExerciseRest, setNewExerciseRest] = useState(90);

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName =
      addMode === "dropdown" ? selectedDropdownExercise : newExerciseName.trim();
    if (!finalName) return;

    addExerciseToRoutine(finalName, newExerciseSets, newExerciseReps, newExerciseRest);
    setNewExerciseName("");
    setSelectedDropdownExercise("");
  };

  return (
    <div className="glass-panel" style={{ marginBottom: "20px" }}>
      <div className="panel-heading" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div>
          <p className="eyebrow">PRE-GYM ARCHITECTURE // SPLIT & DAY STRUCTURER</p>
          <h2>Workout Routine Builder</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
            GOAL:
          </span>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              background: "var(--panel-recessed)",
              border: "1px solid var(--milled-border)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--hazard-orange)",
              textTransform: "uppercase",
            }}
          >
            {currentProgram.goal.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Program Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
        <div>
          <label className="workout-field-label">
            <span>Select Program Split</span>
            <select
              value={selectedProgramId}
              onChange={(e) => {
                setSelectedProgramId(e.target.value);
                const p = programs.find((prog) => prog.id === e.target.value);
                const firstTraining = p?.schedule.find((d) => d.status === "training");
                if (firstTraining) setSelectedDayNumber(firstTraining.day);
              }}
              style={{ width: "100%", fontWeight: 700, fontFamily: "var(--font-mono)" }}
            >
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} [{prog.days_per_week}D/Wk · {prog.experience}]
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Day / Focus Selector */}
        <div>
          <label className="workout-field-label">
            <span>Select Target Day / Focus</span>
            <select
              value={selectedDayNumber}
              onChange={(e) => setSelectedDayNumber(Number(e.target.value))}
              style={{ width: "100%", fontWeight: 700, fontFamily: "var(--font-mono)" }}
            >
              {trainingDays.map((d) => (
                <option key={d.day} value={d.day}>
                  Day {d.day}: {d.name} {Array.isArray(d.focus) ? `[${d.focus.join(", ")}]` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Structured Exercise Queue Customizer */}
      <div style={{ background: "var(--panel-recessed)", padding: "14px", borderRadius: "8px", border: "1px solid var(--milled-border)", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            PLANNED MOVEMENTS FOR {currentDay.name.toUpperCase()} [{customExercises.length} EXERCISES]
          </span>
          <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
            Tune sets/reps or add custom below
          </span>
        </div>

        {customExercises.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {customExercises.map((exercise, idx) => (
              <div
                key={`${exercise.name}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: "10px",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--panel-module)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "var(--hazard-orange)",
                      width: "18px",
                    }}
                  >
                    0{idx + 1}
                  </span>
                  <div>
                    <strong style={{ fontSize: "0.88rem", color: "var(--ink-pure)", display: "block" }}>
                      {exercise.name}
                    </strong>
                    {exercise.rest_sec ? (
                      <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                        Rest: {exercise.rest_sec}s
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>Sets:</span>
                  <button
                    type="button"
                    onClick={() => updateExerciseSets(idx, exercise.sets - 1)}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "3px",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      color: "var(--ink-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    -
                  </button>
                  <strong style={{ width: "20px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                    {exercise.sets}
                  </strong>
                  <button
                    type="button"
                    onClick={() => updateExerciseSets(idx, exercise.sets + 1)}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "3px",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      color: "var(--ink-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>Reps:</span>
                  <input
                    type="text"
                    value={exercise.reps}
                    onChange={(e) => updateExerciseReps(idx, e.target.value)}
                    style={{
                      width: "65px",
                      minHeight: "26px",
                      padding: "2px 6px",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      textAlign: "center",
                      background: "var(--panel-recessed)",
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeExercise(idx)}
                  className="icon-button"
                  title={`Remove ${exercise.name}`}
                  style={{ width: "26px", height: "26px" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state" style={{ padding: "12px" }}>
            [NO EXERCISES IN THIS ROUTINE — ADD BELOW OR PICK ANOTHER DAY]
          </p>
        )}

        {/* Add exercise section with Dual Mode (Dropdown from existing OR Custom text) */}
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed var(--milled-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              + ADD MOVEMENT TO ROUTINE:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setAddMode("dropdown")}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "4px",
                  background: addMode === "dropdown" ? "var(--volt-lime)" : "var(--panel-recessed)",
                  color: addMode === "dropdown" ? "#000" : "var(--ink-secondary)",
                  border: "1px solid var(--milled-border)",
                  fontWeight: 700,
                }}
              >
                Existing List
              </button>
              <button
                type="button"
                onClick={() => setAddMode("custom")}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "4px",
                  background: addMode === "custom" ? "var(--volt-lime)" : "var(--panel-recessed)",
                  color: addMode === "custom" ? "#000" : "var(--ink-secondary)",
                  border: "1px solid var(--milled-border)",
                  fontWeight: 700,
                }}
              >
                Custom Name
              </button>
            </div>
          </div>

          <form onSubmit={handleAddExercise} style={{ display: "grid", gridTemplateColumns: "1fr 75px 75px 75px auto", gap: "8px" }}>
            {addMode === "dropdown" ? (
              <select
                value={selectedDropdownExercise}
                onChange={(e) => setSelectedDropdownExercise(e.target.value)}
                style={{ minHeight: "34px", fontSize: "0.8rem", width: "100%", fontFamily: "var(--font-mono)" }}
                required
              >
                <option value="">-- Choose Existing Movement --</option>
                {allAvailableExercises.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Type custom exercise name..."
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                style={{ minHeight: "34px", fontSize: "0.8rem" }}
                required
              />
            )}

            <input
              type="number"
              min="1"
              placeholder="Sets"
              value={newExerciseSets}
              onChange={(e) => setNewExerciseSets(Number(e.target.value))}
              style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
              title="Target Sets"
            />
            <input
              type="text"
              placeholder="Reps"
              value={newExerciseReps}
              onChange={(e) => setNewExerciseReps(e.target.value)}
              style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
              title="Target Reps (e.g. 8-12)"
            />
            <input
              type="number"
              min="30"
              step="15"
              placeholder="Rest"
              value={newExerciseRest}
              onChange={(e) => setNewExerciseRest(Number(e.target.value))}
              style={{ minHeight: "34px", fontSize: "0.8rem", textAlign: "center" }}
              title="Rest seconds"
            />
            <button type="submit" className="btn btn-secondary" style={{ minHeight: "34px", padding: "0 14px", fontSize: "0.74rem" }}>
              + Add
            </button>
          </form>
        </div>
      </div>

      {/* Routine Engagement Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
          {hasActiveRoutine ? "⚡ A session routine is currently active below" : "Ready to train? Engage to load live tracker queue."}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onEngageRoutine}
          style={{ minHeight: "40px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Engage {currentDay.name} Routine
        </button>
      </div>
    </div>
  );
}
