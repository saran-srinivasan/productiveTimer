import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { useLedgerData } from "../hooks/useLedgerData";
import { useFocusStats, useWorkoutStats } from "../hooks/useStats";
import { useTaskActions } from "../hooks/useTaskActions";
import { useWorkoutForm } from "../hooks/useWorkoutForm";
import { useCompletionActions } from "../hooks/useCompletionActions";
import { useManualSession } from "../hooks/useManualSession";
import { useNow } from "../hooks/useNow";
import { buildMonthDays, monthKey, todayKey } from "../utils/date";
import {
  CalendarMonthData,
  FocusSession,
  FocusStats,
  FocusTask,
  LedgerData,
  SyncState,
  WorkoutEntry,
  WorkoutStats,
} from "../types/ledger";

interface LedgerContextValue {
  data: LedgerData;
  setData: Dispatch<SetStateAction<LedgerData>>;
  syncState: SyncState;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  now: number;
  stats: FocusStats;
  workoutStats: WorkoutStats;
  taskActions: ReturnType<typeof useTaskActions>;
  workoutActions: ReturnType<typeof useWorkoutForm>;
  completionActions: ReturnType<typeof useCompletionActions>;
  manualSession: ReturnType<typeof useManualSession>;
  activeTask?: FocusTask;
  activeElapsed: number;
  activeIsPaused: boolean;
  monthDate: Date;
  setMonthDate: Dispatch<SetStateAction<Date>>;
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  calendarTaskId: string;
  setCalendarTaskId: Dispatch<SetStateAction<string>>;
  calendarTask?: FocusTask;
  completionDialogDate: string | null;
  setCompletionDialogDate: Dispatch<SetStateAction<string | null>>;
  calendar: CalendarMonthData;
  selectedSessions: FocusSession[];
  selectedWorkouts: WorkoutEntry[];
  selectedTaskTotals: { task: FocusTask; seconds: number }[];
  recentSessions: { items: FocusSession[]; totalCount: number };
  recentWorkouts: WorkoutEntry[];
  changeMonth: (offset: number) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { data, setData, syncState, setSyncState } = useLedgerData();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("focus-ledger-sound");
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("focus-ledger-sound", JSON.stringify(soundEnabled));
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const [monthDate, setMonthDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [calendarTaskId, setCalendarTaskId] = useState<string>("");
  const [completionDialogDate, setCompletionDialogDate] = useState<string | null>(null);
  const now = useNow();

  const stats = useFocusStats(data.tasks, data.sessions);
  const workoutStats = useWorkoutStats(data.workouts);
  const taskActions = useTaskActions({ setData, setSyncState, soundEnabled });
  const workoutActions = useWorkoutForm({ setData, setSyncState, soundEnabled });
  const completionActions = useCompletionActions({ setData, setSyncState, soundEnabled });
  const manualSession = useManualSession({
    tasks: data.tasks,
    selectedDate,
    setData,
    soundEnabled,
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

  const calendar: CalendarMonthData = useMemo(() => {
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
      items: data.sessions.slice(0, 12),
      totalCount: data.sessions.length,
    }),
    [data.sessions],
  );
  const recentWorkouts = useMemo(() => data.workouts.slice(0, 8), [data.workouts]);
  const calendarTask = data.tasks.find((task) => task.id === calendarTaskId);

  const changeMonth = (offset: number) => {
    setMonthDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const value: LedgerContextValue = {
    data,
    setData,
    syncState,
    setSyncState,
    soundEnabled,
    setSoundEnabled,
    now,
    stats,
    workoutStats,
    taskActions,
    workoutActions,
    completionActions,
    manualSession,
    activeTask,
    activeElapsed,
    activeIsPaused,
    monthDate,
    setMonthDate,
    selectedDate,
    setSelectedDate,
    calendarTaskId,
    setCalendarTaskId,
    calendarTask,
    completionDialogDate,
    setCompletionDialogDate,
    calendar,
    selectedSessions,
    selectedWorkouts,
    selectedTaskTotals,
    recentSessions,
    recentWorkouts,
    changeMonth,
  };

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  );
}

export function useLedgerContext(): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error("useLedgerContext must be used within a LedgerProvider");
  }
  return context;
}
