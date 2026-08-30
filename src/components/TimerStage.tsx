import React, { useState } from "react";
import { formatClock } from "../utils/format";
import { FocusTask } from "../types/ledger";

interface TimerStageProps {
  activeElapsed?: number;
  activeIsPaused?: boolean;
  activeTask?: FocusTask;
  note?: string;
  onLogSession: () => void;
  onPause: () => void;
  onResume: () => void;
  setNote: (val: string) => void;
}

export function TimerStage({
  activeElapsed = 0,
  activeIsPaused = false,
  activeTask,
  note = "",
  onLogSession,
  onPause,
  onResume,
  setNote,
}: TimerStageProps) {
  const [timerMode, setTimerMode] = useState<string>("countup");
  const hasActiveTask = Boolean(activeTask);

  const targetMinutes = timerMode === "countup" ? null : Number(timerMode);
  const targetSeconds = targetMinutes ? targetMinutes * 60 : null;
  const remainingSeconds = targetSeconds
    ? Math.max(0, targetSeconds - activeElapsed)
    : activeElapsed;

  const displayTime =
    targetSeconds && activeElapsed <= targetSeconds
      ? formatClock(remainingSeconds)
      : formatClock(activeElapsed);

  const isCountdownOver = Boolean(targetSeconds && activeElapsed >= targetSeconds);

  return (
    <section className="timer-stage">
      <div
        className={`timer-cockpit ${hasActiveTask && !activeIsPaused ? "is-running" : ""}`}
        style={
          {
            "--dial-color": activeTask?.color ?? "var(--volt-lime)",
          } as React.CSSProperties
        }
      >
        <div className="dial-badge">
          <span className="dial-badge-dot" />
          <span>{activeTask ? `LANE: ${activeTask.name}` : "CHRONO STANDBY"}</span>
        </div>

        <div
          className="dial-clock"
          style={
            isCountdownOver
              ? {
                  color: "var(--stamp-crimson)",
                  textShadow: "0 0 20px rgba(255,23,68,0.5)",
                }
              : {}
          }
        >
          {displayTime}
        </div>

        <p className="dial-subtitle">
          {hasActiveTask
            ? targetSeconds
              ? isCountdownOver
                ? "⚠️ TARGET REACHED — OVERTIME RUNNING"
                : `COUNTDOWN SPRINT [${targetMinutes}M TARGET]`
              : "OPEN FLOW RUNTIME [UNLIMITED FOCUS]"
            : "SELECT TARGET FOCUS LANE TO ENGAGE RUNTIME"}
        </p>

        <div
          className={`dial-live-status ${
            hasActiveTask
              ? activeIsPaused
                ? "paused"
                : "running"
              : "idle"
          }`}
        >
          {hasActiveTask
            ? activeIsPaused
              ? "⏸ STATUS: PAUSED"
              : "● STATUS: ENGAGED"
            : "○ STATUS: READY"}
        </div>
      </div>

      <div className="timer-controls-panel">
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <label className="timer-note-label" htmlFor="timer-session-note">
              [SPRINT.MODE] Preset Target
            </label>
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { id: "countup", label: "Open" },
                { id: "25", label: "25m" },
                { id: "45", label: "45m" },
                { id: "60", label: "60m" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTimerMode(mode.id)}
                  style={{
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    borderRadius: "4px",
                    background:
                      timerMode === mode.id
                        ? "var(--volt-lime)"
                        : "var(--panel-recessed)",
                    color: timerMode === mode.id ? "#000" : "var(--ink-secondary)",
                    border: "1px solid var(--milled-border)",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="timer-note-wrapper">
            <label className="timer-note-label" htmlFor="timer-session-note">
              [LOG.NOTE] // Session Deliverables
            </label>
            <textarea
              id="timer-session-note"
              className="timer-note-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                hasActiveTask
                  ? "Record deliverables, commits, or links before stamping log..."
                  : "Timer standby. Engage a focus lane below..."
              }
              disabled={!hasActiveTask}
            />
          </div>
        </div>

        <div className="timer-btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPause}
            disabled={!hasActiveTask || activeIsPaused}
            title="Pause active timer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="4" height="16" />
              <rect x="15" y="4" width="4" height="16" />
            </svg>
            Pause
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResume}
            disabled={!hasActiveTask || !activeIsPaused}
            title="Resume paused timer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Resume
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onLogSession}
            disabled={!hasActiveTask}
            title="Complete and log this focus session"
          >
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
            Stamp Log
          </button>
        </div>
      </div>
    </section>
  );
}
