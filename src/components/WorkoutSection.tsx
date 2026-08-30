import React, { FormEvent } from "react";
import { intensityOptions, workoutPresets } from "../constants";
import { formatLoad } from "../utils/format";
import { WorkoutRow } from "./WorkoutRow";
import { WorkoutEntry, WorkoutKind, WorkoutStats } from "../types/ledger";

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
  const isStrength = workoutForm.workoutKind === "strength";
  const estimatedVolume = isStrength
    ? (Number(workoutForm.workoutSets) || 0) *
      (Number(workoutForm.workoutReps) || 0) *
      (Number(workoutForm.workoutWeight) || 0)
    : 0;

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
            title="Total strength volume lifted today"
          >
            <span>Today Load</span>
            <strong>{formatLoad(workoutStats.todayStrengthVolume)}</strong>
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
        </div>
      </div>

      <div className="workout-layout">
        <form className="workout-form-card glass-panel" onSubmit={addWorkout}>
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
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.workoutSets}
                    onChange={(event) =>
                      workoutForm.setWorkoutSets(event.target.value)
                    }
                    required
                  />
                </label>
                <label className="workout-field-label">
                  <span>Reps</span>
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.workoutReps}
                    onChange={(event) =>
                      workoutForm.setWorkoutReps(event.target.value)
                    }
                    required
                  />
                </label>
                <label className="workout-field-label">
                  <span>Load (Kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={workoutForm.workoutWeight}
                    onChange={(event) =>
                      workoutForm.setWorkoutWeight(event.target.value)
                    }
                    required
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
                ? `[${formatLoad(estimatedVolume)}]`
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
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <div className="metric-card">
              <span>Week Volume</span>
              <strong>{formatLoad(workoutStats.weekStrengthVolume)}</strong>
            </div>
            <div className="metric-card">
              <span>Week Cardio</span>
              <strong>{workoutStats.weekCardioMinutes}m</strong>
            </div>
          </div>

          <div className="recent-log-list">
            {recentWorkouts.length ? (
              recentWorkouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
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
