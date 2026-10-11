import React, { useState } from "react";
import { CreateActionTaskRequestDto, ProjectDto } from "../../types/api";
import { FocusTask } from "../../types/ledger";

interface TaskQuickAddProps {
  projects?: ProjectDto[];
  focusLanes?: FocusTask[];
  defaultProjectId?: string;
  onAddTask: (task: CreateActionTaskRequestDto) => Promise<void>;
}

export const TaskQuickAdd: React.FC<TaskQuickAddProps> = ({
  projects = [],
  focusLanes = [],
  defaultProjectId,
  onAddTask,
}) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [focusTaskId, setFocusTaskId] = useState<string>("");
  const [estimateMinutes, setEstimateMinutes] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onAddTask({
        title: title.trim(),
        priority,
        project_id: projectId || null,
        focus_task_id: focusTaskId || null,
        estimate_minutes: estimateMinutes || null,
        due_at: dueDate ? `${dueDate}T23:59:59` : null,
        status: "inbox",
      });
      setTitle("");
      setDueDate("");
      setEstimateMinutes(undefined);
      setIsExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="panel-module"
      style={{
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--milled-border)",
        background: "var(--panel-module)",
        boxShadow: "var(--shadow-recessed)",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="+ Quick add task... (e.g. Refactor API auth layer)"
          style={{
            flex: 1,
            background: "var(--panel-recessed)",
            border: "1px solid var(--milled-border)",
            color: "var(--ink-pure)",
            padding: "0.55rem 0.85rem",
            borderRadius: "var(--radius-xs)",
            fontFamily: "var(--font-body)",
            fontSize: "0.9rem",
          }}
        />

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="btn btn-primary"
          style={{
            background: "var(--volt-lime)",
            color: "var(--chassis-base)",
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            fontSize: "0.8rem",
            padding: "0.55rem 1rem",
            cursor: "pointer",
            borderRadius: "var(--radius-xs)",
          }}
        >
          {loading ? "..." : "+ ADD"}
        </button>
      </div>

      {isExpanded && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
            marginTop: "0.75rem",
            paddingTop: "0.6rem",
            borderTop: "1px solid var(--milled-border)",
            alignItems: "center",
          }}
        >
          {/* Priority */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              PRIORITY:
            </span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              style={{
                background: "var(--panel-recessed)",
                color: "var(--ink-primary)",
                border: "1px solid var(--milled-border)",
                fontSize: "0.75rem",
                padding: "0.2rem 0.4rem",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
              <option value="urgent">URGENT</option>
            </select>
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                PROJECT:
              </span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{
                  background: "var(--panel-recessed)",
                  color: "var(--ink-primary)",
                  border: "1px solid var(--milled-border)",
                  fontSize: "0.75rem",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "var(--radius-xs)",
                  fontFamily: "var(--font-mono)",
                  maxWidth: "140px",
                }}
              >
                <option value="">(No Project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lane */}
          {focusLanes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                LANE:
              </span>
              <select
                value={focusTaskId}
                onChange={(e) => setFocusTaskId(e.target.value)}
                style={{
                  background: "var(--panel-recessed)",
                  color: "var(--ink-primary)",
                  border: "1px solid var(--milled-border)",
                  fontSize: "0.75rem",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "var(--radius-xs)",
                  fontFamily: "var(--font-mono)",
                  maxWidth: "130px",
                }}
              >
                <option value="">(No Lane)</option>
                {focusLanes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Estimate */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              EST:
            </span>
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setEstimateMinutes(estimateMinutes === mins ? undefined : mins)}
                style={{
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  padding: "0.15rem 0.35rem",
                  borderRadius: "var(--radius-xs)",
                  background: estimateMinutes === mins ? "var(--volt-lime)" : "var(--panel-recessed)",
                  color: estimateMinutes === mins ? "var(--chassis-base)" : "var(--ink-secondary)",
                  border: "1px solid var(--milled-border)",
                  cursor: "pointer",
                }}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Due date */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              DUE:
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                background: "var(--panel-recessed)",
                color: "var(--ink-primary)",
                border: "1px solid var(--milled-border)",
                fontSize: "0.75rem",
                padding: "0.15rem 0.4rem",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </div>
      )}
    </form>
  );
};
