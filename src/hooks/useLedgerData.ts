import { useEffect, useRef, useState, Dispatch, SetStateAction } from "react";
import { fetchLedger, syncLedger } from "../apiClient";
import { STORAGE_KEY } from "../constants";
import { buildInitialLedger, canonicalizeData } from "../utils/ledger";
import { LedgerData, SyncState } from "../types/ledger";

const getInitialState = (): LedgerData => {
  const fallback = buildInitialLedger();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw);
    if (!stored?.tasks?.length) return fallback;
    return canonicalizeData(stored);
  } catch {
    return fallback;
  }
};

const byNewest = (dateKey: "endedAt" | "createdAt") => (a: any, b: any) =>
  new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime();

export interface UseLedgerDataReturn {
  data: LedgerData;
  setData: Dispatch<SetStateAction<LedgerData>>;
  syncState: SyncState;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
}

export const useLedgerData = (): UseLedgerDataReturn => {
  const [data, setData] = useState<LedgerData>(getInitialState);
  const [syncState, setSyncState] = useState<SyncState>("Connecting");
  const backendReady = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Initial load from Rust backend (SQLite)
  useEffect(() => {
    let cancelled = false;

    const loadRemoteData = async () => {
      setSyncState("Syncing");

      try {
        const remote = await fetchLedger();

        if (cancelled) return;

        setData((current) => {
          const mergedSessions = [
            ...new Map(
              [...current.sessions, ...remote.sessions].map((session) => [
                session.id,
                session,
              ]),
            ).values(),
          ].sort(byNewest("endedAt"));

          const mergedWorkouts = [
            ...new Map(
              [...current.workouts, ...remote.workouts].map((workout) => [
                workout.id,
                workout,
              ]),
            ).values(),
          ].sort(byNewest("createdAt"));

          const mergedCompletions = [
            ...new Map(
              [...current.completions, ...remote.completions].map((completion) => [
                completion.id,
                completion,
              ]),
            ).values(),
          ].sort(byNewest("createdAt"));

          return canonicalizeData({
            ...current,
            tasks: [...remote.tasks, ...current.tasks],
            sessions: mergedSessions,
            workouts: mergedWorkouts,
            completions: mergedCompletions,
          });
        });

        backendReady.current = true;
        setSyncState("Cloud synced");
      } catch (err) {
        if (!cancelled) {
          console.warn("Backend unavailable, using local storage cache:", err);
          setSyncState("Local only");
        }
      }
    };

    loadRemoteData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced auto-sync to Rust backend
  useEffect(() => {
    if (!backendReady.current) return undefined;

    const syncTimer = window.setTimeout(async () => {
      setSyncState("Saving");

      try {
        await syncLedger({
          tasks: data.tasks,
          sessions: data.sessions,
          workouts: data.workouts,
          completions: data.completions,
        });
        setSyncState("Cloud synced");
      } catch (err) {
        console.error("Auto-sync to backend failed:", err);
        setSyncState("Cloud error");
      }
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [data]);

  return { data, setData, syncState, setSyncState };
};
