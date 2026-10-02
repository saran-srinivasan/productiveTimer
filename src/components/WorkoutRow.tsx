import React from "react";
import { formatDistance, formatLoad } from "../utils/format";
import { WorkoutEntry } from "../types/ledger";

export interface WorkoutRowProps {
  workout: WorkoutEntry;
  onDelete: (id: string) => void;
  index?: number;
}

export function WorkoutRow({ workout, onDelete, index }: WorkoutRowProps) {
  const isCardio = workout.kind === "cardio";
  const formattedIndex =
    typeof index === "number" ? String(index + 1).padStart(2, "0") : null;

  const volume =
    workout.kind === "strength"
      ? (workout.sets || 0) * (workout.reps || 0) * (workout.weight || 0)
      : 0;

  return (
    <div className="workout-row workout-routine-row">
      <div className="workout-routine-main">
        <span
          className={`workout-routine-idx ${isCardio ? "is-cardio" : ""}`}
          style={formattedIndex ? undefined : { fontSize: "0.85rem" }}
        >
          {formattedIndex || (isCardio ? "⚡" : "🏋️")}
        </span>
        <div className="workout-routine-info">
          <strong className="workout-routine-title">{workout.exercise}</strong>
          {workout.note ? (
            <span className="workout-routine-note" title={workout.note}>
              {workout.note}
            </span>
          ) : null}
        </div>
      </div>

      <div className="workout-routine-metrics">
        {!isCardio ? (
          <>
            {workout.sets != null ? (
              <div className="workout-routine-chip">
                <span className="workout-routine-label">Sets:</span>
                <strong className="workout-routine-value">{workout.sets}</strong>
              </div>
            ) : null}

            {workout.reps != null ? (
              <div className="workout-routine-chip">
                <span className="workout-routine-label">Reps:</span>
                <strong className="workout-routine-value">{workout.reps}</strong>
              </div>
            ) : null}

            <div className="workout-routine-chip">
              <span className="workout-routine-label">Weight:</span>
              <strong className="workout-routine-value is-weight">
                {workout.weight != null ? `${workout.weight}kg` : "BW"}
              </strong>
            </div>

            {volume > 0 ? (
              <span
                className="workout-routine-badge is-volume"
                title={`Total load volume: ${workout.sets} sets × ${workout.reps} reps × ${workout.weight}kg`}
              >
                {formatLoad(volume)}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {workout.durationMinutes != null ? (
              <div className="workout-routine-chip">
                <span className="workout-routine-label">Time:</span>
                <strong className="workout-routine-value is-time">
                  {workout.durationMinutes}m
                </strong>
              </div>
            ) : null}

            {workout.distance != null ? (
              <div className="workout-routine-chip">
                <span className="workout-routine-label">Dist:</span>
                <strong className="workout-routine-value">
                  {formatDistance(workout.distance)}
                </strong>
              </div>
            ) : null}
          </>
        )}

        {workout.intensity ? (
          <span className="workout-routine-badge is-intensity" title="Workout intensity">
            [{workout.intensity}]
          </span>
        ) : null}
      </div>

      <button
        className="icon-button workout-routine-delete-btn"
        onClick={() => onDelete(workout.id)}
        title={`Delete ${workout.exercise}`}
        type="button"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
