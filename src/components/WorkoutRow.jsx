import { formatDistance } from "../utils/format";

export function WorkoutRow({ workout, onDelete }) {
  return (
    <div className="workout-row">
      <span data-kind={workout.kind} />
      <div>
        <strong>{workout.exercise}</strong>
        <p>
          {workout.kind === "strength"
            ? `${workout.sets} x ${workout.reps} @ ${workout.weight}kg`
            : `${workout.durationMinutes}m, ${formatDistance(
                workout.distance,
              )}`}
          {workout.note ? ` - ${workout.note}` : ""}
        </p>
      </div>
      <button
        className="icon-button"
        onClick={() => onDelete(workout.id)}
        title={`Delete ${workout.exercise}`}
        type="button"
      >
        x
      </button>
    </div>
  );
}
