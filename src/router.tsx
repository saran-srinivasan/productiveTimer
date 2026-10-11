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
import { FullTelemetryView } from "./components/FullTelemetryView";
import { useLedgerContext } from "./context/LedgerContext";

import { QuickCaptureModal } from "./components/tasks/QuickCaptureModal";
import { ActionTasksSection } from "./components/tasks/ActionTasksSection";
import { TriPillarDashboard } from "./components/dashboard/TriPillarDashboard";
import { AnalyticsOverviewSection } from "./components/analytics/AnalyticsOverviewSection";

function RootLayout() {
  const [quickCaptureOpen, setQuickCaptureOpen] = React.useState(false);
  const { data } = useLedgerContext();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickCaptureOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="app-shell">
      <Header onOpenQuickCapture={() => setQuickCaptureOpen(true)} />
      <Outlet />
      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        focusLanes={data?.tasks}
      />
    </main>
  );
}

// Root Route layout
const rootRoute = createRootRoute({
  component: RootLayout,
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
        onCancel={taskActions.cancelTimer}
        setNote={taskActions.timerForm.setNote}
      />

      <TriPillarDashboard />

      <AnalyticsOverviewSection />

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
        addWorkoutEntries={workoutActions.addWorkoutEntries}
        deleteWorkout={workoutActions.deleteWorkout}
        recentWorkouts={recentWorkouts}
        workoutForm={workoutActions.workoutForm}
        workoutStats={workoutStats}
      />

      <CalendarSection
        addDirectSession={manualSession.addDirectSession}
        addManualSession={manualSession.addManualSession}
        calendarTask={calendarTask}
        calendarTaskId={calendarTaskId}
        calendar={calendar}
        changeMonth={changeMonth}
        completionDialogDate={completionDialogDate}
        deleteSession={taskActions.deleteSession}
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
        sessions={data.sessions}
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
        onCancel={taskActions.cancelTimer}
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
      addWorkoutEntries={workoutActions.addWorkoutEntries}
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
    taskActions,
    workoutStats,
  } = useLedgerContext();

  return (
    <>
      <HabitsSection />
      <CalendarSection
        addDirectSession={manualSession.addDirectSession}
        addManualSession={manualSession.addManualSession}
        calendarTask={calendarTask}
        calendarTaskId={calendarTaskId}
        calendar={calendar}
        changeMonth={changeMonth}
        completionDialogDate={completionDialogDate}
        deleteSession={taskActions.deleteSession}
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
        sessions={data.sessions}
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

import { ProjectsSection } from "./components/projects/ProjectsSection";
import { GoalsSection } from "./components/goals/GoalsSection";
import { DayPlannerSection } from "./components/planner/DayPlannerSection";
import { HabitsSection } from "./components/habits/HabitsSection";

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

function TasksView() {
  const { data } = useLedgerContext();
  return <ActionTasksSection focusLanes={data.tasks} />;
}

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksView,
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

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsSection,
});

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsSection,
});

const plannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/planner",
  component: DayPlannerSection,
});

const telemetryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/telemetry",
  component: FullTelemetryView,
});

// Route Tree & Router Instance
const routeTree = rootRoute.addChildren([
  indexRoute,
  focusRoute,
  tasksRoute,
  plannerRoute,
  gymRoute,
  calendarRoute,
  projectsRoute,
  goalsRoute,
  telemetryRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
