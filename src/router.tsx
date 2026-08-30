import React from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Header } from "./components/Header";
import { TimerStage } from "./components/TimerStage";
import { WorkspaceSection } from "./components/WorkspaceSection";
import { WorkoutSection } from "./components/WorkoutSection";
import { CalendarSection } from "./components/CalendarSection";
import { useLedgerContext } from "./context/LedgerContext";

// Root Route layout
const rootRoute = createRootRoute({
  component: () => (
    <main className="app-shell">
      <Header />
      <Outlet />
    </main>
  ),
});

// [01] Command Center (All Modules)
function CommandAllView() {
  const {
    data,
    activeElapsed,
    activeIsPaused,
    activeTask,
    taskActions,
    recentSessions,
    stats,
    syncState,
    workoutActions,
    recentWorkouts,
    workoutStats,
    manualSession,
    calendarTask,
    calendarTaskId,
    calendar,
    changeMonth,
    completionDialogDate,
    completionActions,
    monthDate,
    setCompletionDialogDate,
    selectedDate,
    selectedSessions,
    selectedTaskTotals,
    selectedWorkouts,
    setCalendarTaskId,
    setMonthDate,
    setSelectedDate,
  } = useLedgerContext();

  return (
    <>
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
        setCalendarTaskId={setCalendarTaskId}
        setCompletionDialogDate={setCompletionDialogDate}
        setMonthDate={setMonthDate}
        setSelectedDate={setSelectedDate}
        stats={stats}
        tasks={data.tasks}
        workoutStats={workoutStats}
      />
    </>
  );
}

// [02] Focus & Tasks View
function FocusView() {
  const {
    data,
    activeElapsed,
    activeIsPaused,
    activeTask,
    taskActions,
    recentSessions,
    stats,
    syncState,
  } = useLedgerContext();

  return (
    <>
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
    </>
  );
}

// [03] Gym Ledger View
function GymView() {
  const { workoutActions, recentWorkouts, workoutStats } = useLedgerContext();

  return (
    <WorkoutSection
      addWorkout={workoutActions.addWorkout}
      deleteWorkout={workoutActions.deleteWorkout}
      recentWorkouts={recentWorkouts}
      workoutForm={workoutActions.workoutForm}
      workoutStats={workoutStats}
    />
  );
}

// [04] Habit Matrix View
function CalendarView() {
  const {
    manualSession,
    calendarTask,
    calendarTaskId,
    calendar,
    changeMonth,
    completionDialogDate,
    workoutActions,
    completionActions,
    monthDate,
    setCompletionDialogDate,
    selectedDate,
    selectedSessions,
    selectedTaskTotals,
    selectedWorkouts,
    setCalendarTaskId,
    setMonthDate,
    setSelectedDate,
    stats,
    data,
    workoutStats,
  } = useLedgerContext();

  return (
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
      setCalendarTaskId={setCalendarTaskId}
      setCompletionDialogDate={setCompletionDialogDate}
      setMonthDate={setMonthDate}
      setSelectedDate={setSelectedDate}
      stats={stats}
      tasks={data.tasks}
      workoutStats={workoutStats}
    />
  );
}

// Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CommandAllView,
});

const focusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/focus",
  component: FocusView,
});

const gymRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gym",
  component: GymView,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarView,
});

// Route Tree & Router Instance
const routeTree = rootRoute.addChildren([
  indexRoute,
  focusRoute,
  gymRoute,
  calendarRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
