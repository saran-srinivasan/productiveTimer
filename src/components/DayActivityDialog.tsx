import React, { useEffect, useRef, useState, useMemo, FormEvent } from "react";
import { formatDuration, formatLoad } from "../utils/format";
import { getTaskStampIcon } from "../utils/ledger";
import { FocusSession, FocusTask, WorkoutEntry } from "../types/ledger";
import { WorkoutRow } from "./WorkoutRow";

export interface DayActivityDialogProps {
  date: string | null;
  task?: FocusTask;
  tasks: FocusTask[];
  onSelectTask: (taskId: string) => void;
  sessions: FocusSession[];
  workouts?: WorkoutEntry[];
  hasAutoCompletion: boolean;
  hasManualCompletion: boolean;
  onClose: () => void;
  onMarkCompletion: (payload: { taskId: string; date: string }) => void;
  onRemoveCompletion: (payload: { taskId: string; date: string }) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteWorkout?: (workoutId: string) => void;
  onAddDirectSession?: (
    taskId: string,
    date: string,
    minutes: number,
    note?: string,
  ) => void;
}

const formatHeaderDate = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatSessionTime = (isoString?: string): string => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export function DayActivityDialog({
  date,
  task,
  tasks,
  onSelectTask,
  sessions,
  workouts,
  hasAutoCompletion,
  hasManualCompletion,
  onClose,
  onMarkCompletion,
  onRemoveCompletion,
  onDeleteSession,
  onDeleteWorkout,
  onAddDirectSession,
}: DayActivityDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [quickMinutes, setQuickMinutes] = useState<number | string>(
    task?.targetMinutes || 25,
  );
  const [quickNote, setQuickNote] = useState("");
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  useEffect(() => {
    if (task?.targetMinutes) {
      setQuickMinutes(task.targetMinutes);
    }
  }, [task?.id, task?.targetMinutes]);

  useEffect(() => {
    if (!date) return undefined;
    closeBtnRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [date, onClose]);

  // All sessions recorded on this exact date
  const dateSessions = useMemo(() => {
    if (!date) return [];
    return sessions.filter((s) => s.date === date);
  }, [sessions, date]);

  // Sessions for the currently selected audit lane on this date
  const laneSessions = useMemo(() => {
    if (!task) return [];
    return dateSessions.filter((s) => s.taskId === task.id);
  }, [dateSessions, task]);

  // Total seconds spent in the selected audit lane on this date
  const laneSeconds = useMemo(() => {
    return laneSessions.reduce((acc, s) => acc + s.seconds, 0);
  }, [laneSessions]);

  // Target and progress calculations
  const targetSeconds = (task?.targetMinutes ?? 0) * 60;
  const progressPercent =
    targetSeconds > 0
      ? Math.round((laneSeconds / targetSeconds) * 100)
      : 0;
  const isTargetMet = targetSeconds > 0 && laneSeconds >= targetSeconds;

  // Other tasks that have focus sessions on this date
  const otherLaneTotals = useMemo(() => {
    if (!date || !task) return [];
    const map = new Map<string, number>();
    for (const s of dateSessions) {
      if (s.taskId !== task.id) {
        map.set(s.taskId, (map.get(s.taskId) || 0) + s.seconds);
      }
    }
    return Array.from(map.entries())
      .map(([taskId, seconds]) => ({
        task: tasks.find((t) => t.id === taskId),
        seconds,
      }))
      .filter((item): item is { task: FocusTask; seconds: number } =>
        Boolean(item.task),
      );
  }, [dateSessions, date, task, tasks]);

  const gymTask = useMemo(() => {
    return tasks.find(
      (t) =>
        /\b(gym|workout|lift|fitness|iron|strength|exercise|weights)\b/i.test(
          t.name,
        ) ||
        t.id === "task-gym" ||
        t.icon === "🏋️",
    );
  }, [tasks]);

  const ironStats = useMemo(() => {
    if (!workouts || !workouts.length) return null;
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let totalCardioMinutes = 0;
    for (const w of workouts) {
      if (w.kind === "strength") {
        const s = w.sets || 0;
        const r = w.reps || 0;
        const wt = w.weight || 0;
        totalSets += s;
        totalReps += s * r;
        totalVolume += s * r * wt;
      } else {
        totalCardioMinutes += w.durationMinutes || 0;
      }
    }
    return {
      count: workouts.length,
      totalVolume,
      totalSets,
      totalReps,
      totalCardioMinutes,
    };
  }, [workouts]);

  if (!date || !task) return null;

  const laneStampIcon = getTaskStampIcon(task);
  const isGymSelected = Boolean(
    task &&
      (/\b(gym|workout|lift|fitness|iron|strength|exercise|weights)\b/i.test(
        task.name,
      ) ||
        task.id === "task-gym" ||
        task.icon === "🏋️"),
  );

  const handleStampToggle = () => {
    if (hasManualCompletion) {
      onRemoveCompletion({ taskId: task.id, date });
    } else {
      onMarkCompletion({ taskId: task.id, date });
    }
  };

  const handleQuickLogSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mins = Number(quickMinutes);
    if (!mins || mins < 1) return;
    if (onAddDirectSession) {
      onAddDirectSession(task.id, date, mins, quickNote);
    }
    setQuickNote("");
    setIsQuickLogOpen(false);
  };

  return (
    <div
      className="activity-dialog-backdrop completion-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="activity-dialog-title"
        aria-modal="true"
        className="activity-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <header className="activity-dialog-header">
          <div className="activity-dialog-top">
            <span className="eyebrow">[AUDIT.LANE] // DAILY ACTIVITY DOSSIER</span>
            <button
              aria-label="Close activity popup"
              className="activity-dialog-close-btn"
              onClick={onClose}
              ref={closeBtnRef}
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="activity-dialog-header-body">
            <div className="activity-dialog-date-info">
              <h2 id="activity-dialog-title" className="activity-dialog-date-title">
                {formatHeaderDate(date)}
              </h2>
              <code className="activity-dialog-date-code">{date}</code>
            </div>

            {workouts && workouts.length > 0 ? (
              <span className="other-lane-workout-badge">
                🏋️ {workouts.length} workout{workouts.length > 1 ? "s" : ""} on this date
              </span>
            ) : null}
          </div>

          {/* Audit Lane Selector Buttons */}
          <div className="activity-dialog-lane-buttons-section">
            <span className="eyebrow">SELECT AUDIT LANE:</span>
            <div
              className="activity-lane-buttons"
              role="tablist"
              aria-label="Audit Lanes"
            >
              {tasks.map((t) => {
                const isSelected = t.id === task.id;
                const taskSecs = dateSessions
                  .filter((s) => s.taskId === t.id)
                  .reduce((sum, s) => sum + s.seconds, 0);

                return (
                  <button
                    aria-selected={isSelected}
                    className={`activity-lane-btn ${
                      isSelected ? "is-selected" : ""
                    }`}
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    role="tab"
                    style={{
                      borderColor: isSelected ? t.color : undefined,
                      boxShadow: isSelected
                        ? `0 0 12px ${t.color}40, inset 0 0 4px ${t.color}20`
                        : undefined,
                    }}
                    type="button"
                  >
                    <span className="activity-lane-btn-icon" style={{ fontSize: "1rem" }}>
                      {getTaskStampIcon(t)}
                    </span>
                    <span
                      className="activity-lane-btn-dot"
                      style={{ background: t.color }}
                    />
                    <span className="activity-lane-btn-name">{t.name}</span>
                    {taskSecs > 0 ? (
                      <span
                        className="activity-lane-btn-time"
                        style={{
                          color: isSelected ? t.color : "var(--volt-lime)",
                        }}
                      >
                        {formatDuration(taskSecs)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Lane Metrics Summary */}
        <div className="activity-dialog-metrics">
          <div className="activity-metric-card highlight">
            <span className="metric-label">Focus Runtime</span>
            <strong
              className="metric-value"
              style={{ color: task.color || "var(--volt-lime)" }}
            >
              {formatDuration(laneSeconds)}
            </strong>
          </div>
          <div className="activity-metric-card">
            <span className="metric-label">Sessions Logged</span>
            <strong className="metric-value">{laneSessions.length}</strong>
          </div>
          <div className="activity-metric-card">
            <span className="metric-label">Daily Standard</span>
            <strong className="metric-value">
              {task.targetMinutes ? `${task.targetMinutes}m` : "None"}
            </strong>
          </div>
        </div>

        {/* Progress Toward Target */}
        {task.targetMinutes ? (
          <div className="activity-target-bar-wrap">
            <div className="activity-target-bar-labels">
              <span>
                Daily Target Progress ({progressPercent}%)
              </span>
              <span>
                {formatDuration(laneSeconds)} / {task.targetMinutes}m
                {isTargetMet ? " · Target Met ✓" : ""}
              </span>
            </div>
            <div className="activity-target-track">
              <div
                className="activity-target-fill"
                style={{
                  width: `${Math.min(progressPercent, 100)}%`,
                  background: task.color || "var(--volt-lime)",
                  boxShadow: isTargetMet
                    ? `0 0 10px ${task.color || "var(--volt-lime)"}`
                    : undefined,
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Sessions Activity Stream */}
        <div className="activity-sessions-section">
          <div className="activity-section-heading">
            <span className="eyebrow">
              LANE LOGS // {task.name.toUpperCase()} ({laneSessions.length})
            </span>
          </div>

          <div className="activity-sessions-list">
            {laneSessions.length > 0 ? (
              laneSessions.map((session) => (
                <div key={session.id} className="activity-session-card">
                  <div className="activity-session-main">
                    <span
                      className="activity-session-bar"
                      style={{ background: task.color }}
                    />
                    <div className="activity-session-body">
                      <div className="activity-session-meta">
                        <strong className="activity-session-duration">
                          {formatDuration(session.seconds)}
                        </strong>
                        {session.endedAt ? (
                          <time className="activity-session-time">
                            @ {formatSessionTime(session.endedAt)}
                          </time>
                        ) : null}
                      </div>
                      <p className="activity-session-note">
                        {session.note || "Standard focus session logged"}
                      </p>
                    </div>
                  </div>

                  {onDeleteSession ? (
                    <button
                      className="activity-session-delete-btn"
                      onClick={() => onDeleteSession(session.id)}
                      title="Remove this session entry"
                      type="button"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="activity-empty-state">
                <span className="empty-icon">⏱️</span>
                <strong>No Focus Activity Logged</strong>
                <p>
                  No focus timer blocks or manual sessions recorded for "
                  {task.name}" on this date.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* If Gym lane is selected: Show Iron Entries */}
        {isGymSelected ? (
          <div className="activity-iron-section">
            <div
              className="activity-section-heading"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span className="eyebrow" style={{ marginBottom: 0 }}>
                🏋️ IRON ENTRIES // WORKOUTS ON THIS DATE [{workouts?.length ?? 0}]
              </span>
              {ironStats ? (
                <div className="activity-iron-summary-chips">
                  {ironStats.totalSets > 0 ? (
                    <span className="activity-iron-chip">
                      Sets: <strong>{ironStats.totalSets}</strong>
                    </span>
                  ) : null}
                  {ironStats.totalVolume > 0 ? (
                    <span className="activity-iron-chip is-volume">
                      Vol: <strong>{formatLoad(ironStats.totalVolume)}</strong>
                    </span>
                  ) : null}
                  {ironStats.totalCardioMinutes > 0 ? (
                    <span className="activity-iron-chip is-cardio">
                      Cardio: <strong>{ironStats.totalCardioMinutes}m</strong>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="activity-workouts-list">
              {workouts && workouts.length > 0 ? (
                workouts.map((workout, idx) => (
                  <WorkoutRow
                    key={workout.id}
                    index={idx}
                    onDelete={onDeleteWorkout || (() => {})}
                    workout={workout}
                  />
                ))
              ) : (
                <div className="activity-empty-state">
                  <span className="empty-icon">🏋️</span>
                  <strong>No Iron Entries Logged</strong>
                  <p>No workout sets or cardio entries recorded on {date}.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Habit Stamp Punch Card Section */}
        <div className="activity-stamp-panel">
          <div className="activity-stamp-header">
            <span className="eyebrow">HABIT AUDIT STAMP STATUS</span>
            <div className="activity-stamp-badges">
              {hasAutoCompletion ? (
                <span className="stamp-badge is-auto" title="Telemetry verified">
                  ⚡ Auto Focus Stamp Active
                </span>
              ) : null}
              {hasManualCompletion ? (
                <span className="stamp-badge is-manual" title="Manual punch stamp">
                  {laneStampIcon} Manual Stamp Recorded
                </span>
              ) : (
                <span className="stamp-badge is-none">
                  ○ No Manual Stamp
                </span>
              )}
            </div>
          </div>

          <div className="activity-stamp-action-row">
            <p className="activity-stamp-desc">
              {hasManualCompletion
                ? `Manual ${laneStampIcon} stamp is recorded on this date card.`
                : hasAutoCompletion
                  ? "Focus telemetry automatically verified an active stamp on this card."
                  : `No stamp on this card. Execute manual ${laneStampIcon} stamp if completed offline.`}
            </p>
            <button
              className={`btn ${
                hasManualCompletion ? "btn-danger" : "btn-primary"
              }`}
              onClick={handleStampToggle}
              type="button"
            >
              {hasManualCompletion
                ? `Revoke ${laneStampIcon} Stamp`
                : `Execute ${laneStampIcon} Stamp`}
            </button>
          </div>
        </div>

        {/* Quick Log Form for this Lane & Date */}
        {onAddDirectSession ? (
          <div className="activity-quick-log-wrap">
            {!isQuickLogOpen ? (
              <button
                className="btn btn-secondary quick-log-toggle-btn"
                onClick={() => setIsQuickLogOpen(true)}
                type="button"
              >
                + Inject Offline / Manual Focus Time
              </button>
            ) : (
              <form className="activity-quick-log-form" onSubmit={handleQuickLogSubmit}>
                <div className="quick-log-header">
                  <span className="eyebrow">INJECT TIME INTO {task.name.toUpperCase()}</span>
                  <button
                    className="quick-log-cancel"
                    onClick={() => setIsQuickLogOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
                <div className="quick-log-inputs-row">
                  <input
                    aria-label="Minutes to add"
                    className="quick-log-minutes"
                    min="1"
                    onChange={(e) => setQuickMinutes(e.target.value)}
                    placeholder="Min"
                    step="5"
                    type="number"
                    value={quickMinutes}
                  />
                  <input
                    aria-label="Session note"
                    className="quick-log-note"
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="What was completed in this block..."
                    type="text"
                    value={quickNote}
                  />
                  <button className="btn btn-primary" type="submit">
                    + Log Time
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {/* Other Activity Context (Other Lanes & Workouts) */}
        {otherLaneTotals.length > 0 || (workouts && workouts.length > 0) ? (
          <div className="activity-other-context">
            <span className="eyebrow">OTHER ACTIVITY ON THIS DATE:</span>
            <div className="other-lanes-pills">
              {otherLaneTotals.map(({ task: otherTask, seconds }) => (
                <button
                  className="other-lane-pill"
                  key={otherTask.id}
                  onClick={() => onSelectTask(otherTask.id)}
                  title={`Switch view to ${otherTask.name}`}
                  type="button"
                >
                  <span
                    className="other-lane-pill-dot"
                    style={{ background: otherTask.color }}
                  />
                  <span className="other-lane-pill-name">{otherTask.name}</span>
                  <strong className="other-lane-pill-time">
                    {formatDuration(seconds)}
                  </strong>
                </button>
              ))}
              {workouts && workouts.length > 0 ? (
                gymTask ? (
                  <button
                    type="button"
                    className="other-lane-pill"
                    onClick={() => onSelectTask(gymTask.id)}
                    style={{
                      borderColor: "rgba(255, 107, 0, 0.4)",
                      color: "var(--hazard-orange)",
                    }}
                    title="Switch to Gym audit lane to inspect Iron Entries"
                  >
                    <span style={{ fontSize: "0.76rem" }}>🏋️</span>
                    <span className="other-lane-pill-name">{gymTask.name}</span>
                    <strong
                      className="other-lane-pill-time"
                      style={{ color: "var(--hazard-orange)" }}
                    >
                      {workouts.length} logs
                    </strong>
                  </button>
                ) : (
                  <span className="other-lane-workout-badge">
                    🏋️ {workouts.length} workout{workouts.length > 1 ? "s" : ""}
                  </span>
                )
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Modal Footer */}
        <footer className="activity-dialog-footer">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
