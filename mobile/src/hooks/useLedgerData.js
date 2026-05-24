import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fromSessionRow,
  fromTaskRow,
  fromWorkoutRow,
  isSupabaseConfigured,
  supabase,
  toSessionRow,
  toTaskRow,
  toWorkoutRow,
} from "../supabaseClient";
import { STORAGE_KEY } from "../constants";
import { buildInitialLedger, canonicalizeData } from "../utils/ledger";

const byNewest = (dateKey) => (a, b) =>
  new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime();

export const useLedgerData = () => {
  const [data, setData] = useState(buildInitialLedger);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState(
    isSupabaseConfigured ? "Connecting" : "Local only",
  );
  const cloudReady = useRef(false);
  const workoutCloudReady = useRef(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadLocalStorage = async () => {
      try {
        const storedStr = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedStr) {
          const stored = JSON.parse(storedStr);
          if (stored?.tasks?.length) {
            setData(canonicalizeData(stored));
          }
        }
      } catch (err) {
        console.error("Failed to load local storage ledger", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocalStorage();
  }, []);

  // Save to AsyncStorage when data changes
  useEffect(() => {
    if (isLoading) return;
    const saveLocalStorage = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error("Failed to save local storage ledger", err);
      }
    };
    saveLocalStorage();
  }, [data, isLoading]);

  // Load from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;

    const loadCloudData = async () => {
      setSyncState("Syncing");
      try {
        const [
          { data: taskRows, error: tasksError },
          { data: sessionRows, error: sessionsError },
          { data: workoutRows, error: workoutsError },
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
        ]);

        if (cancelled) return;

        if (tasksError || sessionsError) {
          setSyncState("Cloud error");
          return;
        }

        if (workoutsError) workoutCloudReady.current = false;

        setData((current) => {
          const cloudTasks = (taskRows ?? []).map(fromTaskRow);
          const cloudSessions = (sessionRows ?? []).map(fromSessionRow);
          const cloudWorkouts = workoutsError
            ? []
            : (workoutRows ?? []).map(fromWorkoutRow);

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

          return canonicalizeData({
            ...current,
            tasks: [...cloudTasks, ...current.tasks],
            sessions: mergedSessions,
            workouts: mergedWorkouts,
          });
        });

        cloudReady.current = true;
        setSyncState(workoutsError ? "Cloud error" : "Cloud synced");
      } catch (err) {
        console.error("Cloud syncing error", err);
        if (!cancelled) setSyncState("Cloud error");
      }
    };

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save to Supabase (debounce on local data change)
  useEffect(() => {
    if (!isSupabaseConfigured || !cloudReady.current || isLoading) return undefined;

    const syncTimer = setTimeout(async () => {
      setSyncState("Saving");
      try {
        const [
          { error: tasksError },
          { error: sessionsError },
          { error: workoutsError },
        ] = await Promise.all([
          data.tasks.length
            ? supabase
                .from("focus_tasks")
                .upsert(data.tasks.map(toTaskRow), { onConflict: "id" })
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
          tasksError || sessionsError || workoutsError
            ? "Cloud error"
            : "Cloud synced",
        );
      } catch (err) {
        console.error("Error upserting data to cloud", err);
        setSyncState("Cloud error");
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [data, isLoading]);

  return { data, setData, syncState, setSyncState, isLoading };
};
