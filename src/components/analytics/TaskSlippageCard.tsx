import React from "react";
import { SlippageAnalyticsData } from "../../hooks/useAnalytics";

interface TaskSlippageCardProps {
  data: SlippageAnalyticsData;
}

export const TaskSlippageCard: React.FC<TaskSlippageCardProps> = ({ data }) => {
  const {
    totalPlannedBlocks,
    completedBlocksCount,
    rescheduledCount,
    skippedCount,
    slippageRatePercentage,
    overdueTasksCount,
    frequentBlockers,
  } = data;

  const slippageColor =
    slippageRatePercentage > 30
      ? "var(--stamp-crimson)"
      : slippageRatePercentage > 15
      ? "var(--phosphor-amber)"
      : "var(--signal-green)";

  return (
    <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
      <div style={{ marginBottom: "12px" }}>
        <span className="eyebrow">// TEL.05 // EXECUTION ADHERENCE</span>
        <h3 style={{ fontSize: "1.05rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
          Task Slippage & Carry-Forward
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
          <span style={{ fontSize: "0.68rem" }}>Slippage Rate</span>
          <strong style={{ color: slippageColor, fontSize: "1.3rem" }}>
            {slippageRatePercentage}%
          </strong>
        </div>
        <div className="metric-card" style={{ padding: "10px" }}>
          <span style={{ fontSize: "0.68rem" }}>Rescheduled / Skipped</span>
          <strong style={{ fontSize: "1.2rem" }}>
            {rescheduledCount} / {skippedCount}
          </strong>
        </div>
        <div className="metric-card" style={{ padding: "10px" }}>
          <span style={{ fontSize: "0.68rem" }}>Overdue Tasks</span>
          <strong
            style={{
              fontSize: "1.3rem",
              color: overdueTasksCount > 0 ? "var(--stamp-crimson)" : "var(--signal-green)",
            }}
          >
            {overdueTasksCount}
          </strong>
        </div>
      </div>

      {/* Slippage Progress Track */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.72rem",
            fontFamily: "var(--font-mono)",
            marginBottom: "6px",
          }}
        >
          <span style={{ color: "var(--ink-secondary)" }}>Planned Blocks Delivery</span>
          <span style={{ color: "var(--ink-pure)" }}>
            {completedBlocksCount} of {totalPlannedBlocks} Completed
          </span>
        </div>
        <div
          style={{
            height: "8px",
            background: "var(--panel-recessed)",
            borderRadius: "4px",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {totalPlannedBlocks > 0 ? (
            <>
              <div
                style={{
                  width: `${(completedBlocksCount / totalPlannedBlocks) * 100}%`,
                  background: "var(--signal-green)",
                }}
                title={`Completed: ${completedBlocksCount}`}
              />
              <div
                style={{
                  width: `${(rescheduledCount / totalPlannedBlocks) * 100}%`,
                  background: "var(--phosphor-amber)",
                }}
                title={`Rescheduled: ${rescheduledCount}`}
              />
              <div
                style={{
                  width: `${(skippedCount / totalPlannedBlocks) * 100}%`,
                  background: "var(--stamp-crimson)",
                }}
                title={`Skipped: ${skippedCount}`}
              />
            </>
          ) : (
            <div style={{ width: "100%", background: "var(--panel-elevated)" }} />
          )}
        </div>
      </div>

      {/* Frequent Blocker Themes */}
      <div>
        <span
          style={{
            fontSize: "0.68rem",
            color: "var(--ink-secondary)",
            fontFamily: "var(--font-mono)",
            display: "block",
            marginBottom: "6px",
          }}
        >
          RECURRING BLOCKER THEMES:
        </span>
        {frequentBlockers.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {frequentBlockers.map((b) => (
              <span
                key={b.word}
                style={{
                  padding: "3px 8px",
                  background: "rgba(255, 87, 34, 0.12)",
                  border: "1px solid rgba(255, 87, 34, 0.3)",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--hazard-orange)",
                }}
              >
                #{b.word} ({b.count})
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-state" style={{ padding: "6px 0", fontSize: "0.7rem" }}>
            [NO RECURRING BLOCKERS DETECTED IN NOTES]
          </p>
        )}
      </div>
    </div>
  );
};
