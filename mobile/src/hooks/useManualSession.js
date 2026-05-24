import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";

export const useManualSession = ({ tasks, selectedDate, setData }) => {
  const [manualTaskId, setManualTaskId] = useState("");
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualNote, setManualNote] = useState("");

  useEffect(() => {
    if (tasks.length && !tasks.some((task) => task.id === manualTaskId)) {
      setManualTaskId(tasks[0].id);
    } else if (!tasks.length && manualTaskId) {
      setManualTaskId("");
    }
  }, [manualTaskId, tasks]);

  const addManualSession = () => {
    if (!manualTaskId || !selectedDate) return;

    const minutes = Number(manualMinutes);
    if (!minutes || minutes < 1) return;

    setData((current) => ({
      ...current,
      sessions: [
        {
          id: Crypto.randomUUID(),
          taskId: manualTaskId,
          seconds: minutes * 60,
          note: manualNote.trim(),
          date: selectedDate,
          endedAt: new Date(`${selectedDate}T18:00:00`).toISOString(),
        },
        ...current.sessions,
      ],
    }));
    setManualMinutes(25);
    setManualNote("");
  };

  return {
    manualTaskId,
    manualMinutes,
    manualNote,
    setManualTaskId,
    setManualMinutes,
    setManualNote,
    addManualSession,
  };
};
