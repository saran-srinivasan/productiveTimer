import React, { useEffect, useRef, FormEvent } from "react";
import { weekDays } from "../constants";
import { formatDuration } from "../utils/format";
import { monthTitle } from "../utils/date";
import { LogRow } from "./LogRow";
import { WorkoutRow } from "./WorkoutRow";
import {
  CalendarMonthData,
  FocusSession,
  FocusStats,
  FocusTask,
  WorkoutEntry,
  WorkoutStats,
} from "../types/ledger";

interface CompletionDialogProps {
  date: string | null;
  hasAutoCompletion: boolean;
  hasManualCompletion: boolean;
  onClose: () => void;
  onMark: (payload: { taskId: string; date: string }) => void;
  onRemove: (payload: { taskId: string; date: string }) => void;
  task?: FocusTask;
}

function CompletionDialog({
  date,
  hasAutoCompletion,
  hasManualCompletion,
  onClose,
  onMark,
  onRemove,
  task,
}: CompletionDialogProps) {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!date) return undefined;
    actionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [date, onClose]);

  if (!date || !task) return null;

  const handleAction = () => {
    if (hasManualCompletion) {
      onRemove({ taskId: task.id, date });
    } else {
      onMark({ taskId: task.id, date });
    }
    onClose();
  };

  return (
    <div className="completion-dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="completion-dialog-title"
        aria-modal="true"
        className="completion-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="eyebrow">[STAMP.TERMINAL] // HABIT AUDIT</p>
        <h2 id="completion-dialog-title">{task.name}</h2>
        <p className="completion-dialog-date">DATE STAMP: {date}</p>

        <p className="completion-dialog-copy">
          {hasManualCompletion
            ? "Manual 'X' stamp recorded on punch card. Remove stamp?"
            : "Stamp physical completion 'X' on this date punch card?"}
        </p>

        {hasAutoCompletion ? (
          <p className="completion-dialog-note">
            ⚡ Focus telemetry automatically stamped an 'X' on this date card.
          </p>
        ) : null}

        <div className="completion-dialog-actions">
          <button className="btn btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`btn ${
              hasManualCompletion ? "btn-danger" : "btn-primary"
            }`}
            onClick={handleAction}
            ref={actionRef}
            type="button"
          >
            {hasManualCompletion ? "Revoke Stamp" : "Execute 'X' Stamp"}
          </button>
        </div>
      </section>
    </div>
  );
}

interface CalendarSectionProps {
  addManualSession: (e: FormEvent) => void;
  calendar: CalendarMonthData;
  calendarTask?: FocusTask;
  calendarTaskId: string;
  changeMonth: (offset: number) => void;
  completionDialogDate: string | null;
  deleteWorkout: (id: string) => void;
  manualSession: {
    manualTaskId: string;
    manualMinutes: number | string;
    manualNote: string;
    setManualTaskId: (val: string) => void;
    setManualMinutes: (val: number | string) => void;
    setManualNote: (val: string) => void;
  };
  markCompletion: (payload: { taskId: string; date: string }) => void;
  monthDate: Date;
  onOpenCompletionDialog: (date: string) => void;
  removeCompletion: (payload: { taskId: string; date: string }) => void;
  selectedDate: string;
  selectedSessions: FocusSession[];
  selectedTaskTotals: { task: FocusTask; seconds: number }[];
  selectedWorkouts: WorkoutEntry[];
  setCalendarTaskId: (id: string) => void;
  setCompletionDialogDate: (d: string | null) => void;
  setMonthDate: React.Dispatch<React.SetStateAction<Date>>;
  setSelectedDate: (d: string) => void;
  stats: FocusStats;
  tasks: FocusTask[];
  workoutStats: WorkoutStats;
}

export function CalendarSection({
  addManualSession,
  calendar,
  calendarTask,
  calendarTaskId,
  changeMonth,
  completionDialogDate,
  deleteWorkout,
  manualSession,
  markCompletion,
  monthDate,
  onOpenCompletionDialog,
  removeCompletion,
  selectedDate,
  selectedSessions,
  selectedTaskTotals,
  selectedWorkouts,
  setCalendarTaskId,
  setCompletionDialogDate,
  setMonthDate,
  setSelectedDate,
  stats,
  tasks,
  workoutStats,
}: CalendarSectionProps) {
  const dialogManual = completionDialogDate
    ? calendar.manualCompletionDates.has(completionDialogDate)
    : false;
  const dialogAuto = completionDialogDate
    ? calendar.autoCompletionDates.has(completionDialogDate)
    : false;

  const openCompletionDialog = (date: string) => {
    setSelectedDate(date);
    if (calendarTask) onOpenCompletionDialog(date);
  };

  return (
    <section className="calendar-section">
      <div className="calendar-heading">
        <div>
          <p className="eyebrow">MTX.04 // HABIT & DISCIPLINE MATRIX</p>
          <h2>{monthTitle(monthDate)}</h2>
        </div>

        <div className="calendar-actions">
          <label className="calendar-goal-picker">
            <span>Audit Lane:</span>
            <select
              aria-label="Task to track in calendar"
              onChange={(event) => setCalendarTaskId(event.target.value)}
              value={calendarTaskId}
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </label>

          <div className="month-controls">
            <button
              className="btn btn-secondary"
              onClick={() => changeMonth(-1)}
              type="button"
            >
              ← Prev
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMonthDate(new Date())}
              type="button"
            >
              Today
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => changeMonth(1)}
              type="button"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="month-summary">
        <div className="summary-card highlight">
          <span>Total X Days</span>
          <strong>{calendar.completionDays}</strong>
        </div>
        <div className="summary-card">
          <span>Manual X Stamps</span>
          <strong>{calendar.manualCompletionDays}</strong>
        </div>
        <div className="summary-card">
          <span>Focus-Log X</span>
          <strong>{calendar.focusCompletionDays}</strong>
        </div>
        <div className="summary-card">
          <span>Month Total Focus</span>
          <strong>{formatDuration(calendar.monthSeconds)}</strong>
        </div>
      </div>

      <div className="completion-legend">
        <span className="legend-item">
          <b className="legend-x">X</b> Manual ink stamp
        </span>
        <span className="legend-item">
          <b className="legend-x is-auto">X</b> Auto focus stamp
        </span>
        <span className="legend-item">
          <b className="legend-x is-both">X</b> Verified both
        </span>
      </div>

      <div className="calendar-layout">
        <div className="glass-panel calendar-grid-card">
          <div
            className="calendar-grid"
            aria-label="Monthly task completion calendar"
          >
            {weekDays.map((day) => (
              <span className="weekday" key={day}>
                {day}
              </span>
            ))}

            {calendar.monthDays.map((day, index) => {
              if (!day) {
                return (
                  <span className="calendar-empty" key={`empty-${index}`} />
                );
              }

              const dayStats = stats.byDate.get(day.dateKey);
              const workoutDayStats = workoutStats.byDate.get(day.dateKey);
              const strongestTask = tasks
                .map((task) => ({
                  ...task,
                  seconds: dayStats?.byTask.get(task.id) ?? 0,
                }))
                .sort((a, b) => b.seconds - a.seconds)[0];

              const taskSegments = tasks
                .map((task) => ({
                  id: task.id,
                  color: task.color,
                  seconds: dayStats?.byTask.get(task.id) ?? 0,
                }))
                .filter((task) => task.seconds > 0)
                .sort((a, b) => b.seconds - a.seconds);

              const hasManualCompletion =
                calendar.manualCompletionDates.has(day.dateKey);
              const hasAutoCompletion =
                calendar.autoCompletionDates.has(day.dateKey);
              const completionState =
                hasManualCompletion && hasAutoCompletion
                  ? "both"
                  : hasManualCompletion
                    ? "manual"
                    : hasAutoCompletion
                      ? "auto"
                      : "";

              return (
                <button
                  aria-label={`${day.dateKey}${
                    completionState
                      ? `, ${completionState} completion X`
                      : ", no completion X"
                  }`}
                  className={`calendar-day ${
                    day.isToday ? "is-today" : ""
                  } ${selectedDate === day.dateKey ? "is-selected" : ""} ${
                    completionState
                      ? `has-completion completion-${completionState}`
                      : ""
                  }`}
                  key={day.dateKey}
                  onClick={() => openCompletionDialog(day.dateKey)}
                  type="button"
                >
                  <div className="calendar-day-header">
                    <span>{day.day}</span>
                    {workoutDayStats ? (
                      <em className="day-workout-mark" title="Workout logged">
                        🏋️
                      </em>
                    ) : null}
                  </div>

                  {completionState ? (
                    <b className="completion-x" aria-hidden="true">
                      X
                    </b>
                  ) : null}

                  <strong className="day-time-format">
                    {dayStats ? formatDuration(dayStats.seconds) : ""}
                  </strong>

                  {dayStats ? (
                    <div
                      className="day-task-marks"
                      title={
                        strongestTask
                          ? `${strongestTask.name} led this day`
                          : undefined
                      }
                    >
                      {taskSegments.slice(0, 4).map((task) => (
                        <span
                          key={task.id}
                          style={{
                            background: task.color,
                            flexGrow: task.seconds,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="day-detail glass-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">DATE DOSSIER</p>
              <h2>{selectedDate}</h2>
            </div>
          </div>

          <form className="manual-form" onSubmit={addManualSession}>
            <select
              value={manualSession.manualTaskId}
              onChange={(event) =>
                manualSession.setManualTaskId(event.target.value)
              }
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="5"
              value={manualSession.manualMinutes}
              onChange={(event) =>
                manualSession.setManualMinutes(event.target.value)
              }
              aria-label="Minutes to add"
            />
            <input
              value={manualSession.manualNote}
              onChange={(event) =>
                manualSession.setManualNote(event.target.value)
              }
              placeholder="Record task output..."
            />
            <button className="btn btn-primary" type="submit">
              + Inject Manual Log
            </button>
          </form>

          <div className="selected-task-totals">
            <span className="eyebrow">LANE TOTALS FOR DATE</span>
            {selectedTaskTotals.length ? (
              selectedTaskTotals.map(({ task, seconds }) => (
                <div className="task-total-row" key={task.id}>
                  <div className="task-total-label">
                    <span
                      className="task-total-dot"
                      style={{ background: task.color }}
                    />
                    <strong>{task.name}</strong>
                  </div>
                  <time>{formatDuration(seconds)}</time>
                </div>
              ))
            ) : (
              <p className="empty-state">[NO FOCUS LOGGED ON THIS DATE]</p>
            )}
          </div>

          <div className="selected-list">
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 6 }}
            >
              ACTIVITY LOG
            </span>
            <div className="recent-log-list">
              {selectedSessions.length ? (
                selectedSessions.map((session) => (
                  <LogRow
                    key={session.id}
                    session={session}
                    task={tasks.find((item) => item.id === session.taskId)}
                  />
                ))
              ) : (
                <p className="empty-state">[NO SESSIONS RECORDED]</p>
              )}
            </div>
          </div>

          <div className="day-workouts">
            <div className="panel-heading compact">
              <h2>Iron Entries</h2>
            </div>
            <div className="recent-log-list">
              {selectedWorkouts.length ? (
                selectedWorkouts.map((workout) => (
                  <WorkoutRow
                    key={workout.id}
                    onDelete={deleteWorkout}
                    workout={workout}
                  />
                ))
              ) : (
                <p className="empty-state">[NO WORKOUTS ON THIS DATE]</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <CompletionDialog
        date={completionDialogDate}
        hasAutoCompletion={dialogAuto}
        hasManualCompletion={dialogManual}
        onClose={() => setCompletionDialogDate(null)}
        onMark={markCompletion}
        onRemove={removeCompletion}
        task={calendarTask}
      />
    </section>
  );
}
