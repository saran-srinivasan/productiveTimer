import { isSupabaseConfigured, supabase } from "../supabaseClient";

export const useCompletionActions = ({ setData, setSyncState }) => {
  const markCompletion = ({ taskId, date }) => {
    if (!taskId || !date) return;

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
            id: crypto.randomUUID(),
            taskId,
            date,
            createdAt: new Date().toISOString(),
          },
          ...current.completions,
        ],
      };
    });
  };

  const removeCompletion = ({ taskId, date }) => {
    if (!taskId || !date) return;

    setData((current) => ({
      ...current,
      completions: current.completions.filter(
        (completion) => completion.taskId !== taskId || completion.date !== date,
      ),
    }));

    if (isSupabaseConfigured) {
      supabase
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
