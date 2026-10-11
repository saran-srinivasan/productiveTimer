import React, { useState } from "react";
import { GoalWithMilestonesDto, GoalMilestoneDto, ProjectDto } from "../../types/api";

interface GoalProgressCardProps {
  goal: GoalWithMilestonesDto;
  projects?: ProjectDto[];
  onUpdateGoal: (goal: GoalWithMilestonesDto) => void;
  onDeleteGoal: (id: string) => void;
  onAddMilestone: (goalId: string, title: string, targetDate?: string) => Promise<void>;
  onToggleMilestone: (goalId: string, milestone: GoalMilestoneDto) => Promise<void>;
  onDeleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  goal,
  projects = [],
  onUpdateGoal,
  onDeleteGoal,
  onAddMilestone,
  onToggleMilestone,
  onDeleteMilestone,
}) => {
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [adding, setAdding] = useState(false);

  const project = projects.find((p) => p.id === goal.project_id);

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case "time":
        return "var(--volt-lime)";
      case "consistency":
        return "var(--chrono-cyan)";
      case "outcome":
        return "var(--phosphor-amber)";
      case "training":
        return "var(--hazard-orange)";
      case "habit":
      default:
        return "var(--signal-green)";
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    try {
      setAdding(true);
      await onAddMilestone(goal.id, newMilestoneTitle.trim(), newMilestoneDate || undefined);
      setNewMilestoneTitle("");
      setNewMilestoneDate("");
      setShowAddMilestone(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className="panel-module"
      style={{
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        borderRadius: "var(--radius-md)",
        background: "var(--panel-module)",
        border: "1px solid var(--milled-border)",
        borderLeft: `4px solid ${getGoalTypeColor(goal.goal_type)}`,
        boxShadow: "var(--shadow-bevel)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                padding: "0.15rem 0.45rem",
                borderRadius: "var(--radius-xs)",
                fontWeight: 800,
                color: getGoalTypeColor(goal.goal_type),
                background: "rgba(0, 0, 0, 0.4)",
                border: `1px solid ${getGoalTypeColor(goal.goal_type)}`,
              }}
            >
              {goal.goal_type}
            </span>

            {project && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: project.color || "var(--ink-secondary)",
                  background: "var(--panel-recessed)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--milled-border)",
                }}
              >
                📁 {project.name}
              </span>
            )}
          </div>

          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--ink-pure)" }}>{goal.title}</h3>
        </div>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            fontWeight: 700,
            color: goal.status === "completed" ? "var(--signal-green)" : "var(--ink-secondary)",
            background: "var(--panel-recessed)",
            padding: "0.2rem 0.5rem",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--milled-border)",
          }}
        >
          {goal.status}
        </span>
      </div>

      {/* Progress Metric & Gauge */}
      <div
        style={{
          background: "var(--panel-recessed)",
          padding: "0.85rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--milled-border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
              {typeof goal.current_value === "number" ? goal.current_value.toFixed(1) : goal.current_value}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)", margin: "0 0.35rem" }}>/</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-primary)", fontFamily: "var(--font-mono)" }}>
              {goal.target_value} {goal.unit}
            </span>
          </div>

          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink-pure)", fontFamily: "var(--font-mono)" }}>
            {goal.progress_percentage.toFixed(0)}%
          </span>
        </div>

        {/* High contrast gauge */}
        <div
          style={{
            height: "8px",
            background: "rgba(0, 0, 0, 0.6)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
            border: "1px solid var(--milled-border)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${goal.progress_percentage}%`,
              background: getGoalTypeColor(goal.goal_type),
              boxShadow: `0 0 10px ${getGoalTypeColor(goal.goal_type)}`,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Date range */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          <span>FROM: {goal.start_date}</span>
          <span>TARGET: {goal.target_date}</span>
        </div>
      </div>

      {/* Milestones Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
            Milestones ({goal.milestones.filter((m) => m.status === "completed").length}/{goal.milestones.length})
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAddMilestone(!showAddMilestone)}
            style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}
          >
            {showAddMilestone ? "Cancel" : "+ Milestone"}
          </button>
        </div>

        {/* Add Milestone Inline Form */}
        {showAddMilestone && (
          <form onSubmit={handleCreateMilestone} style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
            <input
              type="text"
              required
              placeholder="Milestone deliverable..."
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              style={{
                flex: 1,
                background: "var(--panel-recessed)",
                border: "1px solid var(--milled-border)",
                color: "var(--ink-pure)",
                padding: "0.35rem 0.5rem",
                borderRadius: "var(--radius-xs)",
                fontSize: "0.8rem",
              }}
            />
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(e) => setNewMilestoneDate(e.target.value)}
              style={{
                background: "var(--panel-recessed)",
                border: "1px solid var(--milled-border)",
                color: "var(--ink-pure)",
                padding: "0.35rem 0.5rem",
                borderRadius: "var(--radius-xs)",
                fontSize: "0.75rem",
              }}
            />
            <button
              type="submit"
              disabled={adding}
              className="btn btn-primary"
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", background: "var(--volt-lime)", color: "var(--chassis-base)" }}
            >
              Add
            </button>
          </form>
        )}

        {/* Milestones list */}
        {goal.milestones.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {goal.milestones.map((m) => {
              const isDone = m.status === "completed";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.4rem 0.6rem",
                    background: "var(--panel-recessed)",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--milled-border)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => onToggleMilestone(goal.id, m)}
                      style={{ cursor: "pointer", accentColor: "var(--signal-green)" }}
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: isDone ? "var(--ink-secondary)" : "var(--ink-pure)",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {m.title}
                    </span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {m.target_date && (
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
                        {m.target_date}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMilestone(goal.id, m.id)}
                      style={{ background: "transparent", border: "none", color: "var(--stamp-crimson)", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ink-muted)", fontStyle: "italic" }}>
            No milestones defined. Break this goal into concrete checkpoints above.
          </p>
        )}
      </div>

      {/* Card Footer Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem", borderTop: "1px solid var(--milled-border)", paddingTop: "0.5rem" }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          onClick={() => onUpdateGoal(goal)}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-danger"
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          onClick={() => onDeleteGoal(goal.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
};
