import React from "react";
import { useMemo, useState } from "react";
import { CalendarSection } from "./components/CalendarSection";
import { Header } from "./components/Header";
import { TimerStage } from "./components/TimerStage";
import { WorkoutSection } from "./components/WorkoutSection";
import { WorkspaceSection } from "./components/WorkspaceSection";
import { useLedgerData } from "./hooks/useLedgerData";
import { useManualSession } from "./hooks/useManualSession";
import { useNow } from "./hooks/useNow";
import { useFocusStats, useWorkoutStats } from "./hooks/useStats";
import { useTaskActions } from "./hooks/useTaskActions";
import { useWorkoutForm } from "./hooks/useWorkoutForm";
import { buildMonthDays, monthKey, todayKey } from "./utils/date";

function App() {
  const { data, setData, syncState, setSyncState } = useLedgerData();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const now = useNow();
  const stats = useFocusStats(data.tasks, data.sessions);
  const workoutStats = useWorkoutStats(data.workouts);
  const taskActions = useTaskActions({ setData, setSyncState });
  const workoutActions = useWorkoutForm({ setData, setSyncState });
  const manualSession = useManualSession({
    tasks: data.tasks,
    selectedDate,
    setData,
  });

  const activeTask = data.tasks.find((task) => task.id === data.active?.taskId);
  const activeElapsed = data.active
    ? data.active.elapsedSeconds +
      (data.active.paused
        ? 0
        : Math.floor((now - data.active.startedAt) / 1000))
    : 0;
  const activeIsPaused = Boolean(data.active?.paused);

  const calendar = useMemo(() => {
    const visibleMonth = monthKey(monthDate);
    const monthSessions = data.sessions.filter((session) =>
      session.date?.startsWith(visibleMonth),
    );
    const monthWorkouts = data.workouts.filter((workout) =>
      workout.date?.startsWith(visibleMonth),
    );

    return {
      monthDays: buildMonthDays(monthDate),
      monthSeconds: monthSessions.reduce(
        (total, session) => total + session.seconds,
        0,
      ),
      activeDays: new Set(monthSessions.map((session) => session.date)).size,
      workoutDays: new Set(monthWorkouts.map((workout) => workout.date)).size,
      monthCardioMinutes: monthWorkouts.reduce(
        (total, workout) =>
          total +
          (workout.kind === "cardio"
            ? Number(workout.durationMinutes) || 0
            : 0),
        0,
      ),
    };
  }, [data.sessions, data.workouts, monthDate]);

  const selectedSessions = useMemo(
    () => data.sessions.filter((session) => session.date === selectedDate),
    [data.sessions, selectedDate],
  );
  const selectedWorkouts = workoutStats.byDate.get(selectedDate)?.entries ?? [];
  const selectedTaskTotals = useMemo(
    () =>
      data.tasks
        .map((task) => ({
          task,
          seconds: stats.byDate.get(selectedDate)?.byTask.get(task.id) ?? 0,
        }))
        .filter((item) => item.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds),
    [data.tasks, selectedDate, stats.byDate],
  );
  const recentSessions = useMemo(
    () => ({
      items: data.sessions.slice(0, 8),
      totalCount: data.sessions.length,
    }),
    [data.sessions],
  );
  const recentWorkouts = useMemo(() => data.workouts.slice(0, 6), [data.workouts]);

  const changeMonth = (offset) => {
    setMonthDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <main className="app-shell">
      <Header todaySeconds={stats.todaySeconds} />

      <TimerStage
        activeElapsed={activeElapsed}
        activeIsPaused={activeIsPaused}
        activeTask={activeTask}
        note={taskActions.timerForm.note}
        onLogSession={taskActions.logSession}
        onPause={taskActions.pauseTimer}
        onResume={taskActions.resumeTimer}
        setNote={taskActions.timerForm.setNote}
      />

      <WorkspaceSection
        active={data.active}
        createTask={taskActions.createTask}
        deleteTask={taskActions.deleteTask}
        recentSessions={recentSessions}
        startTask={taskActions.startTask}
        stats={stats}
        syncState={syncState}
        taskForm={taskActions.taskForm}
        tasks={data.tasks}
      />

      <WorkoutSection
        addWorkout={workoutActions.addWorkout}
        deleteWorkout={workoutActions.deleteWorkout}
        recentWorkouts={recentWorkouts}
        workoutForm={workoutActions.workoutForm}
        workoutStats={workoutStats}
      />

      <CalendarSection
        addManualSession={manualSession.addManualSession}
        calendar={calendar}
        changeMonth={changeMonth}
        deleteWorkout={workoutActions.deleteWorkout}
        manualSession={manualSession}
        monthDate={monthDate}
        selectedDate={selectedDate}
        selectedSessions={selectedSessions}
        selectedTaskTotals={selectedTaskTotals}
        selectedWorkouts={selectedWorkouts}
        setMonthDate={setMonthDate}
        setSelectedDate={setSelectedDate}
        stats={stats}
        tasks={data.tasks}
        workoutStats={workoutStats}
      />
    </main>
  );
}

export default App;
