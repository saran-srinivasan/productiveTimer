import React from "react";
import { PersonalRecordItemDto } from "../../types/api";

interface ExerciseProgressionCardProps {
  pr: PersonalRecordItemDto;
  onOpenHistory?: (exerciseName: string) => void;
}

export const ExerciseProgressionCard: React.FC<ExerciseProgressionCardProps> = ({
  pr,
  onOpenHistory,
}) => {
  return (
    <div
      role="article"
      aria-label={`PR card for ${pr.exercise_name}`}
      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md backdrop-blur-md flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h4 className="font-bold text-slate-100 text-sm">{pr.exercise_name}</h4>
          </div>
          {onOpenHistory && (
            <button
              type="button"
              onClick={() => onOpenHistory(pr.exercise_name)}
              className="text-[11px] font-semibold px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors"
            >
              Trend 📈
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Heaviest Load
            </div>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {pr.heaviest_weight !== undefined && pr.heaviest_weight !== null
                ? `${pr.heaviest_weight} kg`
                : "—"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Est. 1RM (Brzycki)
            </div>
            <div className="text-base font-black text-amber-400 font-mono mt-0.5">
              {pr.estimated_1rm !== undefined && pr.estimated_1rm !== null
                ? `${pr.estimated_1rm.toFixed(1)} kg`
                : "—"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Max Reps Set
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
              {pr.max_reps !== undefined && pr.max_reps !== null ? `${pr.max_reps} reps` : "—"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Max Set Volume
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
              {pr.max_volume_set !== undefined && pr.max_volume_set !== null
                ? `${pr.max_volume_set.toLocaleString()} kg`
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
