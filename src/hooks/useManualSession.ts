import { useEffect, useState, Dispatch, SetStateAction, FormEvent } from "react";
import { safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";
import { FocusTask, LedgerData } from "../types/ledger";

interface UseManualSessionParams {
  tasks: FocusTask[];
  selectedDate: string;
  setData: Dispatch<SetStateAction<LedgerData>>;
  soundEnabled?: boolean;
}

export const useManualSession = ({
  tasks,
  selectedDate,
  setData,
  soundEnabled = true,
}: UseManualSessionParams) => {
  const [manualTaskId, setManualTaskId] = useState<string>("");
  const [manualMinutes, setManualMinutes] = useState<number | string>(25);
  const [manualNote, setManualNote] = useState("");

  useEffect(() => {
    if (tasks.length && !tasks.some((task) => task.id === manualTaskId)) {
      setManualTaskId(tasks[0].id);
    } else if (!tasks.length && manualTaskId) {
      setManualTaskId("");
    }
  }, [manualTaskId, tasks]);

  const addManualSession = (event: FormEvent) => {
    event.preventDefault();
    if (!manualTaskId || !selectedDate) return;

    const minutes = Number(manualMinutes);
    if (!minutes || minutes < 1) return;

    playTacticalSound("complete", soundEnabled);

    setData((current) => ({
      ...current,
      sessions: [
        {
          id: safeId(),
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
