import { useState, Dispatch, SetStateAction, FormEvent } from "react";
import {
  deleteTaskApi,
  deleteSessionApi,
  upsertActiveSessionApi,
  deleteActiveSessionApi,
  completeFocusSessionApi,
} from "../apiClient";
import { todayKey } from "../utils/date";
import { getTaskStampIcon, normalizeTaskName, safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";
import { LedgerData, SyncState } from "../types/ledger";

interface UseTaskActionsParams {
  setData: Dispatch<SetStateAction<LedgerData>>;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  soundEnabled?: boolean;
  token?: string | null;
}

export const useTaskActions = ({
  setData,
  setSyncState,
  soundEnabled = true,
  token,
}: UseTaskActionsParams) => {
  const [taskName, setTaskName] = useState("");
  const [taskTarget, setTaskTarget] = useState(45);
  const [taskColor, setTaskColor] = useState("#ccff00");
  const [note, setNote] = useState("");
  const [selectedActionTaskId, setSelectedActionTaskId] = useState<string | null>(null);

  const createTask = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = taskName.trim().replace(/\s+/g, " ");
    if (!cleanName) return;

    setData((current) => {
      const alreadyExists = current.tasks.some(
        (task) => normalizeTaskName(task.name) === normalizeTaskName(cleanName),
      );
      if (alreadyExists) return current;

      playTacticalSound("click", soundEnabled);

      return {
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: safeId(),
            name: cleanName,
            targetMinutes: Number(taskTarget) || 30,
            color: taskColor,
            icon: getTaskStampIcon(cleanName),
          },
        ],
      };
    });
    setTaskName("");
    setTaskTarget(45);
  };

  const startTask = (taskId: string, targetMinutes?: number | null) => {
    const activeId = safeId();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const targetSec = targetMinutes ? targetMinutes * 60 : null;

    setData((current) => {
      if (current.active?.taskId === taskId || current.active) return current;

      playTacticalSound("start", soundEnabled);

      return {
        ...current,
        active: {
          taskId,
          sessionId: activeId,
          startedAt: nowMs,
          elapsedSeconds: 0,
          targetSeconds: targetSec,
          paused: false,
          clientVersion: 1,
        },
      };
    });
    setNote("");

    if (token) {
      upsertActiveSessionApi(
        {
          id: activeId,
          taskId,
          startedAt: nowIso,
          lastResumedAt: nowIso,
          accumulatedSeconds: 0,
          targetSeconds: targetSec,
          isPaused: false,
          clientVersion: 1,
        },
        token,
      ).catch((err) => {
        console.error("Failed to sync active session:", err);
      });
    }
  };

  const pauseTimer = () => {
    setData((current) => {
      if (!current.active || current.active.paused) return current;

      playTacticalSound("pause", soundEnabled);

      const added = Math.floor((Date.now() - current.active.startedAt) / 1000);
      const newElapsed = current.active.elapsedSeconds + added;
      const nextVersion = (current.active.clientVersion || 1) + 1;
      const activeId = current.active.sessionId || safeId();

      if (token) {
        upsertActiveSessionApi(
          {
            id: activeId,
            taskId: current.active.taskId,
            startedAt: new Date(Date.now() - newElapsed * 1000).toISOString(),
            lastResumedAt: null,
            accumulatedSeconds: newElapsed,
            targetSeconds: current.active.targetSeconds,
            isPaused: true,
            clientVersion: nextVersion,
          },
          token,
        ).catch((err) => {
          console.error("Failed to sync pause:", err);
        });
      }

      return {
        ...current,
        active: {
          ...current.active,
          sessionId: activeId,
          elapsedSeconds: newElapsed,
          startedAt: Date.now(),
          paused: true,
          clientVersion: nextVersion,
        },
      };
    });
  };

  const resumeTimer = () => {
    setData((current) => {
      if (!current.active || !current.active.paused) return current;

      playTacticalSound("start", soundEnabled);

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const nextVersion = (current.active.clientVersion || 1) + 1;
      const activeId = current.active.sessionId || safeId();

      if (token) {
        upsertActiveSessionApi(
          {
            id: activeId,
            taskId: current.active.taskId,
            startedAt: new Date(nowMs - current.active.elapsedSeconds * 1000).toISOString(),
            lastResumedAt: nowIso,
            accumulatedSeconds: current.active.elapsedSeconds,
            targetSeconds: current.active.targetSeconds,
            isPaused: false,
            clientVersion: nextVersion,
          },
          token,
        ).catch((err) => {
          console.error("Failed to sync resume:", err);
        });
      }

      return {
        ...current,
        active: {
          ...current.active,
          sessionId: activeId,
          startedAt: nowMs,
          paused: false,
          clientVersion: nextVersion,
        },
      };
    });
  };

  const cancelTimer = () => {
    setData((current) => {
      if (!current.active) return current;

      playTacticalSound("click", soundEnabled);

      return {
        ...current,
        active: null,
      };
    });
    setNote("");

    if (token) {
      deleteActiveSessionApi(token).catch((err) => {
        console.error("Failed to delete active session:", err);
      });
    }
  };

  const logSession = (overrideActionTaskId?: string | null) => {
    const finalActionTaskId =
      overrideActionTaskId !== undefined
        ? overrideActionTaskId
        : selectedActionTaskId;

    setData((current) => {
      if (!current.active) return current;

      const seconds =
        current.active.elapsedSeconds +
        (current.active.paused
          ? 0
          : Math.floor((Date.now() - current.active.startedAt) / 1000));

      if (seconds < 1) {
        if (token) {
          deleteActiveSessionApi(token).catch(() => {});
        }
        return { ...current, active: null };
      }

      playTacticalSound("complete", soundEnabled);

      const newSessionId = safeId();
      const endedAt = new Date().toISOString();
      const startedAtIso = new Date(Date.now() - seconds * 1000).toISOString();
      const dateStr = todayKey();
      const noteStr = note.trim();

      if (token) {
        completeFocusSessionApi(
          {
            id: newSessionId,
            taskId: current.active.taskId,
            actionTaskId: finalActionTaskId,
            seconds,
            note: noteStr || undefined,
            date: dateStr,
            startedAt: startedAtIso,
            endedAt,
          },
          token,
        ).catch((err) => {
          console.error("Failed to complete focus session:", err);
          setSyncState("Cloud error");
        });
      }

      return {
        ...current,
        active: null,
        sessions: [
          {
            id: newSessionId,
            taskId: current.active.taskId,
            actionTaskId: finalActionTaskId,
            seconds,
            note: noteStr,
            date: dateStr,
            startedAt: startedAtIso,
            endedAt,
          },
          ...current.sessions,
        ],
      };
    });
    setNote("");
    setSelectedActionTaskId(null);
  };

  const deleteTask = (taskId: string) => {
    playTacticalSound("click", soundEnabled);

    setData((current) => {
      if (current.active?.taskId === taskId && token) {
        deleteActiveSessionApi(token).catch(() => {});
      }
      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
        sessions: current.sessions.filter((session) => session.taskId !== taskId),
        completions: current.completions.filter(
          (completion) => completion.taskId !== taskId,
        ),
        active: current.active?.taskId === taskId ? null : current.active,
      };
    });

    deleteTaskApi(taskId).catch((err) => {
      console.error("Failed to delete task on backend:", err);
      setSyncState("Cloud error");
    });
  };

  const deleteSession = (sessionId: string) => {
    playTacticalSound("click", soundEnabled);

    setData((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== sessionId),
    }));

    deleteSessionApi(sessionId).catch((err) => {
      console.error("Failed to delete session on backend:", err);
      setSyncState("Cloud error");
    });
  };

  return {
    taskForm: {
      taskName,
      taskTarget,
      taskColor,
      setTaskName,
      setTaskTarget,
      setTaskColor,
    },
    timerForm: {
      note,
      setNote,
      selectedActionTaskId,
      setSelectedActionTaskId,
    },
    createTask,
    startTask,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    logSession,
    deleteTask,
    deleteSession,
  };
};
