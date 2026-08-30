import { useEffect, useRef } from "react";
import { weekDays } from "../constants";
import { formatDuration } from "../utils/format";
import { monthTitle } from "../utils/date";
import { LogRow } from "./LogRow";
import { WorkoutRow } from "./WorkoutRow";

function CompletionDialog({ date, hasAutoCompletion, hasManualCompletion, onClose, onMark, onRemove, task }) {
  const actionRef = useRef(null);

  useEffect(() => {
    if (!date) return undefined;
    actionRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [date, onClose]);

  if (!date || !task) return null;
  const handleAction = () => {
    if (hasManualCompletion) onRemove({ taskId: task.id, date });
    else onMark({ taskId: task.id, date });
    onClose();
  };

  return <div className="completion-dialog-backdrop" onMouseDown={onClose}>
    <section aria-labelledby="completion-dialog-title" aria-modal="true" className="completion-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
      <p className="eyebrow">Completion check</p>
      <h2 id="completion-dialog-title">{task.name}</h2>
      <p className="completion-dialog-date">{date}</p>
      <p className="completion-dialog-copy">{hasManualCompletion ? "Manual X recorded. Remove it?" : "Mark this day complete with an X?"}</p>
      {hasAutoCompletion ? <p className="completion-dialog-note">Focus log already creates automatic X. Removing manual X keeps it.</p> : null}
      <div className="completion-dialog-actions">
        <button className="secondary" onClick={onClose} type="button">Cancel</button>
        <button className={hasManualCompletion ? "danger-button" : "primary"} onClick={handleAction} ref={actionRef} type="button">
          {hasManualCompletion ? "Remove manual X" : "Mark X"}
        </button>
      </div>
    </section>
  </div>;
}

export function CalendarSection({
  addManualSession, calendar, calendarTask, calendarTaskId, changeMonth, completionDialogDate,
  deleteWorkout, manualSession, markCompletion, monthDate, onOpenCompletionDialog,
  removeCompletion, selectedDate, selectedSessions, selectedTaskTotals, selectedWorkouts,
  setCalendarTaskId, setCompletionDialogDate, setMonthDate, setSelectedDate, stats, tasks,
  workoutStats,
}) {
  const dialogManual = completionDialogDate ? calendar.manualCompletionDates.has(completionDialogDate) : false;
  const dialogAuto = completionDialogDate ? calendar.autoCompletionDates.has(completionDialogDate) : false;
  const openCompletionDialog = (date) => {
    setSelectedDate(date);
    if (calendarTask) onOpenCompletionDialog(date);
  };

  return <section className="calendar-section">
    <div className="calendar-heading">
      <div><p className="eyebrow">Completion calendar</p><h2>{monthTitle(monthDate)}</h2></div>
      <div className="calendar-actions">
        <label className="calendar-goal-picker"><span>Tracking</span>
          <select aria-label="Task to track in calendar" onChange={(event) => setCalendarTaskId(event.target.value)} value={calendarTaskId}>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
          </select>
        </label>
        <div className="month-controls">
          <button className="secondary" onClick={() => changeMonth(-1)} type="button">Prev</button>
          <button className="secondary" onClick={() => setMonthDate(new Date())} type="button">Today</button>
          <button className="secondary" onClick={() => changeMonth(1)} type="button">Next</button>
        </div>
      </div>
    </div>

    <div className="month-summary completion-summary">
      <div><span>X days</span><strong>{calendar.completionDays}</strong></div>
      <div><span>Manual X</span><strong>{calendar.manualCompletionDays}</strong></div>
      <div><span>Focus-log X</span><strong>{calendar.focusCompletionDays}</strong></div>
      <div><span>Month focus</span><strong>{formatDuration(calendar.monthSeconds)}</strong></div>
    </div>
    <p className="completion-legend"><span><b className="legend-x">X</b> manual mark</span><span><b className="legend-x is-auto">X</b> focus log</span><span><b className="legend-x is-both">X</b> both</span></p>

    <div className="calendar-layout">
      <div className="calendar-grid" aria-label="Monthly task completion calendar">
        {weekDays.map((day) => <span className="weekday" key={day}>{day}</span>)}
        {calendar.monthDays.map((day, index) => {
          if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
          const dayStats = stats.byDate.get(day.dateKey);
          const workoutDayStats = workoutStats.byDate.get(day.dateKey);
          const strongestTask = tasks.map((task) => ({ ...task, seconds: dayStats?.byTask.get(task.id) ?? 0 })).sort((a, b) => b.seconds - a.seconds)[0];
          const taskSegments = tasks.map((task) => ({ id: task.id, color: task.color, seconds: dayStats?.byTask.get(task.id) ?? 0 })).filter((task) => task.seconds > 0).sort((a, b) => b.seconds - a.seconds);
          const hasManualCompletion = calendar.manualCompletionDates.has(day.dateKey);
          const hasAutoCompletion = calendar.autoCompletionDates.has(day.dateKey);
          const completionState = hasManualCompletion && hasAutoCompletion ? "both" : hasManualCompletion ? "manual" : hasAutoCompletion ? "auto" : "";

          return <button aria-label={`${day.dateKey}${completionState ? `, ${completionState} completion X` : ", no completion X"}`} className={`calendar-day ${day.isToday ? "is-today" : ""} ${selectedDate === day.dateKey ? "is-selected" : ""} ${workoutDayStats ? "has-workout" : ""} ${completionState ? `has-completion completion-${completionState}` : ""}`} key={day.dateKey} onClick={() => openCompletionDialog(day.dateKey)} type="button">
            <span>{day.day}</span>
            {completionState ? <b className="completion-x" aria-hidden="true">X</b> : null}
            <strong className="day-time-format">{dayStats ? formatDuration(dayStats.seconds) : ""}</strong>
            {workoutDayStats ? <em className="day-workout-mark">{workoutDayStats.cardioMinutes ? `${workoutDayStats.cardioMinutes}m cardio` : `${workoutDayStats.hardSets} sets`}</em> : null}
            {dayStats ? <div className="day-task-marks" title={strongestTask ? `${strongestTask.name} led this day` : undefined}>
              {taskSegments.slice(0, 4).map((task) => <span key={task.id} style={{ background: task.color, flexGrow: task.seconds }} />)}
            </div> : null}
          </button>;
        })}
      </div>

      <aside className="day-detail">
        <p className="eyebrow">Day detail</p><h2>{selectedDate}</h2>
        <form className="manual-form" onSubmit={addManualSession}>
          <select value={manualSession.manualTaskId} onChange={(event) => manualSession.setManualTaskId(event.target.value)}>{tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select>
          <input type="number" min="1" step="5" value={manualSession.manualMinutes} onChange={(event) => manualSession.setManualMinutes(event.target.value)} aria-label="Minutes to add" />
          <input value={manualSession.manualNote} onChange={(event) => manualSession.setManualNote(event.target.value)} placeholder="What got done?" />
          <button className="primary" type="submit">Add log</button>
        </form>
        <div className="selected-task-totals">{selectedTaskTotals.length ? selectedTaskTotals.map(({ task, seconds }) => <div className="task-total-row" key={task.id}><span style={{ background: task.color }} /><strong>{task.name}</strong><time>{formatDuration(seconds)}</time></div>) : <p className="empty-state">No task totals for this day.</p>}</div>
        <div className="selected-list">{selectedSessions.length ? selectedSessions.map((session) => <LogRow key={session.id} session={session} task={tasks.find((item) => item.id === session.taskId)} />) : <p className="empty-state">No work logged for this day.</p>}</div>
        <div className="day-workouts"><div className="panel-heading compact"><h2>Workout log</h2></div>{selectedWorkouts.length ? selectedWorkouts.map((workout) => <WorkoutRow key={workout.id} onDelete={deleteWorkout} workout={workout} />) : <p className="empty-state">No workouts logged for this day.</p>}</div>
      </aside>
    </div>
    <CompletionDialog date={completionDialogDate} hasAutoCompletion={dialogAuto} hasManualCompletion={dialogManual} onClose={() => setCompletionDialogDate(null)} onMark={markCompletion} onRemove={removeCompletion} task={calendarTask} />
  </section>;
}
