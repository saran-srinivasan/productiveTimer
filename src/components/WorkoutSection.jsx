import { intensityOptions, workoutPresets } from "../constants";
import { formatLoad } from "../utils/format";
import { WorkoutRow } from "./WorkoutRow";

export function WorkoutSection({
  addWorkout,
  deleteWorkout,
  recentWorkouts,
  workoutForm,
  workoutStats,
}) {
  const isStrength = workoutForm.workoutKind === "strength";

  return (
    <section className="workout-section">
      <div className="workout-heading">
        <div>
          <p className="eyebrow">Gym Ledger</p>
          <h2>Workout tracker</h2>
        </div>
        <div className="workout-scoreboard">
          <div>
            <span>Today load</span>
            <strong>{formatLoad(workoutStats.todayStrengthVolume)}</strong>
          </div>
          <div>
            <span>Cardio today</span>
            <strong>{workoutStats.todayCardioMinutes}m</strong>
          </div>
          <div>
            <span>Week entries</span>
            <strong>{workoutStats.weekEntries}</strong>
          </div>
        </div>
      </div>

      <div className="workout-layout">
        <form className="workout-form" onSubmit={addWorkout}>
          <div className="mode-switch" aria-label="Workout type">
            {["strength", "cardio"].map((kind) => (
              <button
                type="button"
                className={workoutForm.workoutKind === kind ? "is-active" : ""}
                key={kind}
                onClick={() => workoutForm.setWorkoutKind(kind)}
              >
                {kind === "strength" ? "Strength" : "Cardio"}
              </button>
            ))}
          </div>

          <div className="workout-fields">
            <input
              type="date"
              value={workoutForm.workoutDate}
              onChange={(event) => workoutForm.setWorkoutDate(event.target.value)}
              aria-label="Workout date"
            />
            <select
              value={workoutForm.workoutExercise}
              onChange={(event) =>
                workoutForm.setWorkoutExercise(event.target.value)
              }
              aria-label="Exercise"
            >
              {[...workoutPresets[workoutForm.workoutKind], "Custom"].map(
                (exercise) => (
                  <option key={exercise} value={exercise}>
                    {exercise}
                  </option>
                ),
              )}
            </select>
            {workoutForm.workoutExercise === "Custom" ? (
              <input
                value={workoutForm.customWorkoutExercise}
                onChange={(event) =>
                  workoutForm.setCustomWorkoutExercise(event.target.value)
                }
                placeholder="Exercise name"
              />
            ) : null}

            {isStrength ? (
              <>
                <label>
                  <span>Sets</span>
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.workoutSets}
                    onChange={(event) =>
                      workoutForm.setWorkoutSets(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Reps</span>
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.workoutReps}
                    onChange={(event) =>
                      workoutForm.setWorkoutReps(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Kg</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={workoutForm.workoutWeight}
                    onChange={(event) =>
                      workoutForm.setWorkoutWeight(event.target.value)
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Minutes</span>
                  <input
                    type="number"
                    min="1"
                    value={workoutForm.cardioMinutes}
                    onChange={(event) =>
                      workoutForm.setCardioMinutes(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Km</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={workoutForm.cardioDistance}
                    onChange={(event) =>
                      workoutForm.setCardioDistance(event.target.value)
                    }
                  />
                </label>
              </>
            )}

            <select
              value={workoutForm.workoutIntensity}
              onChange={(event) =>
                workoutForm.setWorkoutIntensity(event.target.value)
              }
              aria-label="Intensity"
            >
              {intensityOptions.map((intensity) => (
                <option key={intensity} value={intensity}>
                  {intensity}
                </option>
              ))}
            </select>
            <input
              className="workout-note"
              value={workoutForm.workoutNote}
              onChange={(event) => workoutForm.setWorkoutNote(event.target.value)}
              placeholder="PR, pace, machine, pain notes..."
            />
            <button className="primary" type="submit">
              Log workout
            </button>
          </div>
        </form>

        <aside className="workout-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Training pulse</p>
              <h2>This week</h2>
            </div>
          </div>
          <div className="training-metrics">
            <div>
              <span>Strength</span>
              <strong>{formatLoad(workoutStats.weekStrengthVolume)}</strong>
            </div>
            <div>
              <span>Cardio</span>
              <strong>{workoutStats.weekCardioMinutes}m</strong>
            </div>
          </div>

          <div className="recent-workouts">
            {recentWorkouts.length ? (
              recentWorkouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  onDelete={deleteWorkout}
                  workout={workout}
                />
              ))
            ) : (
              <p className="empty-state">No workouts logged yet.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
