import React, { useEffect, useState } from "react";
import { ExerciseProgressionDataDto } from "../../types/api";
import { fetchExerciseProgressionApi } from "../../apiClient";

interface ExerciseHistoryModalProps {
  exerciseName: string;
  onClose: () => void;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  exerciseName,
  onClose,
}) => {
  const [data, setData] = useState<ExerciseProgressionDataDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMetric, setActiveMetric] = useState<"weight" | "estimated_1rm" | "volume">("estimated_1rm");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchExerciseProgressionApi(exerciseName);
        if (active) setData(res);
      } catch (err) {
        console.error("Failed to load progression:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [exerciseName]);

  const history = data?.history ?? [];
  const records = data?.records;

  // Compute SVG chart coordinates
  const values = history.map((pt) => {
    if (activeMetric === "weight") return pt.weight;
    if (activeMetric === "estimated_1rm") return pt.estimated_1rm;
    return pt.volume;
  });

  const minVal = values.length > 0 ? Math.min(...values) * 0.9 : 0;
  const maxVal = values.length > 0 ? Math.max(...values) * 1.1 : 100;
  const range = maxVal - minVal || 1;

  const chartWidth = 560;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = history.map((pt, idx) => {
    const x =
      history.length > 1
        ? paddingX + (idx / (history.length - 1)) * (chartWidth - paddingX * 2)
        : chartWidth / 2;
    const val =
      activeMetric === "weight"
        ? pt.weight
        : activeMetric === "estimated_1rm"
          ? pt.estimated_1rm
          : pt.volume;
    const y = chartHeight - paddingY - ((val - minVal) / range) * (chartHeight - paddingY * 2);
    return { x, y, val, pt };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Longitudinal Progression
            </div>
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>📈</span> {exerciseName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-emerald-500 rounded-full" />
            <p className="mt-2 text-xs">Loading longitudinal performance data...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p>No historical logged sets found for {exerciseName} yet.</p>
          </div>
        ) : (
          <div className="overflow-y-auto pt-4 space-y-5">
            {/* PR summary row */}
            {records && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Heaviest Load
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {records.heaviest_weight ? `${records.heaviest_weight} kg` : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Peak 1RM (Brzycki)
                  </div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {records.estimated_1rm ? `${records.estimated_1rm.toFixed(1)} kg` : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Max Set Volume
                  </div>
                  <div className="text-lg font-black text-indigo-400 font-mono">
                    {records.max_volume_set
                      ? `${records.max_volume_set.toLocaleString()} kg`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Metric Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Progression Trajectory:</span>
              <div className="flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveMetric("estimated_1rm")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeMetric === "estimated_1rm"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Est. 1RM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric("weight")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeMetric === "weight"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Weight
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric("volume")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeMetric === "volume"
                      ? "bg-indigo-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Volume
                </button>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-44 overflow-visible"
              >
                {/* Horizontal grid lines */}
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={chartWidth - paddingX}
                  y2={paddingY}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                <line
                  x1={paddingX}
                  y1={chartHeight / 2}
                  x2={chartWidth - paddingX}
                  y2={chartHeight / 2}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                <line
                  x1={paddingX}
                  y1={chartHeight - paddingY}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY}
                  stroke="#334155"
                />

                {/* Y-axis labels */}
                <text
                  x={paddingX - 6}
                  y={paddingY + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                >
                  {maxVal.toFixed(0)}
                </text>
                <text
                  x={paddingX - 6}
                  y={chartHeight - paddingY + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                >
                  {minVal.toFixed(0)}
                </text>

                {/* Polyline trend */}
                {points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={
                      activeMetric === "estimated_1rm"
                        ? "#f59e0b"
                        : activeMetric === "weight"
                          ? "#10b981"
                          : "#6366f1"
                    }
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {/* Data points */}
                {points.map((p, idx) => (
                  <g key={idx} className="group">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#0f172a"
                      stroke={
                        activeMetric === "estimated_1rm"
                          ? "#f59e0b"
                          : activeMetric === "weight"
                            ? "#10b981"
                            : "#6366f1"
                      }
                      strokeWidth="2.5"
                      className="cursor-pointer hover:r-6 transition-all"
                    />
                    <title>
                      {`${p.pt.work_date} Set #${p.pt.set_number}: ${p.pt.weight}kg × ${p.pt.reps} reps (1RM: ${p.pt.estimated_1rm.toFixed(1)}kg)`}
                    </title>
                  </g>
                ))}
              </svg>
            </div>

            {/* Set History Log */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                All Recorded Sets Chronology
              </h4>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs">
                {history.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 mr-2">{pt.work_date}</span>
                      <span className="text-slate-400 font-mono">Set #{pt.set_number}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-slate-100 font-bold">
                        {pt.weight} kg × {pt.reps} reps
                      </span>
                      <span className="text-amber-400 text-[11px]">
                        1RM: {pt.estimated_1rm.toFixed(1)} kg
                      </span>
                      <span className="text-indigo-400 text-[11px]">
                        Vol: {pt.volume.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
