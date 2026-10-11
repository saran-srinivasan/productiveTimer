import React from "react";
import { PlannedBlockWithTaskDto } from "../../types/api";

interface TimeBlockItemProps {
  block: PlannedBlockWithTaskDto;
  hasConflict?: boolean;
  onToggleStatus: (block: PlannedBlockWithTaskDto) => void;
  onEdit: (block: PlannedBlockWithTaskDto) => void;
  onDelete: (id: string) => void;
}

export const TimeBlockItem: React.FC<TimeBlockItemProps> = ({
  block,
  hasConflict = false,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const isCompleted = block.status === "completed";
  const isSkipped = block.status === "skipped";

  const getPriorityColor = (priority?: string | null) => {
    switch (priority) {
      case "urgent":
        return "var(--stamp-crimson)";
      case "high":
        return "var(--hazard-orange)";
      case "medium":
        return "var(--phosphor-amber)";
      case "low":
      default:
        return "var(--chrono-cyan)";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "var(--signal-green)";
      case "skipped":
        return "var(--ink-muted)";
      case "rescheduled":
        return "var(--phosphor-amber)";
      case "planned":
      default:
        return "var(--volt-lime)";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: isCompleted ? "rgba(0, 0, 0, 0.25)" : "var(--panel-module)",
        border: hasConflict
          ? "2px solid var(--stamp-crimson)"
          : isCompleted
          ? "1px solid var(--milled-border)"
          : "1px solid var(--milled-border)",
        borderLeft: `4px solid ${getStatusColor(block.status)}`,
        borderRadius: "6px",
        gap: "12px",
        transition: "all 0.2s ease",
        opacity: isCompleted || isSkipped ? 0.75 : 1,
      }}
    >
      {/* Time & Conflict Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "90px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: "800",
            color: isCompleted ? "var(--fore-muted)" : "var(--fore-primary)",
            letterSpacing: "0.04em",
          }}
        >
          {block.start_at} - {block.end_at}
        </span>
        {hasConflict && (
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--stamp-crimson)",
              fontWeight: "900",
            }}
          >
            ⚠ CONFLICT
          </span>
        )}
      </div>

      {/* Main Task & Project Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
          {block.project_name && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: "700",
                color: block.project_color || "var(--chrono-cyan)",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "1px 6px",
                borderRadius: "3px",
                border: `1px solid ${block.project_color || "var(--milled-border)"}`,
              }}
            >
              📁 {block.project_name}
            </span>
          )}

          {block.task_priority && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: "800",
                textTransform: "uppercase",
                color: getPriorityColor(block.task_priority),
              }}
            >
              • {block.task_priority}
            </span>
          )}

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              padding: "1px 6px",
              borderRadius: "3px",
              color: getStatusColor(block.status),
              background: "rgba(0, 0, 0, 0.3)",
              border: `1px solid ${getStatusColor(block.status)}`,
              fontWeight: "700",
            }}
          >
            {block.status}
          </span>
        </div>

        <div
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: isCompleted ? "var(--fore-muted)" : "var(--fore-primary)",
            textDecoration: isCompleted ? "line-through" : "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {block.task_title || "General Scheduled Block"}
        </div>

        {block.notes && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--fore-muted)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {block.notes}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          onClick={() => onToggleStatus(block)}
          title={isCompleted ? "Mark planned" : "Mark completed"}
          style={{
            background: isCompleted ? "var(--signal-green)" : "transparent",
            color: isCompleted ? "#000" : "var(--fore-muted)",
            border: `1px solid ${isCompleted ? "var(--signal-green)" : "var(--milled-border)"}`,
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ DONE" : "COMPLETE"}
        </button>

        <button
          type="button"
          onClick={() => onEdit(block)}
          title="Edit Block"
          style={{
            background: "transparent",
            color: "var(--fore-muted)",
            border: "1px solid var(--milled-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          EDIT
        </button>

        <button
          type="button"
          onClick={() => onDelete(block.id)}
          title="Delete Block"
          style={{
            background: "transparent",
            color: "var(--stamp-crimson)",
            border: "none",
            fontSize: "14px",
            cursor: "pointer",
            padding: "4px 6px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
