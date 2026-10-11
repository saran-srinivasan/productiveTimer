import React, { useState } from "react";
import { formatClock } from "../utils/format";
import { FocusTask } from "../types/ledger";

import { ActionTaskDto } from "../types/api";

interface TimerStageProps {
  activeElapsed?: number;
  activeIsPaused?: boolean;
  activeTask?: FocusTask;
  note?: string;
  onLogSession: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel?: () => void;
  setNote: (val: string) => void;
  actionTaskId?: string | null;
  setActionTaskId?: (id: string | null) => void;
  actionTasks?: ActionTaskDto[];
}

export function TimerStage({
  activeElapsed = 0,
  activeIsPaused = false,
  activeTask,
  note = "",
  onLogSession,
  onPause,
  onResume,
  onCancel,
  setNote,
  actionTaskId,
  setActionTaskId,
  actionTasks,
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

          {actionTasks && actionTasks.length > 0 && setActionTaskId && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-secondary)",
                  marginBottom: "0.25rem",
                  textTransform: "uppercase",
                }}
              >
                [DELIVERABLE.TASK] // Link Actionable Task (Optional)
              </label>
              <select
                value={actionTaskId || ""}
                onChange={(e) => setActionTaskId(e.target.value ? e.target.value : null)}
                style={{
                  width: "100%",
                  background: "var(--panel-recessed)",
                  border: "1px solid var(--milled-border)",
                  color: "var(--ink-primary)",
                  padding: "0.45rem 0.6rem",
                  borderRadius: "var(--radius-xs)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                }}
              >
                <option value="">(No specific action task linked)</option>
                {actionTasks
                  .filter((t) => t.status !== "completed")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.priority.toUpperCase()}] {t.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

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

          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={!hasActiveTask}
              title="Discard / cancel active timer"
              style={{ color: "var(--stamp-crimson, #ff1744)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Discard
            </button>
          )}

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
