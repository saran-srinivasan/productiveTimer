import { useState } from "react";
import * as Crypto from "expo-crypto";
import {
  completeFocusSessionApi,
  deleteActiveSessionApi,
  deleteTaskApi,
  upsertActiveSessionApi,
} from "../apiClient";
import { todayKey } from "../utils/date";
import { normalizeTaskName } from "../utils/ledger";

export const useTaskActions = ({ setData, setSyncState }) => {
  const [taskName, setTaskName] = useState("");
  const [taskTarget, setTaskTarget] = useState(45);
  const [taskColor, setTaskColor] = useState("#287c6f");
  const [note, setNote] = useState("");

  const createTask = () => {
    const cleanName = taskName.trim().replace(/\s+/g, " ");
    if (!cleanName) return;

    setData((current) => {
      const alreadyExists = current.tasks.some(
        (task) => normalizeTaskName(task.name) === normalizeTaskName(cleanName),
      );
      if (alreadyExists) return current;

      return {
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: Crypto.randomUUID(),
            name: cleanName,
            targetMinutes: Number(taskTarget) || 30,
            color: taskColor,
          },
        ],
      };
    });
    setTaskName("");
    setTaskTarget(45);
  };

  const startTask = (taskId, targetMinutes) => {
    const activeId = Crypto.randomUUID();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const targetSeconds = targetMinutes ? targetMinutes * 60 : null;

    setData((current) => {
      if (current.active?.taskId === taskId || current.active) return current;

      return {
        ...current,
        active: {
          taskId,
          sessionId: activeId,
          startedAt: nowMs,
          elapsedSeconds: 0,
          targetSeconds,
          paused: false,
          clientVersion: 1,
        },
      };
    });
    setNote("");

    upsertActiveSessionApi({
      id: activeId,
      taskId,
      startedAt: nowIso,
      lastResumedAt: nowIso,
      accumulatedSeconds: 0,
      targetSeconds,
      isPaused: false,
      clientVersion: 1,
    }).catch(() => {});
  };

  const pauseTimer = () => {
    setData((current) => {
      if (!current.active || current.active.paused) return current;

      const added = Math.floor((Date.now() - current.active.startedAt) / 1000);
      const newElapsed = current.active.elapsedSeconds + added;
      const nextVersion = (current.active.clientVersion || 1) + 1;
      const activeId = current.active.sessionId || Crypto.randomUUID();

      upsertActiveSessionApi({
        id: activeId,
        taskId: current.active.taskId,
        startedAt: new Date(Date.now() - newElapsed * 1000).toISOString(),
        lastResumedAt: null,
        accumulatedSeconds: newElapsed,
        targetSeconds: current.active.targetSeconds || null,
        isPaused: true,
        clientVersion: nextVersion,
      }).catch(() => {});

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

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const nextVersion = (current.active.clientVersion || 1) + 1;
      const activeId = current.active.sessionId || Crypto.randomUUID();

      upsertActiveSessionApi({
        id: activeId,
        taskId: current.active.taskId,
        startedAt: new Date(nowMs - current.active.elapsedSeconds * 1000).toISOString(),
        lastResumedAt: nowIso,
        accumulatedSeconds: current.active.elapsedSeconds,
        targetSeconds: current.active.targetSeconds || null,
        isPaused: false,
        clientVersion: nextVersion,
      }).catch(() => {});

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
    deleteActiveSessionApi().catch(() => {});
    setData((current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: null,
      };
    });
    setNote("");
  };

  const logSession = () => {
    setData((current) => {
      if (!current.active) return current;

      const seconds =
        current.active.elapsedSeconds +
        (current.active.paused
          ? 0
          : Math.floor((Date.now() - current.active.startedAt) / 1000));

      if (seconds < 1) {
        deleteActiveSessionApi().catch(() => {});
        return { ...current, active: null };
      }

      const sessionId = current.active.sessionId || Crypto.randomUUID();
      const endedAt = new Date().toISOString();
      const date = todayKey();

      completeFocusSessionApi({
        id: sessionId,
        taskId: current.active.taskId,
        seconds,
        note: note.trim(),
        date,
        endedAt,
      }).catch((err) => {
        console.warn("Failed to complete focus session in backend:", err);
      });

      return {
        ...current,
        active: null,
        sessions: [
          {
            id: sessionId,
            taskId: current.active.taskId,
            seconds,
            note: note.trim(),
            date,
            endedAt,
          },
          ...current.sessions,
        ],
      };
    });
    setNote("");
  };

  const deleteTask = (taskId) => {
    setData((current) => {
      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
        sessions: current.sessions.filter((session) => session.taskId !== taskId),
        active: current.active?.taskId === taskId ? null : current.active,
      };
    });

    deleteTaskApi(taskId).catch((err) => {
      console.warn("Delete task error:", err);
      if (setSyncState) setSyncState("Cloud error");
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
    timerForm: { note, setNote },
    createTask,
    startTask,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    logSession,
    deleteTask,
  };
};
