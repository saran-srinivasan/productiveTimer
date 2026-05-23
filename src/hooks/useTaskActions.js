import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { todayKey } from "../utils/date";
import { normalizeTaskName } from "../utils/ledger";

export const useTaskActions = ({ setData, setSyncState }) => {
  const [taskName, setTaskName] = useState("");
  const [taskTarget, setTaskTarget] = useState(45);
  const [taskColor, setTaskColor] = useState("#287c6f");
  const [note, setNote] = useState("");

  const createTask = (event) => {
    event.preventDefault();
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
            id: crypto.randomUUID(),
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

  const startTask = (taskId) => {
    setData((current) => {
      if (current.active?.taskId === taskId || current.active) return current;

      return {
        ...current,
        active: {
          taskId,
          startedAt: Date.now(),
          elapsedSeconds: 0,
          paused: false,
        },
      };
    });
    setNote("");
  };

  const pauseTimer = () => {
    setData((current) => {
      if (!current.active) return current;

      return {
        ...current,
        active: {
          ...current.active,
          elapsedSeconds:
            current.active.elapsedSeconds +
            Math.floor((Date.now() - current.active.startedAt) / 1000),
          startedAt: Date.now(),
          paused: true,
        },
      };
    });
  };

  const resumeTimer = () => {
    setData((current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: { ...current.active, startedAt: Date.now(), paused: false },
      };
    });
  };

  const logSession = () => {
    setData((current) => {
      if (!current.active) return current;

      const seconds =
        current.active.elapsedSeconds +
        (current.active.paused
          ? 0
          : Math.floor((Date.now() - current.active.startedAt) / 1000));

      if (seconds < 1) return { ...current, active: null };

      return {
        ...current,
        active: null,
        sessions: [
          {
            id: crypto.randomUUID(),
            taskId: current.active.taskId,
            seconds,
            note: note.trim(),
            date: todayKey(),
            endedAt: new Date().toISOString(),
          },
          ...current.sessions,
        ],
      };
    });
    setNote("");
  };

  const deleteTask = (taskId) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      sessions: current.sessions.filter((session) => session.taskId !== taskId),
      active: current.active?.taskId === taskId ? null : current.active,
    }));

    if (isSupabaseConfigured) {
      supabase
        .from("focus_tasks")
        .delete()
        .eq("id", taskId)
        .then(({ error }) => {
          if (error) setSyncState("Cloud error");
        });
    }
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
    logSession,
    deleteTask,
  };
};
