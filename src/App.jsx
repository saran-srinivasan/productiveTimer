import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fromSessionRow,
  fromTaskRow,
  isSupabaseConfigured,
  supabase,
  toSessionRow,
  toTaskRow,
} from "./supabaseClient";

const STORAGE_KEY = "focus-ledger-v1";

const starterTasks = [
  { id: crypto.randomUUID(), name: "Gym", targetMinutes: 45, color: "#d84b35" },
  {
    id: crypto.randomUUID(),
    name: "Code",
    targetMinutes: 120,
    color: "#287c6f",
  },
  {
    id: crypto.randomUUID(),
    name: "Trade",
    targetMinutes: 60,
    color: "#c8952d",
  },
];

const todayKey = () => new Date().toISOString().slice(0, 10);

const monthKey = (date) => date.toISOString().slice(0, 7);

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthTitle = (date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const buildMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = firstDay.getDay();
  const days = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dayDate = new Date(year, month, day);
    days.push({
      day,
      dateKey: getLocalDateKey(dayDate),
      isToday: getLocalDateKey(dayDate) === todayKey(),
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const getInitialState = () => {
  const fallback = { tasks: starterTasks, sessions: [], active: null };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored?.tasks?.length) return fallback;
    return {
      tasks: stored.tasks,
      sessions: stored.sessions ?? [],
      active: stored.active ?? null,
    };
  } catch {
    return fallback;
  }
};

function App() {
  const [data, setData] = useState(getInitialState);
  const [syncState, setSyncState] = useState(
    isSupabaseConfigured ? "Connecting" : "Local only",
  );
  const [taskName, setTaskName] = useState("");
  const [taskTarget, setTaskTarget] = useState(45);
  const [taskColor, setTaskColor] = useState("#287c6f");
  const [note, setNote] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [manualTaskId, setManualTaskId] = useState("");
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualNote, setManualNote] = useState("");
  const [now, setNow] = useState(Date.now());
  const cloudReady = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    const loadCloudData = async () => {
      setSyncState("Syncing");
      const [{ data: taskRows, error: tasksError }, { data: sessionRows, error: sessionsError }] =
        await Promise.all([
          supabase.from("focus_tasks").select("*").order("created_at", { ascending: true }),
          supabase.from("focus_sessions").select("*").order("ended_at", { ascending: false }),
        ]);

      if (cancelled) return;

      if (tasksError || sessionsError) {
        setSyncState("Cloud error");
        return;
      }

      setData((current) => {
        const cloudTasks = (taskRows ?? []).map(fromTaskRow);
        const cloudSessions = (sessionRows ?? []).map(fromSessionRow);
        const mergedTasks = [
          ...new Map([...current.tasks, ...cloudTasks].map((task) => [task.id, task])).values(),
        ];
        const mergedSessions = [
          ...new Map(
            [...current.sessions, ...cloudSessions].map((session) => [session.id, session]),
          ).values(),
        ].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

        return {
          ...current,
          tasks: mergedTasks.length ? mergedTasks : starterTasks,
          sessions: mergedSessions,
        };
      });
      cloudReady.current = true;
      setSyncState("Cloud synced");
    };

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !cloudReady.current) return;

    const syncTimer = window.setTimeout(async () => {
      setSyncState("Saving");
      const [{ error: tasksError }, { error: sessionsError }] = await Promise.all([
        data.tasks.length
          ? supabase.from("focus_tasks").upsert(data.tasks.map(toTaskRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
        data.sessions.length
          ? supabase
              .from("focus_sessions")
              .upsert(data.sessions.map(toSessionRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
      ]);

      setSyncState(tasksError || sessionsError ? "Cloud error" : "Cloud synced");
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [data]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeTask = data.tasks.find((task) => task.id === data.active?.taskId);
  const activeElapsed = data.active
    ? data.active.elapsedSeconds +
      (data.active.paused
        ? 0
        : Math.floor((now - data.active.startedAt) / 1000))
    : 0;

  const stats = useMemo(() => {
    const today = todayKey();
    const totalsByTask = new Map(data.tasks.map((task) => [task.id, 0]));
    const todayByTask = new Map(data.tasks.map((task) => [task.id, 0]));
    const byDate = new Map();
    let todaySeconds = 0;
    let weekSeconds = 0;
    const sevenDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

    for (const session of data.sessions) {
      totalsByTask.set(
        session.taskId,
        (totalsByTask.get(session.taskId) ?? 0) + session.seconds,
      );
      if (session.date === today) {
        todayByTask.set(
          session.taskId,
          (todayByTask.get(session.taskId) ?? 0) + session.seconds,
        );
        todaySeconds += session.seconds;
      }
      if (new Date(session.endedAt).getTime() >= sevenDaysAgo) {
        weekSeconds += session.seconds;
      }
      const currentDay = byDate.get(session.date) ?? {
        seconds: 0,
        sessions: 0,
        byTask: new Map(),
      };
      currentDay.seconds += session.seconds;
      currentDay.sessions += 1;
      currentDay.byTask.set(
        session.taskId,
        (currentDay.byTask.get(session.taskId) ?? 0) + session.seconds,
      );
      byDate.set(session.date, currentDay);
    }

    const topTask = data.tasks
      .map((task) => ({ ...task, seconds: totalsByTask.get(task.id) ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds)[0];

    return {
      totalsByTask,
      todayByTask,
      todaySeconds,
      weekSeconds,
      topTask,
      byDate,
    };
  }, [data.sessions, data.tasks]);

  useEffect(() => {
    if (!manualTaskId && data.tasks.length) {
      setManualTaskId(data.tasks[0].id);
    }
  }, [data.tasks, manualTaskId]);

  const monthDays = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const visibleMonth = monthKey(monthDate);
  const selectedSessions = data.sessions.filter((session) => session.date === selectedDate);
  const selectedSeconds = selectedSessions.reduce((total, session) => total + session.seconds, 0);
  const monthSessions = data.sessions.filter((session) => session.date?.startsWith(visibleMonth));
  const monthSeconds = monthSessions.reduce((total, session) => total + session.seconds, 0);
  const activeDays = new Set(monthSessions.map((session) => session.date)).size;

  const createTask = (event) => {
    event.preventDefault();
    const cleanName = taskName.trim();
    if (!cleanName) return;

    setData((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: crypto.randomUUID(),
          name: cleanName,
          targetMinutes: Number(taskTarget) || 30,
          color: taskColor,
        },
      ],
    }));
    setTaskName("");
    setTaskTarget(45);
  };

  const startTask = (taskId) => {
    setData((current) => {
      if (current.active?.taskId === taskId) return current;
      if (current.active) return current;
      return {
        ...current,
        active: {
          taskId,
          startedAt: Date.now(),
          elapsedSeconds: 0,
          paused: false,
        },
      };
    });
    setNote("");
  };

  const pauseTimer = () => {
    setData((current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: {
          ...current.active,
          elapsedSeconds:
            current.active.elapsedSeconds +
            Math.floor((Date.now() - current.active.startedAt) / 1000),
          startedAt: Date.now(),
          paused: true,
        },
      };
    });
  };

  const resumeTimer = () => {
    setData((current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: { ...current.active, startedAt: Date.now(), paused: false },
      };
    });
  };

  const logSession = () => {
    setData((current) => {
      if (!current.active) return current;
      const seconds =
        current.active.elapsedSeconds +
        (current.active.paused
          ? 0
          : Math.floor((Date.now() - current.active.startedAt) / 1000));
      if (seconds < 1) return { ...current, active: null };
      return {
        ...current,
        active: null,
        sessions: [
          {
            id: crypto.randomUUID(),
            taskId: current.active.taskId,
            seconds,
            note: note.trim(),
            date: todayKey(),
            endedAt: new Date().toISOString(),
          },
          ...current.sessions,
        ],
      };
    });
    setNote("");
  };

  const deleteTask = (taskId) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      sessions: current.sessions.filter((session) => session.taskId !== taskId),
      active: current.active?.taskId === taskId ? null : current.active,
    }));

    if (isSupabaseConfigured) {
      supabase.from("focus_tasks").delete().eq("id", taskId).then(({ error }) => {
        if (error) setSyncState("Cloud error");
      });
    }
  };

  const changeMonth = (offset) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const addManualSession = (event) => {
    event.preventDefault();
    if (!manualTaskId || !selectedDate) return;
    const minutes = Number(manualMinutes);
    if (!minutes || minutes < 1) return;

    setData((current) => ({
      ...current,
      sessions: [
        {
          id: crypto.randomUUID(),
          taskId: manualTaskId,
          seconds: minutes * 60,
          note: manualNote.trim(),
          date: selectedDate,
          endedAt: new Date(`${selectedDate}T18:00:00`).toISOString(),
        },
        ...current.sessions,
      ],
    }));
    setManualMinutes(25);
    setManualNote("");
  };

  const activeIsPaused = Boolean(data.active?.paused);
  const recentSessions = data.sessions.slice(0, 8);

  return (
    <main className="app-shell">
      <section className="command-strip">
        <div>
          <p className="eyebrow">Focus Ledger</p>
          <h1>I will do it.</h1>
        </div>
        <div className="today-stamp">
          <span>Today</span>
          <strong>{formatDuration(stats.todaySeconds)}</strong>
        </div>
      </section>

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
            disabled={!data.active}
          />
          <div className="button-row">
            <button
              className="secondary"
              onClick={pauseTimer}
              disabled={!data.active || activeIsPaused}
            >
              Pause
            </button>
            <button
              className="secondary"
              onClick={resumeTimer}
              disabled={!data.active || !activeIsPaused}
            >
              Resume
            </button>
            <button
              className="primary"
              onClick={logSession}
              disabled={!data.active}
            >
              Log work
            </button>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="task-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tasks</p>
              <h2>Pick current work</h2>
            </div>
          </div>

          <div className="task-list">
            {data.tasks.map((task) => {
              const todaySeconds = stats.todayByTask.get(task.id) ?? 0;
              const progress = Math.min(
                100,
                (todaySeconds / (task.targetMinutes * 60)) * 100,
              );
              return (
                <article
                  className="task-card"
                  key={task.id}
                  style={{ "--task-color": task.color }}
                >
                  <div className="task-topline">
                    <span className="task-dot" />
                    <h3>{task.name}</h3>
                    <button
                      className="icon-button"
                      onClick={() => deleteTask(task.id)}
                      title={`Delete ${task.name}`}
                    >
                      x
                    </button>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="task-meta">
                    <span>{formatDuration(todaySeconds)} today</span>
                    <span>{task.targetMinutes}m goal</span>
                  </div>
                  <button
                    className="start-button"
                    onClick={() => startTask(task.id)}
                    disabled={Boolean(
                      data.active && data.active.taskId !== task.id,
                    )}
                  >
                    {data.active?.taskId === task.id
                      ? "Running"
                      : data.active
                        ? "Finish current"
                        : "Start focus"}
                  </button>
                </article>
              );
            })}
          </div>

          <form className="new-task-form" onSubmit={createTask}>
            <input
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="New task name"
            />
            <input
              type="number"
              min="5"
              step="5"
              value={taskTarget}
              onChange={(event) => setTaskTarget(event.target.value)}
              aria-label="Daily target minutes"
            />
            <input
              type="color"
              value={taskColor}
              onChange={(event) => setTaskColor(event.target.value)}
            />
            <button className="primary" type="submit">
              Add
            </button>
          </form>
        </div>

        <aside className="dashboard-panel">
          <p className="eyebrow">Dashboard</p>
          <h2>What got done</h2>
          <div className="metric-grid">
            <div>
              <span>Week</span>
              <strong>{formatDuration(stats.weekSeconds)}</strong>
            </div>
            <div>
              <span>Sessions</span>
              <strong>{data.sessions.length}</strong>
            </div>
            <div>
              <span>Best lane</span>
              <strong>
                {stats.topTask?.seconds ? stats.topTask.name : "None yet"}
              </strong>
            </div>
          </div>
          <div className="sync-pill" data-state={syncState}>
            {syncState}
          </div>

          <div className="bar-stack">
            {data.tasks.map((task) => {
              const seconds = stats.totalsByTask.get(task.id) ?? 0;
              const max = Math.max(
                ...data.tasks.map(
                  (item) => stats.totalsByTask.get(item.id) ?? 0,
                ),
                1,
              );
              return (
                <div className="bar-line" key={task.id}>
                  <span>{task.name}</span>
                  <div>
                    <i
                      style={{
                        width: `${(seconds / max) * 100}%`,
                        background: task.color,
                      }}
                    />
                  </div>
                  <strong>{formatDuration(seconds)}</strong>
                </div>
              );
            })}
          </div>

          <div className="recent-log">
            <div className="panel-heading compact">
              <h2>Recent logs</h2>
            </div>
            {recentSessions.length ? (
              recentSessions.map((session) => {
                const task = data.tasks.find(
                  (item) => item.id === session.taskId,
                );
                return (
                  <div className="log-row" key={session.id}>
                    <span style={{ background: task?.color ?? "#222" }} />
                    <div>
                      <strong>{task?.name ?? "Deleted task"}</strong>
                      <p>{session.note || "Focused work logged"}</p>
                    </div>
                    <time>{formatDuration(session.seconds)}</time>
                  </div>
                );
              })
            ) : (
              <p className="empty-state">No sessions logged yet.</p>
            )}
          </div>
        </aside>
      </section>

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
            <strong>{formatDuration(monthSeconds)}</strong>
          </div>
          <div>
            <span>Active days</span>
            <strong>{activeDays}</strong>
          </div>
          <div>
            <span>Selected day</span>
            <strong>{formatDuration(selectedSeconds)}</strong>
          </div>
        </div>

        <div className="calendar-layout">
          <div className="calendar-grid" aria-label="Monthly focus calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span className="weekday" key={day}>
                {day}
              </span>
            ))}
            {monthDays.map((day, index) => {
              if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
              const dayStats = stats.byDate.get(day.dateKey);
              const strongestTask = data.tasks
                .map((task) => ({
                  ...task,
                  seconds: dayStats?.byTask.get(task.id) ?? 0,
                }))
                .sort((a, b) => b.seconds - a.seconds)[0];
              return (
                <button
                  className={`calendar-day ${day.isToday ? "is-today" : ""} ${
                    selectedDate === day.dateKey ? "is-selected" : ""
                  }`}
                  key={day.dateKey}
                  onClick={() => setSelectedDate(day.dateKey)}
                >
                  <span>{day.day}</span>
                  <strong>{dayStats ? formatDuration(dayStats.seconds) : ""}</strong>
                  {dayStats ? (
                    <i style={{ background: strongestTask?.color ?? "var(--green)" }} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <aside className="day-detail">
            <p className="eyebrow">Day detail</p>
            <h2>{selectedDate}</h2>
            <form className="manual-form" onSubmit={addManualSession}>
              <select value={manualTaskId} onChange={(event) => setManualTaskId(event.target.value)}>
                {data.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="5"
                value={manualMinutes}
                onChange={(event) => setManualMinutes(event.target.value)}
                aria-label="Minutes to add"
              />
              <input
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                placeholder="What got done?"
              />
              <button className="primary" type="submit">
                Add log
              </button>
            </form>

            <div className="selected-list">
              {selectedSessions.length ? (
                selectedSessions.map((session) => {
                  const task = data.tasks.find((item) => item.id === session.taskId);
                  return (
                    <div className="log-row" key={session.id}>
                      <span style={{ background: task?.color ?? "#222" }} />
                      <div>
                        <strong>{task?.name ?? "Deleted task"}</strong>
                        <p>{session.note || "Focused work logged"}</p>
                      </div>
                      <time>{formatDuration(session.seconds)}</time>
                    </div>
                  );
                })
              ) : (
                <p className="empty-state">No work logged for this day.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
