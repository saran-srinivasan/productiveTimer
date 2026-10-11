import React from "react";
import { ActionTaskDto, ProjectDto } from "../../types/api";
import { FocusTask } from "../../types/ledger";

interface TaskCardProps {
  task: ActionTaskDto;
  projects?: ProjectDto[];
  focusLanes?: FocusTask[];
  onToggleComplete: (task: ActionTaskDto) => void;
  onEdit: (task: ActionTaskDto) => void;
  onDelete: (id: string) => void;
  onSelectForTimer?: (task: ActionTaskDto) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  projects = [],
  focusLanes = [],
  onToggleComplete,
  onEdit,
  onDelete,
  onSelectForTimer,
}) => {
  const isCompleted = task.status === "completed";
  const project = projects.find((p) => p.id === task.project_id);
  const lane = focusLanes.find((l) => l.id === task.focus_task_id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "var(--stamp-crimson)";
      case "high":
        return "var(--hazard-orange)";
      case "medium":
        return "var(--phosphor-amber)";
      case "low":
      default:
        return "var(--ink-muted)";
    }
  };

  const isOverdue =
    task.due_at &&
    !isCompleted &&
    new Date(task.due_at).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <article
      className="panel-module"
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        borderRadius: "var(--radius-sm)",
        background: isCompleted ? "rgba(21, 26, 34, 0.6)" : "var(--panel-module)",
        border: `1px solid ${isCompleted ? "var(--milled-border)" : isOverdue ? "var(--stamp-crimson)" : "var(--milled-border)"}`,
        opacity: isCompleted ? 0.75 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          title={isCompleted ? "Mark incomplete" : "Mark completed"}
          style={{
            background: isCompleted ? "var(--signal-green)" : "var(--panel-recessed)",
            border: `2px solid ${isCompleted ? "var(--signal-green)" : "var(--ink-secondary)"}`,
            width: "22px",
            height: "22px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {isCompleted && (
            <span style={{ color: "#000", fontWeight: 900, fontSize: "12px" }}>✓</span>
          )}
        </button>

        {/* Title and notes */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                fontWeight: 800,
                color: getPriorityColor(task.priority),
                background: "rgba(0,0,0,0.4)",
                padding: "0.15rem 0.4rem",
                borderRadius: "var(--radius-xs)",
                border: `1px solid ${getPriorityColor(task.priority)}`,
              }}
            >
              {task.priority}
            </span>

            <h4
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: isCompleted ? "var(--ink-secondary)" : "var(--ink-pure)",
                textDecoration: isCompleted ? "line-through" : "none",
                wordBreak: "break-word",
              }}
            >
              {task.title}
            </h4>
          </div>

          {task.description ? (
            <p
              style={{
                margin: "0.3rem 0 0",
                fontSize: "0.8rem",
                color: "var(--ink-secondary)",
                lineHeight: 1.35,
              }}
            >
              {task.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meta Pills (Project, Lane, Due date, Estimate) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          alignItems: "center",
          fontSize: "0.7rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        {project && (
          <span
            style={{
              background: "var(--panel-recessed)",
              border: `1px solid ${project.color || "var(--milled-border)"}`,
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-xs)",
              color: project.color || "var(--ink-primary)",
            }}
          >
            📁 {project.name}
          </span>
        )}

        {lane && (
          <span
            style={{
              background: "var(--panel-recessed)",
              border: `1px solid ${lane.color || "var(--milled-border)"}`,
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-xs)",
              color: lane.color || "var(--ink-primary)",
            }}
          >
            ⚡ {lane.name}
          </span>
        )}

        {task.estimate_minutes ? (
          <span
            style={{
              background: "var(--panel-recessed)",
              border: "1px solid var(--milled-border)",
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-xs)",
              color: "var(--volt-lime)",
            }}
          >
            ⏱ {task.estimate_minutes}m
          </span>
        ) : null}

        {task.due_at && (
          <span
            style={{
              background: isOverdue ? "rgba(255, 23, 68, 0.2)" : "var(--panel-recessed)",
              border: `1px solid ${isOverdue ? "var(--stamp-crimson)" : "var(--milled-border)"}`,
              padding: "0.15rem 0.45rem",
              borderRadius: "var(--radius-xs)",
              color: isOverdue ? "var(--stamp-crimson)" : "var(--ink-secondary)",
              fontWeight: isOverdue ? 700 : 400,
            }}
          >
            📅 {task.due_at.split("T")[0]} {isOverdue ? "(OVERDUE)" : ""}
          </span>
        )}
      </div>

      {/* Card Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--milled-border)",
          paddingTop: "0.4rem",
          marginTop: "0.2rem",
        }}
      >
        <div>
          {!isCompleted && onSelectForTimer && (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                fontSize: "0.7rem",
                padding: "0.2rem 0.55rem",
                background: "var(--volt-lime)",
                color: "var(--chassis-base)",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
              onClick={() => onSelectForTimer(task)}
            >
              ▶ Focus
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.7rem", padding: "0.2rem 0.45rem" }}
            onClick={() => onEdit(task)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ fontSize: "0.7rem", padding: "0.2rem 0.45rem" }}
            onClick={() => onDelete(task.id)}
          >
            Del
          </button>
        </div>
      </div>
    </article>
  );
};
