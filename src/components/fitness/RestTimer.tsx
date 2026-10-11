import React from "react";
import { formatClock } from "../../utils/format";

interface RestTimerProps {
  secondsLeft: number | null;
  totalSeconds: number;
  onStop: () => void;
  onAdjust?: (deltaSeconds: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  secondsLeft,
  totalSeconds,
  onStop,
  onAdjust,
}) => {
  if (secondsLeft === null || secondsLeft <= 0) {
    return null;
  }

  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100),
  );

  return (
    <div
      role="region"
      aria-label="Rest timer"
      className="rest-timer-banner flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-950/40 backdrop-blur-md shadow-lg animate-pulse-subtle"
      style={{
        border: "1px solid rgba(245, 158, 11, 0.4)",
        background: "linear-gradient(135deg, rgba(30, 27, 20, 0.95), rgba(45, 30, 15, 0.9))",
        boxShadow: "0 8px 32px rgba(245, 158, 11, 0.15)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-bold text-lg border border-amber-500/40">
          <span>⏱️</span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-amber-400/80">
            Rest Interval
          </div>
          <div className="text-2xl font-black tracking-tight text-amber-100 font-mono">
            {formatClock(secondsLeft)}
            <span className="text-xs font-normal text-amber-300/60 ml-2">
              / {formatClock(totalSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 max-w-xs hidden sm:block">
        <div className="w-full bg-amber-950/80 rounded-full h-2.5 overflow-hidden border border-amber-500/20">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-300 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {onAdjust && (
          <>
            <button
              type="button"
              onClick={() => onAdjust(-15)}
              className="px-2.5 py-1 text-xs rounded font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
              title="Minus 15 seconds"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => onAdjust(15)}
              className="px-2.5 py-1 text-xs rounded font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
              title="Add 15 seconds"
            >
              +15s
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onStop}
          className="px-3 py-1 text-xs rounded font-semibold bg-red-600/80 hover:bg-red-500 text-white transition-colors"
        >
          Skip Rest
        </button>
      </div>
    </div>
  );
};
