import { useEffect, useRef, useState, Dispatch, SetStateAction } from "react";
import {
  drainOfflineQueueApi,
  fetchActiveSessionApi,
  fetchLedger,
  getPendingMutationCount,
  syncLedger,
} from "../apiClient";
import { STORAGE_KEY } from "../constants";
import { buildInitialLedger, canonicalizeData } from "../utils/ledger";
import { ActiveTimer, LedgerData, SyncState } from "../types/ledger";
import { useAuth } from "../context/AuthContext";
import { buildSampleGuestLedger } from "../data/sampleGuestData";

const GUEST_STORAGE_KEY = "focus-ledger-guest-sandbox";

const getOwnerInitialState = (): LedgerData => {
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

const getGuestInitialState = (): LedgerData => {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored?.tasks?.length) return canonicalizeData(stored);
    }
  } catch {
    // ignore
  }
  return buildSampleGuestLedger();
};

const byNewest = (dateKey: "endedAt" | "createdAt") => (a: any, b: any) =>
  new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime();

export interface UseLedgerDataReturn {
  data: LedgerData;
  setData: Dispatch<SetStateAction<LedgerData>>;
  syncState: SyncState;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

export const useLedgerData = (): UseLedgerDataReturn => {
  const { role, token, guestResetCounter } = useAuth();
  const [data, setData] = useState<LedgerData>(() =>
    role === "owner" ? getOwnerInitialState() : getGuestInitialState(),
  );
  const [syncState, setSyncState] = useState<SyncState>(
    role === "owner"
      ? !navigator.onLine
        ? "Offline"
        : "Connecting"
      : "Guest Sandbox",
  );
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingMutationCount());
  const backendReady = useRef(false);
  const currentRoleRef = useRef(role);

  // Switch datasets when role transitions
  useEffect(() => {
    currentRoleRef.current = role;
    if (role === "owner") {
      backendReady.current = false;
      setData(getOwnerInitialState());
      setSyncState("Connecting");
    } else {
      backendReady.current = false;
      setData(getGuestInitialState());
      setSyncState("Guest Sandbox");
    }
  }, [role]);

  // Handle guest data reset
  useEffect(() => {
    if (role === "guest" && guestResetCounter > 0) {
      const freshSample = buildSampleGuestLedger();
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(freshSample));
      setData(freshSample);
      setSyncState("Guest Sandbox");
    }
  }, [guestResetCounter, role]);

  // Save current dataset to appropriate localStorage key
  useEffect(() => {
    try {
      const targetKey = role === "owner" ? STORAGE_KEY : GUEST_STORAGE_KEY;
      localStorage.setItem(targetKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data, role]);

  // Owner Mode: Initial load from Rust backend (SQLite)
  useEffect(() => {
    if (role !== "owner" || !token) {
      backendReady.current = false;
      return undefined;
    }

    let cancelled = false;

    const loadRemoteData = async () => {
      setSyncState("Syncing");

      try {
        const [remote, activeRemote] = await Promise.all([
          fetchLedger(token),
          fetchActiveSessionApi(token),
        ]);

        if (cancelled) return;

        setData((current: LedgerData) => {
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

          let active: ActiveTimer | null = current.active;
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
          } else {
            active = null;
          }

          return canonicalizeData({
            ...current,
            tasks: [...remote.tasks, ...current.tasks],
            sessions: mergedSessions,
            workouts: mergedWorkouts,
            completions: mergedCompletions,
            active,
          });
        });

        backendReady.current = true;
        setSyncState("Cloud synced");
      } catch (err) {
        if (!cancelled) {
          console.warn("Backend unavailable or unauthorized, using local storage cache:", err);
          setSyncState("Local only");
        }
      }
    };

    loadRemoteData();

    return () => {
      cancelled = true;
    };
  }, [role, token]);

  // Owner Mode: Debounced auto-sync to Rust backend
  useEffect(() => {
    if (role !== "owner" || !token || !backendReady.current) {
      return undefined;
    }

    const syncTimer = window.setTimeout(async () => {
      setSyncState("Saving");

      try {
        await syncLedger(
          {
            tasks: data.tasks,
            sessions: data.sessions,
            workouts: data.workouts,
            completions: data.completions,
          },
          token,
        );
        setSyncState("Cloud synced");
      } catch (err) {
        console.error("Auto-sync to backend failed:", err);
        setSyncState("Cloud error");
      }
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [data, role, token]);

  const syncNow = async () => {
    if (role !== "owner" || !token) return;
    setSyncState("Syncing");
    try {
      await drainOfflineQueueApi(token);
      await syncLedger(
        {
          tasks: data.tasks,
          sessions: data.sessions,
          workouts: data.workouts,
          completions: data.completions,
        },
        token,
      );
      setPendingCount(getPendingMutationCount());
      setSyncState("Cloud synced");
    } catch (err) {
      console.error("Manual sync failed:", err);
      setSyncState(!navigator.onLine ? "Offline" : "Cloud error");
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setSyncState("Syncing");
      drainOfflineQueueApi(token)
        .then(() => {
          setPendingCount(getPendingMutationCount());
          setSyncState("Cloud synced");
        })
        .catch(() => {
          setSyncState("Cloud error");
        });
    };

    const handleOffline = () => {
      setSyncState("Offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  return { data, setData, syncState, setSyncState, pendingCount, syncNow };
};
