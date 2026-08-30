import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarSection } from "./components/CalendarSection";
import { Header } from "./components/Header";
import { TimerStage } from "./components/TimerStage";
import { WorkoutSection } from "./components/WorkoutSection";
import { WorkspaceSection } from "./components/WorkspaceSection";
import { useLedgerData } from "./hooks/useLedgerData";
import { useCompletionActions } from "./hooks/useCompletionActions";
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
  const [calendarTaskId, setCalendarTaskId] = useState("");
  const [completionDialogDate, setCompletionDialogDate] = useState(null);
  const now = useNow();
  const stats = useFocusStats(data.tasks, data.sessions);
  const workoutStats = useWorkoutStats(data.workouts);
  const taskActions = useTaskActions({ setData, setSyncState });
  const workoutActions = useWorkoutForm({ setData, setSyncState });
  const completionActions = useCompletionActions({ setData, setSyncState });
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

  useEffect(() => {
    if (data.tasks.length && !data.tasks.some((task) => task.id === calendarTaskId)) {
      setCalendarTaskId(data.tasks[0].id);
    }
    if (!data.tasks.length && calendarTaskId) setCalendarTaskId("");
  }, [calendarTaskId, data.tasks]);

  const calendar = useMemo(() => {
    const visibleMonth = monthKey(monthDate);
    const monthSessions = data.sessions.filter((session) =>
      session.date?.startsWith(visibleMonth),
    );
    const monthWorkouts = data.workouts.filter((workout) =>
      workout.date?.startsWith(visibleMonth),
    );
    const goalSessions = data.sessions.filter(
      (session) =>
        session.taskId === calendarTaskId && session.date?.startsWith(visibleMonth),
    );
    const manualGoalCompletions = data.completions.filter(
      (completion) =>
        completion.taskId === calendarTaskId &&
        completion.date?.startsWith(visibleMonth),
    );
    const autoCompletionDates = new Set(goalSessions.map((session) => session.date));
    const manualCompletionDates = new Set(
      manualGoalCompletions.map((completion) => completion.date),
    );
    const completionDates = new Set([
      ...autoCompletionDates,
      ...manualCompletionDates,
    ]);

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
      autoCompletionDates,
      manualCompletionDates,
      completionDays: completionDates.size,
      manualCompletionDays: manualCompletionDates.size,
      focusCompletionDays: autoCompletionDates.size,
    };
  }, [calendarTaskId, data.completions, data.sessions, data.workouts, monthDate]);

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
  const calendarTask = data.tasks.find((task) => task.id === calendarTaskId);

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
        calendarTask={calendarTask}
        calendarTaskId={calendarTaskId}
        calendar={calendar}
        changeMonth={changeMonth}
        completionDialogDate={completionDialogDate}
        deleteWorkout={workoutActions.deleteWorkout}
        manualSession={manualSession}
        markCompletion={completionActions.markCompletion}
        monthDate={monthDate}
        onOpenCompletionDialog={setCompletionDialogDate}
        removeCompletion={completionActions.removeCompletion}
        selectedDate={selectedDate}
        selectedSessions={selectedSessions}
        selectedTaskTotals={selectedTaskTotals}
        selectedWorkouts={selectedWorkouts}
        setMonthDate={setMonthDate}
        setSelectedDate={setSelectedDate}
        setCalendarTaskId={setCalendarTaskId}
        setCompletionDialogDate={setCompletionDialogDate}
        stats={stats}
        tasks={data.tasks}
        workoutStats={workoutStats}
      />
    </main>
  );
}

export default App;
