import React from "react";
import { EstimationAccuracyData } from "../../hooks/useAnalytics";

interface EstimationAccuracyCardProps {
  data: EstimationAccuracyData;
}

export const EstimationAccuracyCard: React.FC<EstimationAccuracyCardProps> = ({
  data,
}) => {
  const {
    totalTasksCalibrated,
    totalEstimatedMinutes,
    totalActualMinutes,
    planningBiasFactor,
    underestimatedCount,
    accurateCount,
    overestimatedCount,
    tasks,
  } = data;

  const biasColor =
    planningBiasFactor > 1.25
      ? "var(--stamp-crimson)"
      : planningBiasFactor < 0.85
      ? "var(--chrono-cyan)"
      : "var(--signal-green)";

  const biasLabel =
    planningBiasFactor > 1.25
      ? `Underestimating (+${Math.round((planningBiasFactor - 1) * 100)}% extra time needed)`
      : planningBiasFactor < 0.85
      ? `Overestimating (${Math.round((1 - planningBiasFactor) * 100)}% buffer overhead)`
      : "Well Calibrated (Within ±15% accuracy)";

  return (
    <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
      <div style={{ marginBottom: "12px" }}>
        <span className="eyebrow">// CAL.04 // ESTIMATION ACCURACY</span>
        <h3 style={{ fontSize: "1.05rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
          Planning Bias & Accuracy
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div className="metric-card" style={{ padding: "10px" }}>
          <span style={{ fontSize: "0.68rem" }}>Bias Factor</span>
          <strong style={{ color: biasColor, fontSize: "1.3rem" }}>
            {planningBiasFactor.toFixed(2)}x
          </strong>
        </div>
        <div className="metric-card" style={{ padding: "10px" }}>
          <span style={{ fontSize: "0.68rem" }}>Calibrated Tasks</span>
          <strong style={{ fontSize: "1.3rem" }}>{totalTasksCalibrated}</strong>
        </div>
        <div className="metric-card" style={{ padding: "10px" }}>
          <span style={{ fontSize: "0.68rem" }}>Total Est vs Act</span>
          <strong style={{ fontSize: "0.95rem" }}>
            {totalEstimatedMinutes}m / {totalActualMinutes}m
          </strong>
        </div>
      </div>

      <div
        style={{
          background: "var(--panel-recessed)",
          padding: "10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--milled-border)",
          marginBottom: "14px",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ color: "var(--ink-secondary)" }}>STATUS: </span>
        <strong style={{ color: biasColor }}>{biasLabel}</strong>
      </div>

      {/* Accuracy Distribution Breakdown */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <div
          style={{
            flex: 1,
            padding: "8px",
            background: "var(--panel-recessed)",
            borderRadius: "var(--radius-xs)",
            borderLeft: "3px solid var(--stamp-crimson)",
          }}
        >
          <span style={{ fontSize: "0.65rem", color: "var(--ink-secondary)", display: "block" }}>
            Underestimated
          </span>
          <strong style={{ fontSize: "0.9rem", color: "var(--ink-pure)" }}>
            {underestimatedCount}
          </strong>
        </div>
        <div
          style={{
            flex: 1,
            padding: "8px",
            background: "var(--panel-recessed)",
            borderRadius: "var(--radius-xs)",
            borderLeft: "3px solid var(--signal-green)",
          }}
        >
          <span style={{ fontSize: "0.65rem", color: "var(--ink-secondary)", display: "block" }}>
            Accurate
          </span>
          <strong style={{ fontSize: "0.9rem", color: "var(--ink-pure)" }}>
            {accurateCount}
          </strong>
        </div>
        <div
          style={{
            flex: 1,
            padding: "8px",
            background: "var(--panel-recessed)",
            borderRadius: "var(--radius-xs)",
            borderLeft: "3px solid var(--chrono-cyan)",
          }}
        >
          <span style={{ fontSize: "0.65rem", color: "var(--ink-secondary)", display: "block" }}>
            Overestimated
          </span>
          <strong style={{ fontSize: "0.9rem", color: "var(--ink-pure)" }}>
            {overestimatedCount}
          </strong>
        </div>
      </div>

      {/* Recent Calibrated Tasks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "0.68rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          RECENT COMPLETED SAMPLES:
        </span>
        {tasks.slice(0, 4).map((t) => (
          <div
            key={t.taskId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 8px",
              background: "var(--panel-recessed)",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              style={{
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--ink-primary)",
              }}
              title={t.taskTitle}
            >
              {t.taskTitle}
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ color: "var(--ink-secondary)" }}>
                Est: {t.estimatedMinutes}m | Act: {t.actualMinutes}m
              </span>
              <strong
                style={{
                  color:
                    t.status === "underestimated"
                      ? "var(--stamp-crimson)"
                      : t.status === "overestimated"
                      ? "var(--chrono-cyan)"
                      : "var(--signal-green)",
                }}
              >
                {t.ratio}x
              </strong>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="empty-state" style={{ padding: "8px 0", fontSize: "0.7rem" }}>
            [COMPLETE TASKS WITH ESTIMATES TO TRAIN BIAS MODEL]
          </p>
        )}
      </div>
    </div>
  );
};
