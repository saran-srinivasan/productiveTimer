import React from "react";
import { ProjectSummaryDto } from "../../types/api";

interface ProjectCardProps {
  project: ProjectSummaryDto;
  onEdit: (project: ProjectSummaryDto) => void;
  onArchive: (id: string) => void;
  onStatusChange: (id: string, newStatus: "active" | "paused" | "completed" | "archived") => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onArchive,
  onStatusChange,
}) => {
  const formatSeconds = (sec: number) => {
    if (sec <= 0) return "0m";
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--signal-green)";
      case "paused":
        return "var(--phosphor-amber)";
      case "completed":
        return "var(--chrono-cyan)";
      case "archived":
      default:
        return "var(--ink-muted)";
    }
  };

  return (
    <article
      className="panel-module"
      style={{
        borderLeft: `4px solid ${project.color || "var(--volt-lime)"}`,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        borderRadius: "var(--radius-md)",
        background: "var(--panel-module)",
        borderTop: "1px solid var(--milled-border)",
        borderRight: "1px solid var(--milled-border)",
        borderBottom: "1px solid var(--milled-border)",
        boxShadow: "var(--shadow-bevel)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: project.color || "#3b82f6",
                boxShadow: `0 0 8px ${project.color || "#3b82f6"}`,
              }}
            />
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                letterSpacing: "0.02em",
                color: "var(--ink-pure)",
              }}
            >
              {project.name}
            </h3>
          </div>
          {project.description ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-secondary)", lineHeight: 1.4 }}>
              {project.description}
            </p>
          ) : null}
        </div>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            padding: "0.2rem 0.55rem",
            borderRadius: "var(--radius-xs)",
            fontWeight: 700,
            color: getStatusColor(project.status),
            background: "rgba(0, 0, 0, 0.4)",
            border: `1px solid ${getStatusColor(project.status)}`,
            letterSpacing: "0.06em",
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Metric badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          background: "var(--panel-recessed)",
          padding: "0.75rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--milled-border)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.7rem", color: "var(--ink-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Total Focus
          </span>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
            {formatSeconds(project.total_focus_seconds || 0)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: "0.7rem", color: "var(--ink-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            Tasks
          </span>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-primary)", fontFamily: "var(--font-mono)" }}>
            {project.task_count || 0}
          </div>
        </div>
      </div>

      {/* Dates row */}
      {(project.start_date || project.target_date) && (
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          {project.start_date && <span>START: {project.start_date}</span>}
          {project.target_date && <span>TARGET: {project.target_date}</span>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--milled-border)" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {project.status !== "active" && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              onClick={() => onStatusChange(project.id, "active")}
            >
              Resume
            </button>
          )}
          {project.status === "active" && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              onClick={() => onStatusChange(project.id, "paused")}
            >
              Pause
            </button>
          )}
          {project.status !== "completed" && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              onClick={() => onStatusChange(project.id, "completed")}
            >
              Complete
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
            onClick={() => onEdit(project)}
          >
            Edit
          </button>
          {project.status !== "archived" && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              onClick={() => onArchive(project.id)}
            >
              Archive
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
