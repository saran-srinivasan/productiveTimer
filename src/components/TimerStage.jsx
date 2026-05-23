import { formatClock } from "../utils/format";

export function TimerStage({
  activeElapsed,
  activeIsPaused,
  activeTask,
  note,
  onLogSession,
  onPause,
  onResume,
  setNote,
}) {
  const hasActiveTask = Boolean(activeTask);

  return (
    <section className="timer-stage">
      <div
        className="dial"
        style={{ "--dial-color": activeTask?.color ?? "#222" }}
      >
        <span className="dial-label">
          {activeTask ? activeTask.name : "No active task"}
        </span>
        <strong>{formatClock(activeElapsed)}</strong>
        <span>
          {activeTask
            ? "focused time in current session"
            : "choose a task to begin"}
        </span>
      </div>

      <div className="timer-controls">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a short note before logging this session..."
          disabled={!hasActiveTask}
        />
        <div className="button-row">
          <button
            className="secondary"
            onClick={onPause}
            disabled={!hasActiveTask || activeIsPaused}
          >
            Pause
          </button>
          <button
            className="secondary"
            onClick={onResume}
            disabled={!hasActiveTask || !activeIsPaused}
          >
            Resume
          </button>
          <button
            className="primary"
            onClick={onLogSession}
            disabled={!hasActiveTask}
          >
            Log work
          </button>
        </div>
      </div>
    </section>
  );
}
