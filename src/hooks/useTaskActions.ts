import { useState, Dispatch, SetStateAction, FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { todayKey } from "../utils/date";
import { normalizeTaskName, safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";
import { LedgerData, SyncState } from "../types/ledger";

interface UseTaskActionsParams {
  setData: Dispatch<SetStateAction<LedgerData>>;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  soundEnabled?: boolean;
}

export const useTaskActions = ({
  setData,
  setSyncState,
  soundEnabled = true,
}: UseTaskActionsParams) => {
  const [taskName, setTaskName] = useState("");
  const [taskTarget, setTaskTarget] = useState(45);
  const [taskColor, setTaskColor] = useState("#ccff00");
  const [note, setNote] = useState("");

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
          },
        ],
      };
    });
    setTaskName("");
    setTaskTarget(45);
  };

  const startTask = (taskId: string, targetMinutes?: number | null) => {
    setData((current) => {
      if (current.active?.taskId === taskId || current.active) return current;

      playTacticalSound("start", soundEnabled);

      return {
        ...current,
        active: {
          taskId,
          startedAt: Date.now(),
          elapsedSeconds: 0,
          targetSeconds: targetMinutes ? targetMinutes * 60 : null,
          paused: false,
        },
      };
    });
    setNote("");
  };

  const pauseTimer = () => {
    setData((current) => {
      if (!current.active) return current;

      playTacticalSound("pause", soundEnabled);

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

      playTacticalSound("start", soundEnabled);

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

      playTacticalSound("complete", soundEnabled);

      return {
        ...current,
        active: null,
        sessions: [
          {
            id: safeId(),
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

  const deleteTask = (taskId: string) => {
    playTacticalSound("click", soundEnabled);

    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      sessions: current.sessions.filter((session) => session.taskId !== taskId),
      completions: current.completions.filter(
        (completion) => completion.taskId !== taskId,
      ),
      active: current.active?.taskId === taskId ? null : current.active,
    }));

    const client = supabase;
    if (isSupabaseConfigured && client) {
      client
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
