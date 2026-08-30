import { useEffect, useRef, useState } from "react";
import {
  fromCompletionRow,
  fromSessionRow,
  fromTaskRow,
  fromWorkoutRow,
  isSupabaseConfigured,
  supabase,
  toSessionRow,
  toTaskRow,
  toCompletionRow,
  toWorkoutRow,
} from "../supabaseClient";
import { STORAGE_KEY } from "../constants";
import { buildInitialLedger, canonicalizeData } from "../utils/ledger";

const getInitialState = () => {
  const fallback = buildInitialLedger();

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored?.tasks?.length) return fallback;
    return canonicalizeData(stored);
  } catch {
    return fallback;
  }
};

const byNewest = (dateKey) => (a, b) =>
  new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime();

export const useLedgerData = () => {
  const [data, setData] = useState(getInitialState);
  const [syncState, setSyncState] = useState(
    isSupabaseConfigured ? "Connecting" : "Local only",
  );
  const cloudReady = useRef(false);
  const workoutCloudReady = useRef(true);
  const completionCloudReady = useRef(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;

    const loadCloudData = async () => {
      setSyncState("Syncing");
      const [
        { data: taskRows, error: tasksError },
        { data: sessionRows, error: sessionsError },
        { data: workoutRows, error: workoutsError },
        { data: completionRows, error: completionsError },
      ] = await Promise.all([
        supabase
          .from("focus_tasks")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("focus_sessions")
          .select("*")
          .order("ended_at", { ascending: false }),
        supabase
          .from("workout_entries")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("task_completions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (tasksError || sessionsError) {
        setSyncState("Cloud error");
        return;
      }

      if (workoutsError) workoutCloudReady.current = false;
      if (completionsError) completionCloudReady.current = false;

      setData((current) => {
        const cloudTasks = (taskRows ?? []).map(fromTaskRow);
        const cloudSessions = (sessionRows ?? []).map(fromSessionRow);
        const cloudWorkouts = workoutsError
          ? []
          : (workoutRows ?? []).map(fromWorkoutRow);
        const cloudCompletions = completionsError
          ? []
          : (completionRows ?? []).map(fromCompletionRow);
        const mergedSessions = [
          ...new Map(
            [...current.sessions, ...cloudSessions].map((session) => [
              session.id,
              session,
            ]),
          ).values(),
        ].sort(byNewest("endedAt"));
        const mergedWorkouts = [
          ...new Map(
            [...current.workouts, ...cloudWorkouts].map((workout) => [
              workout.id,
              workout,
            ]),
          ).values(),
        ].sort(byNewest("createdAt"));
        const mergedCompletions = [
          ...new Map(
            [...current.completions, ...cloudCompletions].map((completion) => [
              completion.id,
              completion,
            ]),
          ).values(),
        ].sort(byNewest("createdAt"));

        return canonicalizeData({
          ...current,
          tasks: [...cloudTasks, ...current.tasks],
          sessions: mergedSessions,
          workouts: mergedWorkouts,
          completions: mergedCompletions,
        });
      });

      cloudReady.current = true;
      setSyncState(workoutsError || completionsError ? "Cloud error" : "Cloud synced");
    };

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !cloudReady.current) return undefined;

    const syncTimer = window.setTimeout(async () => {
      setSyncState("Saving");
      const [
        { error: tasksError },
        { error: sessionsError },
        { error: workoutsError },
        { error: completionsError },
      ] = await Promise.all([
        data.tasks.length
          ? supabase
              .from("focus_tasks")
              .upsert(data.tasks.map(toTaskRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
        completionCloudReady.current && data.completions.length
          ? supabase
              .from("task_completions")
              .upsert(data.completions.map(toCompletionRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
        data.sessions.length
          ? supabase
              .from("focus_sessions")
              .upsert(data.sessions.map(toSessionRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
        workoutCloudReady.current && data.workouts.length
          ? supabase
              .from("workout_entries")
              .upsert(data.workouts.map(toWorkoutRow), { onConflict: "id" })
          : Promise.resolve({ error: null }),
      ]);

      setSyncState(
        tasksError || sessionsError || workoutsError || completionsError
          ? "Cloud error"
          : "Cloud synced",
      );
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [data]);

  return { data, setData, syncState, setSyncState };
};
