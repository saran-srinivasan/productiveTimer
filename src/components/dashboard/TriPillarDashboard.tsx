import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  fetchPlannedBlocksApi,
  updatePlannedBlockApi,
  fetchActionTasksApi,
  updateActionTaskApi,
  fetchGoalsApi,
  fetchHabitsApi,
  fetchDailyReviewApi,
} from "../../apiClient";
import {
  PlannedBlockWithTaskDto,
  ActionTaskDto,
  GoalWithMilestonesDto,
  HabitWithHistoryDto,
  DailyReviewDto,
} from "../../types/api";
import { useLedgerContext } from "../../context/LedgerContext";
import { formatDuration } from "../../utils/format";
import { todayKey } from "../../utils/date";
import { AdaptivePlanModal } from "../planner/AdaptivePlanModal";

interface TriPillarDashboardProps {
  onOpenQuickCapture?: () => void;
}

export const TriPillarDashboard: React.FC<TriPillarDashboardProps> = ({
  onOpenQuickCapture,
}) => {
  const { stats, taskActions, data } = useLedgerContext();
  const today = todayKey();

  // State
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedBlockWithTaskDto[]>([]);
  const [tasks, setTasks] = useState<ActionTaskDto[]>([]);
  const [goals, setGoals] = useState<GoalWithMilestonesDto[]>([]);
  const [habits, setHabits] = useState<HabitWithHistoryDto[]>([]);
  const [dailyReview, setDailyReview] = useState<DailyReviewDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adaptiveModalOpen, setAdaptiveModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [blocksRes, tasksRes, goalsRes, habitsRes, reviewRes] = await Promise.all([
        fetchPlannedBlocksApi({ date: today }).catch(() => []),
        fetchActionTasksApi().catch(() => []),
        fetchGoalsApi().catch(() => []),
        fetchHabitsApi().catch(() => []),
        fetchDailyReviewApi(today).catch(() => null),
      ]);
      setPlannedBlocks(blocksRes);
      setTasks(tasksRes);
      setGoals(goalsRes);
      setHabits(habitsRes);
      setDailyReview(reviewRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [today]);

  // Pillar 1 Calculations: "WHAT MATTERS TODAY"
  const todayTasks = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "archived") return false;
    return t.due_at === today || t.priority === "urgent" || t.priority === "high";
  });

  const handleToggleTask = async (taskId: string) => {
    try {
      await updateActionTaskApi(taskId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      await loadData();
    } catch (err: any) {
      alert("Failed to complete task: " + err.message);
    }
  };

  const handleToggleBlock = async (block: PlannedBlockWithTaskDto) => {
    try {
      const nextStatus = block.status === "completed" ? "planned" : "completed";
      await updatePlannedBlockApi(block.id, { status: nextStatus });
      await loadData();
    } catch (err: any) {
      alert("Failed to update block: " + err.message);
    }
  };

  // Pillar 2 Calculations: "HOW AM I DOING?"
  const plannedSecondsToday = plannedBlocks.reduce((acc, b) => {
    const [sh, sm] = b.start_at.split(":").map(Number);
    const [eh, em] = b.end_at.split(":").map(Number);
    const durationMin = Math.max(0, eh * 60 + em - (sh * 60 + sm));
    return acc + durationMin * 60;
  }, 0);

  const actualSecondsToday = stats.todaySeconds;
  const plannedVsActualPct =
    plannedSecondsToday > 0
      ? Math.round((actualSecondsToday / plannedSecondsToday) * 100)
      : 100;

  const completedHabitsToday = habits.filter((h) =>
    h.recent_dates?.includes(today),
  ).length;
  const activeHabitsTotal = habits.filter((h) => h.active).length;

  const completedTasksTodayCount = tasks.filter(
    (t) => t.status === "completed" && t.completed_at?.startsWith(today),
  ).length;

  const activeGoals = goals.filter((g) => g.status === "in_progress").slice(0, 3);

  // Pillar 3 Calculations: "WHAT NEEDS ATTENTION?"
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "archived") return false;
    return Boolean(t.due_at && t.due_at < today);
  });

  const slippingGoals = goals.filter((g) => {
    if (g.status !== "in_progress") return false;
    if (!g.target_date) return false;
    const daysLeft = Math.ceil(
      (new Date(g.target_date).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const pct = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
    return daysLeft >= 0 && daysLeft <= 7 && pct < 70;
  });

  const handleRescheduleOverdue = async (taskId: string) => {
    try {
      await updateActionTaskApi(taskId, { due_at: today });
      await loadData();
    } catch (err: any) {
      alert("Failed to reschedule task: " + err.message);
    }
  };

  return (
    <section className="tri-pillar-dashboard" style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span className="eyebrow">// TEL.01 // TRI-PILLAR COMMAND MATRIX</span>
          <h2 style={{ fontSize: "1.3rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
            Operational Command Center
          </h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            id="open-adaptive-plan-modal-btn"
            onClick={() => setAdaptiveModalOpen(true)}
            style={{
              padding: "6px 12px",
              background: "var(--panel-module)",
              color: "var(--volt-lime)",
              border: "1px solid var(--volt-lime)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ⚡ Auto-Plan Day
          </button>
          <button
            type="button"
            onClick={loadData}
            title="Refresh command center telemetry"
            style={{
              padding: "6px 10px",
              background: "var(--panel-recessed)",
              border: "1px solid var(--milled-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--ink-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            🔄 Sync Matrix
          </button>
        </div>
      </div>

      <div
        className="tri-pillar-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
        }}
      >
        {/* ========================================================= */}
        {/* PILLAR 1: WHAT MATTERS TODAY? */}
        {/* ========================================================= */}
        <div
          className="pillar-card glass-panel"
          style={{
            padding: "18px",
            borderRadius: "var(--radius-md)",
            borderTop: "3px solid var(--chrono-cyan)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--chrono-cyan)" }}>
                // PILLAR 01 // FOCUS DIRECTIVE
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "1.1rem", color: "var(--ink-pure)" }}>
                What Matters Today
              </h3>
            </div>
            <Link
              to="/planner"
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                color: "var(--chrono-cyan)",
                textDecoration: "none",
              }}
            >
              [Day Planner →]
            </Link>
          </div>

          {/* Today's Planned Time Blocks */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                TODAY'S SCHEDULED BLOCKS ({plannedBlocks.length})
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {plannedBlocks.length > 0 ? (
                plannedBlocks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={b.status === "completed"}
                        onChange={() => handleToggleBlock(b)}
                        style={{ cursor: "pointer", accentColor: "var(--signal-green)" }}
                        title="Toggle block completion"
                      />
                      <span
                        style={{
                          color: b.status === "completed" ? "var(--ink-muted)" : "var(--ink-pure)",
                          textDecoration: b.status === "completed" ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.task_title || "(Free Block)"}
                      </span>
                    </div>
                    <span style={{ color: "var(--chrono-cyan)", fontWeight: 700, flexShrink: 0 }}>
                      {b.start_at} - {b.end_at}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "10px",
                    background: "var(--panel-recessed)",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "0.72rem",
                    color: "var(--ink-secondary)",
                    fontFamily: "var(--font-mono)",
                    textAlign: "center",
                  }}
                >
                  No time blocks scheduled today.{" "}
                  <button
                    type="button"
                    onClick={() => setAdaptiveModalOpen(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--volt-lime)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                    }}
                  >
                    Auto-Generate →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* High Priority & Due Today Tasks */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                HIGH-PRIORITY & DUE TODAY ({todayTasks.length})
              </span>
              <Link
                to="/tasks"
                style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textDecoration: "none" }}
              >
                View all tasks →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {todayTasks.length > 0 ? (
                todayTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={t.status === "completed"}
                        onChange={() => handleToggleTask(t.id)}
                        style={{ cursor: "pointer", accentColor: "var(--signal-green)" }}
                        title="Mark complete"
                      />
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontFamily: "var(--font-mono)",
                          padding: "1px 4px",
                          borderRadius: "2px",
                          background:
                            t.priority === "urgent"
                              ? "var(--stamp-crimson)"
                              : t.priority === "high"
                              ? "var(--hazard-orange)"
                              : "var(--panel-elevated)",
                          color: "#fff",
                        }}
                      >
                        {t.priority}
                      </span>
                      <span
                        style={{
                          color: "var(--ink-pure)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {t.estimate_minutes ? (
                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                          {t.estimate_minutes}m
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const laneId = t.focus_task_id || data?.tasks?.[0]?.id;
                          if (laneId) taskActions.startTask(laneId);
                        }}
                        title="Start timer for this task"
                        style={{
                          padding: "2px 6px",
                          background: "var(--volt-lime)",
                          color: "#0a0d13",
                          border: "none",
                          borderRadius: "2px",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                        }}
                      >
                        ▶ Focus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state" style={{ padding: "8px 0", fontSize: "0.72rem" }}>
                  [NO CRITICAL DEADLINES PENDING TODAY]
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PILLAR 2: HOW AM I DOING? */}
        {/* ========================================================= */}
        <div
          className="pillar-card glass-panel"
          style={{
            padding: "18px",
            borderRadius: "var(--radius-md)",
            borderTop: "3px solid var(--volt-lime)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--volt-lime)" }}>
                // PILLAR 02 // PERFORMANCE TELEMETRY
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "1.1rem", color: "var(--ink-pure)" }}>
                How Am I Doing?
              </h3>
            </div>
            <Link
              to="/goals"
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                color: "var(--volt-lime)",
                textDecoration: "none",
              }}
            >
              [Goals Hub →]
            </Link>
          </div>

          {/* Planned vs Actual Focus Progress */}
          <div
            style={{
              background: "var(--panel-recessed)",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--milled-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                PLANNED VS ACTUAL FOCUS TODAY
              </span>
              <strong style={{ fontSize: "0.85rem", color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
                {formatDuration(actualSecondsToday)} / {formatDuration(plannedSecondsToday)}
              </strong>
            </div>

            <div style={{ height: "8px", background: "var(--panel-module)", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
              <div
                style={{
                  width: `${Math.min(100, plannedVsActualPct)}%`,
                  height: "100%",
                  background: "var(--volt-lime)",
                  boxShadow: "0 0 8px var(--volt-glow)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              <span>Delivery: {plannedVsActualPct}%</span>
              <span>Streak: 🔥 {stats.currentStreak} Days</span>
            </div>
          </div>

          {/* Performance Scorecard Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            <div className="metric-card" style={{ padding: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "0.62rem" }}>Habits Today</span>
              <strong style={{ fontSize: "1rem", color: "var(--signal-green)" }}>
                {completedHabitsToday} / {activeHabitsTotal}
              </strong>
            </div>
            <div className="metric-card" style={{ padding: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "0.62rem" }}>Tasks Done</span>
              <strong style={{ fontSize: "1rem", color: "var(--chrono-cyan)" }}>
                {completedTasksTodayCount}
              </strong>
            </div>
            <div className="metric-card" style={{ padding: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "0.62rem" }}>7D Volume</span>
              <strong style={{ fontSize: "0.85rem", color: "var(--ink-pure)" }}>
                {formatDuration(stats.weekSeconds)}
              </strong>
            </div>
          </div>

          {/* Active Goals Snapshot */}
          <div>
            <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", display: "block", marginBottom: "6px" }}>
              ACTIVE GOAL MOMENTUM:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeGoals.length > 0 ? (
                activeGoals.map((g) => {
                  const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
                  return (
                    <div key={g.id} style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ color: "var(--ink-pure)" }}>{g.title}</span>
                        <span style={{ color: "var(--volt-lime)" }}>
                          {g.current_value} / {g.target_value} {g.unit} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: "4px", background: "var(--panel-recessed)", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            height: "100%",
                            background: "var(--volt-lime)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty-state" style={{ padding: "8px 0", fontSize: "0.72rem" }}>
                  [NO ACTIVE GOALS TRACKED]
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PILLAR 3: WHAT NEEDS ATTENTION? */}
        {/* ========================================================= */}
        <div
          className="pillar-card glass-panel"
          style={{
            padding: "18px",
            borderRadius: "var(--radius-md)",
            borderTop: "3px solid var(--stamp-crimson)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--stamp-crimson)" }}>
                // PILLAR 03 // ACTION REQUIRED
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "1.1rem", color: "var(--ink-pure)" }}>
                What Needs Attention
              </h3>
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                color: overdueTasks.length + slippingGoals.length > 0 ? "var(--stamp-crimson)" : "var(--signal-green)",
              }}
            >
              {overdueTasks.length + slippingGoals.length} ALERTS
            </span>
          </div>

          {/* Overdue Tasks List */}
          <div>
            <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", display: "block", marginBottom: "6px" }}>
              OVERDUE TASKS ({overdueTasks.length}):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {overdueTasks.length > 0 ? (
                overdueTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "rgba(255, 23, 68, 0.08)",
                      border: "1px solid rgba(255, 23, 68, 0.3)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ color: "var(--stamp-crimson)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </strong>
                      <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                        Due: {t.due_at}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRescheduleOverdue(t.id)}
                      title="Move deadline to today"
                      style={{
                        padding: "2px 6px",
                        background: "var(--panel-module)",
                        color: "var(--ink-primary)",
                        border: "1px solid var(--milled-border)",
                        borderRadius: "2px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      → Today
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "8px 10px",
                    background: "var(--panel-recessed)",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--signal-green)",
                  }}
                >
                  ✓ Zero overdue tasks. All deadlines clear.
                </div>
              )}
            </div>
          </div>

          {/* Slipping Goals List */}
          <div>
            <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", display: "block", marginBottom: "6px" }}>
              SLIPPING GOALS ({slippingGoals.length}):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {slippingGoals.length > 0 ? (
                slippingGoals.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: "8px 10px",
                      background: "rgba(255, 171, 0, 0.08)",
                      border: "1px solid rgba(255, 171, 0, 0.3)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <strong style={{ color: "var(--phosphor-amber)", display: "block" }}>
                      ⚠️ {g.title}
                    </strong>
                    <span style={{ fontSize: "0.68rem", color: "var(--ink-secondary)" }}>
                      Target deadline: {g.target_date} (Pace: {Math.round((g.current_value / g.target_value) * 100)}%)
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "8px 10px",
                    background: "var(--panel-recessed)",
                    borderRadius: "var(--radius-xs)",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--signal-green)",
                  }}
                >
                  ✓ All active goals progressing on schedule.
                </div>
              )}
            </div>
          </div>

          {/* Daily Review Reminder */}
          <div
            style={{
              padding: "10px",
              background: "var(--panel-recessed)",
              border: "1px solid var(--milled-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--ink-secondary)" }}>DAILY REVIEW:</span>
              <strong style={{ color: dailyReview ? "var(--signal-green)" : "var(--phosphor-amber)" }}>
                {dailyReview ? "✓ COMPLETED" : "⏳ PENDING"}
              </strong>
            </div>
            {!dailyReview && (
              <span style={{ display: "block", fontSize: "0.68rem", color: "var(--ink-muted)", marginTop: "4px" }}>
                Complete guided evening reflection in Habit Matrix to record energy & focus ratings.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Adaptive Plan Modal */}
      <AdaptivePlanModal
        isOpen={adaptiveModalOpen}
        onClose={() => setAdaptiveModalOpen(false)}
        date={today}
        tasks={tasks}
        existingBlocks={plannedBlocks}
        onPlanApplied={loadData}
      />
    </section>
  );
};
