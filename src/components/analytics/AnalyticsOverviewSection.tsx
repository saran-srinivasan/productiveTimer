import React, { useState, useEffect } from "react";
import { useLedgerContext } from "../../context/LedgerContext";
import { useAnalytics, AnalyticsTimeRange } from "../../hooks/useAnalytics";
import { AllocationChart } from "./AllocationChart";
import { EstimationAccuracyCard } from "./EstimationAccuracyCard";
import { TaskSlippageCard } from "./TaskSlippageCard";
import { InsightsPanel } from "./InsightsPanel";
import {
  fetchActionTasksApi,
  fetchProjectsApi,
  fetchGoalsApi,
  fetchPlannedBlocksApi,
} from "../../apiClient";
import {
  ActionTaskDto,
  ProjectSummaryDto,
  GoalWithMilestonesDto,
  PlannedBlockWithTaskDto,
} from "../../types/api";

export const AnalyticsOverviewSection: React.FC = () => {
  const { data } = useLedgerContext();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("7d");
  const [tasks, setTasks] = useState<ActionTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [goals, setGoals] = useState<GoalWithMilestonesDto[]>([]);
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedBlockWithTaskDto[]>([]);

  useEffect(() => {
    Promise.all([
      fetchActionTasksApi().catch(() => []),
      fetchProjectsApi().catch(() => []),
      fetchGoalsApi().catch(() => []),
      fetchPlannedBlocksApi().catch(() => []),
    ]).then(([t, p, g, pb]) => {
      setTasks(t);
      setProjects(p);
      setGoals(g);
      setPlannedBlocks(pb);
    });
  }, []);

  const analytics = useAnalytics({
    sessions: data.sessions,
    lanes: data.tasks,
    tasks,
    projects,
    goals,
    plannedBlocks,
    timeRange,
  });

  return (
    <section className="analytics-overview-section" style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <span className="eyebrow">// TEL.04 // PRODUCTIVITY INTELLIGENCE</span>
          <h2 style={{ fontSize: "1.25rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
            Telemetry & Intelligence Matrix
          </h2>
        </div>

        {/* Time Range Pills */}
        <div style={{ display: "flex", gap: "4px", background: "var(--panel-module)", padding: "3px", borderRadius: "var(--radius-sm)", border: "1px solid var(--milled-border)" }}>
          {(["7d", "30d", "all"] as AnalyticsTimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              style={{
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                background: timeRange === r ? "var(--volt-lime)" : "transparent",
                color: timeRange === r ? "#0a0d13" : "var(--ink-secondary)",
                fontWeight: timeRange === r ? 800 : 500,
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Multi-Dimensional Allocation Chart */}
        <AllocationChart
          byProject={analytics.byProject}
          byLane={analytics.byLane}
          byGoal={analytics.byGoal}
          byTimeOfDay={analytics.byTimeOfDay}
          totalSeconds={analytics.totalSeconds}
        />

        {/* 2-column Estimation & Slippage Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          <EstimationAccuracyCard data={analytics.estimation} />
          <TaskSlippageCard data={analytics.slippage} />
        </div>

        {/* Deterministic Insights Panel */}
        <InsightsPanel />
      </div>
    </section>
  );
};
