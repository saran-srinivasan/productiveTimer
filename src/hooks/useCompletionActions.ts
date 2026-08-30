import { Dispatch, SetStateAction } from "react";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { safeId } from "../utils/ledger";
import { playTacticalSound } from "../utils/sound";
import { LedgerData, SyncState } from "../types/ledger";

interface UseCompletionActionsParams {
  setData: Dispatch<SetStateAction<LedgerData>>;
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  soundEnabled?: boolean;
}

export const useCompletionActions = ({
  setData,
  setSyncState,
  soundEnabled = true,
}: UseCompletionActionsParams) => {
  const markCompletion = ({ taskId, date }: { taskId: string; date: string }) => {
    if (!taskId || !date) return;

    playTacticalSound("complete", soundEnabled);

    setData((current) => {
      if (
        current.completions.some(
          (completion) => completion.taskId === taskId && completion.date === date,
        )
      ) {
        return current;
      }

      return {
        ...current,
        completions: [
          {
            id: safeId(),
            taskId,
            date,
            createdAt: new Date().toISOString(),
          },
          ...current.completions,
        ],
      };
    });
  };

  const removeCompletion = ({ taskId, date }: { taskId: string; date: string }) => {
    if (!taskId || !date) return;

    playTacticalSound("click", soundEnabled);

    setData((current) => ({
      ...current,
      completions: current.completions.filter(
        (completion) => completion.taskId !== taskId || completion.date !== date,
      ),
    }));

    const client = supabase;
    if (isSupabaseConfigured && client) {
      client
        .from("task_completions")
        .delete()
        .eq("task_id", taskId)
        .eq("completion_date", date)
        .then(({ error }) => {
          if (error) setSyncState("Cloud error");
        });
    }
  };

  return { markCompletion, removeCompletion };
};
