import React from "react";
import { formatDistance } from "../utils/format";
import { WorkoutEntry } from "../types/ledger";

interface WorkoutRowProps {
  workout: WorkoutEntry;
  onDelete: (id: string) => void;
}

export function WorkoutRow({ workout, onDelete }: WorkoutRowProps) {
  return (
    <div className="workout-row">
      <span className="workout-row-pill" data-kind={workout.kind} />
      <div className="workout-row-content">
        <strong>{workout.exercise}</strong>
        <p>
          {workout.kind === "strength"
            ? `${workout.sets} sets × ${workout.reps} reps @ ${workout.weight}kg`
            : `${workout.durationMinutes}m duration${
                workout.distance ? ` · ${formatDistance(workout.distance)}` : ""
              }`}
          {workout.intensity ? ` [${workout.intensity.toUpperCase()}]` : ""}
          {workout.note ? ` — ${workout.note}` : ""}
        </p>
      </div>
      <button
        className="icon-button"
        onClick={() => onDelete(workout.id)}
        title={`Delete ${workout.exercise}`}
        type="button"
      >
        <svg
          width="12"
          height="12"
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
