import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  drainOfflineQueueApi,
  fetchActiveSessionApi,
  fetchLedger,
  syncLedger,
} from "../apiClient";
import { STORAGE_KEY } from "../constants";
import { buildInitialLedger, canonicalizeData } from "../utils/ledger";

const byNewest = (dateKey) => (a, b) =>
  new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime();

export const useLedgerData = () => {
  const [data, setData] = useState(buildInitialLedger);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState("Connecting");
  const cloudReady = useRef(false);

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

  // Load from Rust backend on mount
  useEffect(() => {
    let cancelled = false;

    const loadCloudData = async () => {
      setSyncState("Syncing");
      try {
        const [ledgerResult, activeRemote] = await Promise.all([
          fetchLedger().catch((err) => {
            console.warn("fetchLedger failed:", err);
            return null;
          }),
          fetchActiveSessionApi().catch(() => null),
        ]);

        if (cancelled) return;

        if (!ledgerResult) {
          setSyncState("Local only");
          cloudReady.current = true;
          return;
        }

        setData((current) => {
          const cloudTasks = ledgerResult.tasks ?? [];
          const cloudSessions = ledgerResult.sessions ?? [];
          const cloudWorkouts = ledgerResult.workouts ?? [];

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

          let active = current.active;
          if (activeRemote) {
            const startedMs = new Date(activeRemote.startedAt).getTime() || Date.now();
            const lastResumedMs = activeRemote.lastResumedAt
              ? new Date(activeRemote.lastResumedAt).getTime()
              : startedMs;

            active = {
              taskId: activeRemote.taskId,
              sessionId: activeRemote.id,
              startedAt: activeRemote.isPaused ? Date.now() : lastResumedMs,
              elapsedSeconds: activeRemote.accumulatedSeconds,
              targetSeconds: activeRemote.targetSeconds,
              paused: activeRemote.isPaused,
              clientVersion: activeRemote.clientVersion,
            };
          }

          return canonicalizeData({
            ...current,
            tasks: cloudTasks.length ? cloudTasks : current.tasks,
            sessions: mergedSessions,
            workouts: mergedWorkouts,
            active,
          });
        });

        cloudReady.current = true;
        setSyncState("Cloud synced");
      } catch (err) {
        console.error("Backend sync error", err);
        if (!cancelled) setSyncState("Cloud error");
      }
    };

    loadCloudData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save to Rust backend (debounced on local data change)
  useEffect(() => {
    if (!cloudReady.current || isLoading) return undefined;

    const syncTimer = setTimeout(async () => {
      setSyncState("Saving");
      try {
        await syncLedger({
          tasks: data.tasks,
          sessions: data.sessions,
          workouts: data.workouts,
        });
        setSyncState("Cloud synced");
      } catch (err) {
        console.error("Error syncing data to Rust backend", err);
        setSyncState("Cloud error");
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [data, isLoading]);

  const syncNow = async () => {
    setSyncState("Syncing");
    try {
      await drainOfflineQueueApi();
      await syncLedger({
        tasks: data.tasks,
        sessions: data.sessions,
        workouts: data.workouts,
      });
      setSyncState("Cloud synced");
    } catch (err) {
      console.error("Manual sync error", err);
      setSyncState("Cloud error");
    }
  };

  return { data, setData, syncState, setSyncState, syncNow, isLoading };
};
