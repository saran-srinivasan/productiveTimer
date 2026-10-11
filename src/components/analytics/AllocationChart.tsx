import React, { useState } from "react";
import { formatDuration } from "../../utils/format";
import { AllocationSlice } from "../../hooks/useAnalytics";

interface AllocationChartProps {
  byProject: AllocationSlice[];
  byLane: AllocationSlice[];
  byGoal: AllocationSlice[];
  byTimeOfDay: AllocationSlice[];
  totalSeconds: number;
}

export const AllocationChart: React.FC<AllocationChartProps> = ({
  byProject,
  byLane,
  byGoal,
  byTimeOfDay,
  totalSeconds,
}) => {
  const [activeDimension, setActiveDimension] = useState<
    "project" | "lane" | "goal" | "tod"
  >("project");

  let currentSlices: AllocationSlice[] = [];
  if (activeDimension === "project") currentSlices = byProject;
  else if (activeDimension === "lane") currentSlices = byLane;
  else if (activeDimension === "goal") currentSlices = byGoal;
  else if (activeDimension === "tod") currentSlices = byTimeOfDay;

  return (
    <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div>
          <span className="eyebrow">// TEL.03 // MULTI-DIMENSIONAL ALLOCATION</span>
          <h3 style={{ fontSize: "1.05rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
            Time Investment Breakdown
          </h3>
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--panel-recessed)", padding: "3px", borderRadius: "var(--radius-sm)" }}>
          <button
            type="button"
            onClick={() => setActiveDimension("project")}
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              background: activeDimension === "project" ? "var(--panel-elevated)" : "transparent",
              color: activeDimension === "project" ? "var(--volt-lime)" : "var(--ink-secondary)",
              borderRadius: "var(--radius-xs)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Project
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("lane")}
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              background: activeDimension === "lane" ? "var(--panel-elevated)" : "transparent",
              color: activeDimension === "lane" ? "var(--volt-lime)" : "var(--ink-secondary)",
              borderRadius: "var(--radius-xs)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Lane
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("goal")}
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              background: activeDimension === "goal" ? "var(--panel-elevated)" : "transparent",
              color: activeDimension === "goal" ? "var(--volt-lime)" : "var(--ink-secondary)",
              borderRadius: "var(--radius-xs)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Goal
          </button>
          <button
            type="button"
            onClick={() => setActiveDimension("tod")}
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              background: activeDimension === "tod" ? "var(--panel-elevated)" : "transparent",
              color: activeDimension === "tod" ? "var(--volt-lime)" : "var(--ink-secondary)",
              borderRadius: "var(--radius-xs)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Time-of-Day
          </button>
        </div>
      </div>

      {/* Segmented Cumulative Bar */}
      {totalSeconds > 0 && currentSlices.length > 0 && (
        <div
          style={{
            height: "12px",
            display: "flex",
            borderRadius: "4px",
            overflow: "hidden",
            background: "var(--panel-recessed)",
            marginBottom: "16px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
          }}
          title={`Total Duration: ${formatDuration(totalSeconds)}`}
        >
          {currentSlices.map((slice) => {
            const widthPct = Math.max(1, (slice.seconds / totalSeconds) * 100);
            return (
              <div
                key={slice.id}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: slice.color,
                  height: "100%",
                }}
                title={`${slice.label}: ${slice.percentage}% (${formatDuration(slice.seconds)})`}
              />
            );
          })}
        </div>
      )}

      {/* Slice Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {currentSlices.length > 0 ? (
          currentSlices.map((slice) => {
            const widthPct = totalSeconds > 0 ? (slice.seconds / totalSeconds) * 100 : 0;
            return (
              <div
                key={slice.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 auto", minWidth: 0 }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "2px",
                      background: slice.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "var(--ink-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "200px",
                    }}
                    title={slice.label}
                  >
                    {slice.label}
                  </span>
                </div>

                <div style={{ flex: "1 1 120px", maxWidth: "200px", height: "6px", background: "var(--panel-recessed)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, widthPct)}%`,
                      height: "100%",
                      background: slice.color,
                    }}
                  />
                </div>

                <div style={{ textAlign: "right", minWidth: "90px" }}>
                  <strong style={{ color: "var(--ink-pure)", marginRight: "6px" }}>
                    {formatDuration(slice.seconds)}
                  </strong>
                  <span style={{ color: "var(--ink-secondary)", fontSize: "0.72rem" }}>
                    {slice.percentage}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="empty-state" style={{ padding: "16px 0", textAlign: "center" }}>
            [NO TIME LOGS RECORDED IN SELECTED RANGE]
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: "14px",
          paddingTop: "10px",
          borderTop: "1px dashed var(--milled-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-secondary)",
        }}
      >
        <span>TOTAL MEASURED:</span>
        <strong style={{ color: "var(--volt-lime)", fontSize: "0.85rem" }}>
          {formatDuration(totalSeconds)}
        </strong>
      </div>
    </div>
  );
};
