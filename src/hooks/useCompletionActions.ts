import { Dispatch, SetStateAction } from "react";
import { deleteCompletionApi } from "../apiClient";
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

    deleteCompletionApi(taskId, date).catch((err) => {
      console.error("Failed to delete completion on backend:", err);
      setSyncState("Cloud error");
    });
  };

  return { markCompletion, removeCompletion };
};
