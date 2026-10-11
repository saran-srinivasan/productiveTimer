import React, { useState, useEffect } from "react";
import { createActionTaskApi, fetchProjectsApi } from "../../apiClient";
import { CreateActionTaskRequestDto, ProjectDto } from "../../types/api";
import { FocusTask } from "../../types/ledger";

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  focusLanes?: FocusTask[];
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  focusLanes = [],
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [focusTaskId, setFocusTaskId] = useState<string>("");
  const [estimateMinutes, setEstimateMinutes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProjectsApi()
        .then((p) => setProjects(p))
        .catch(() => {});
      setTitle("");
      setDescription("");
      setPriority("medium");
      setProjectId("");
      setFocusTaskId("");
      setEstimateMinutes("");
      setDueDate("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      const payload: CreateActionTaskRequestDto = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: "inbox",
        project_id: projectId || null,
        focus_task_id: focusTaskId || null,
        estimate_minutes: estimateMinutes ? parseInt(estimateMinutes, 10) : null,
        due_at: dueDate ? `${dueDate}T23:59:59` : null,
      };
      await createActionTaskApi(payload);
      onClose();
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      alert("Failed to capture task: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--panel-module)",
          border: "2px solid var(--volt-lime)",
          borderRadius: "var(--radius-md)",
          width: "100%",
          maxWidth: "520px",
          padding: "1.75rem",
          boxShadow: "0 8px 32px rgba(204, 255, 0, 0.2), var(--shadow-bevel)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
              GLOBAL QUICK-CAPTURE (Ctrl+K)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title or quick action..."
              style={{
                width: "100%",
                background: "var(--panel-recessed)",
                border: "1px solid var(--milled-border)",
                color: "var(--ink-pure)",
                padding: "0.75rem 0.9rem",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
              }}
            />
          </div>

          <div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes or definition of done (optional)..."
              style={{
                width: "100%",
                background: "var(--panel-recessed)",
                border: "1px solid var(--milled-border)",
                color: "var(--ink-pure)",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.25rem" }}>
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.45rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.25rem" }}>
                DUE DATE
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.45rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {projects.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.25rem" }}>
                  PROJECT
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.45rem", fontSize: "0.85rem" }}
                >
                  <option value="">(No Project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.25rem" }}>
                ESTIMATE (MINS)
              </label>
              <input
                type="number"
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(e.target.value)}
                placeholder="e.g. 30"
                style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.45rem", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ fontSize: "0.85rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !title.trim()}
              style={{
                background: "var(--volt-lime)",
                color: "var(--chassis-base)",
                fontWeight: 800,
                fontSize: "0.85rem",
                padding: "0.5rem 1.25rem",
              }}
            >
              {saving ? "CAPTURING..." : "CAPTURE TO INBOX"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
