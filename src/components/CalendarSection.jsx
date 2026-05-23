import { weekDays } from "../constants";
import { formatDuration } from "../utils/format";
import { monthTitle } from "../utils/date";
import { LogRow } from "./LogRow";
import { WorkoutRow } from "./WorkoutRow";

export function CalendarSection({
  addManualSession,
  calendar,
  changeMonth,
  deleteWorkout,
  manualSession,
  monthDate,
  selectedDate,
  selectedSessions,
  selectedTaskTotals,
  selectedWorkouts,
  setMonthDate,
  setSelectedDate,
  stats,
  tasks,
  workoutStats,
}) {
  return (
    <section className="calendar-section">
      <div className="calendar-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>{monthTitle(monthDate)}</h2>
        </div>
        <div className="month-controls">
          <button className="secondary" onClick={() => changeMonth(-1)}>
            Prev
          </button>
          <button className="secondary" onClick={() => setMonthDate(new Date())}>
            Today
          </button>
          <button className="secondary" onClick={() => changeMonth(1)}>
            Next
          </button>
        </div>
      </div>

      <div className="month-summary">
        <div>
          <span>Month total</span>
          <strong>{formatDuration(calendar.monthSeconds)}</strong>
        </div>
        <div>
          <span>Active days</span>
          <strong>{calendar.activeDays}</strong>
        </div>
        <div>
          <span>Workout days</span>
          <strong>{calendar.workoutDays}</strong>
        </div>
        <div>
          <span>Month cardio</span>
          <strong>{calendar.monthCardioMinutes}m</strong>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid" aria-label="Monthly focus calendar">
          {weekDays.map((day) => (
            <span className="weekday" key={day}>
              {day}
            </span>
          ))}
          {calendar.monthDays.map((day, index) => {
            if (!day) {
              return <span className="calendar-empty" key={`empty-${index}`} />;
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

            return (
              <button
                className={`calendar-day ${day.isToday ? "is-today" : ""} ${
                  selectedDate === day.dateKey ? "is-selected" : ""
                } ${workoutDayStats ? "has-workout" : ""}`}
                key={day.dateKey}
                onClick={() => setSelectedDate(day.dateKey)}
              >
                <span>{day.day}</span>
                <strong className="day-time-format">
                  {dayStats ? formatDuration(dayStats.seconds) : ""}
                </strong>
                {workoutDayStats ? (
                  <em className="day-workout-mark">
                    {workoutDayStats.cardioMinutes
                      ? `${workoutDayStats.cardioMinutes}m cardio`
                      : `${workoutDayStats.hardSets} sets`}
                  </em>
                ) : null}
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

        <aside className="day-detail">
          <p className="eyebrow">Day detail</p>
          <h2>{selectedDate}</h2>
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
              placeholder="What got done?"
            />
            <button className="primary" type="submit">
              Add log
            </button>
          </form>

          <div className="selected-task-totals">
            {selectedTaskTotals.length ? (
              selectedTaskTotals.map(({ task, seconds }) => (
                <div className="task-total-row" key={task.id}>
                  <span style={{ background: task.color }} />
                  <strong>{task.name}</strong>
                  <time>{formatDuration(seconds)}</time>
                </div>
              ))
            ) : (
              <p className="empty-state">No task totals for this day.</p>
            )}
          </div>

          <div className="selected-list">
            {selectedSessions.length ? (
              selectedSessions.map((session) => (
                <LogRow
                  key={session.id}
                  session={session}
                  task={tasks.find((item) => item.id === session.taskId)}
                />
              ))
            ) : (
              <p className="empty-state">No work logged for this day.</p>
            )}
          </div>

          <div className="day-workouts">
            <div className="panel-heading compact">
              <h2>Workout log</h2>
            </div>
            {selectedWorkouts.length ? (
              selectedWorkouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  onDelete={deleteWorkout}
                  workout={workout}
                />
              ))
            ) : (
              <p className="empty-state">No workouts logged for this day.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
