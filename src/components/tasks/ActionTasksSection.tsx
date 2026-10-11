import React, { useState, useEffect } from "react";
import {
  fetchActionTasksApi,
  createActionTaskApi,
  updateActionTaskApi,
  deleteActionTaskApi,
  fetchProjectsApi,
} from "../../apiClient";
import {
  ActionTaskDto,
  CreateActionTaskRequestDto,
  ProjectDto,
} from "../../types/api";
import { FocusTask } from "../../types/ledger";
import { TaskCard } from "./TaskCard";
import { TaskQuickAdd } from "./TaskQuickAdd";

interface ActionTasksSectionProps {
  focusLanes?: FocusTask[];
  onSelectForTimer?: (task: ActionTaskDto) => void;
}

export const ActionTasksSection: React.FC<ActionTasksSectionProps> = ({
  focusLanes = [],
  onSelectForTimer,
}) => {
  const [tasks, setTasks] = useState<ActionTaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "today" | "by_project" | "completed" | "all">("all");

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<ActionTaskDto | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editStatus, setEditStatus] = useState<any>("ready");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editFocusTaskId, setEditFocusTaskId] = useState<string>("");
  const [editEstimate, setEditEstimate] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        fetchActionTasksApi(),
        fetchProjectsApi(),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTask = async (taskPayload: CreateActionTaskRequestDto) => {
    await createActionTaskApi(taskPayload);
    await loadData();
  };

  const handleToggleComplete = async (task: ActionTaskDto) => {
    const isCompleted = task.status === "completed";
    const newStatus = isCompleted ? "ready" : "completed";
    try {
      await updateActionTaskApi(task.id, {
        status: newStatus,
        completed_at: !isCompleted ? new Date().toISOString() : null,
      });
      await loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteActionTaskApi(id);
      await loadData();
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  const openEditModal = (task: ActionTaskDto) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditProjectId(task.project_id || "");
    setEditFocusTaskId(task.focus_task_id || "");
    setEditEstimate(task.estimate_minutes ? String(task.estimate_minutes) : "");
    setEditDueDate(task.due_at ? task.due_at.split("T")[0] : "");
  };

  const closeEditModal = () => {
    setEditingTask(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    try {
      setSaving(true);
      await updateActionTaskApi(editingTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        status: editStatus,
        project_id: editProjectId || null,
        focus_task_id: editFocusTaskId || null,
        estimate_minutes: editEstimate ? parseInt(editEstimate, 10) : null,
        due_at: editDueDate ? `${editDueDate}T23:59:59` : null,
      });
      closeEditModal();
      await loadData();
    } catch (err: any) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "inbox") {
      return t.status === "inbox";
    }
    if (activeTab === "today") {
      if (t.status === "completed") return false;
      return t.due_at && t.due_at.split("T")[0] <= todayStr;
    }
    if (activeTab === "completed") {
      return t.status === "completed";
    }
    if (activeTab === "all") {
      return t.status !== "completed" && t.status !== "archived";
    }
    return true;
  });

  const inboxCount = tasks.filter((t) => t.status === "inbox").length;
  const dueTodayCount = tasks.filter(
    (t) => t.status !== "completed" && t.due_at && t.due_at.split("T")[0] <= todayStr
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalActive = tasks.filter((t) => t.status !== "completed").length;

  return (
    <section className="section-block" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", letterSpacing: "0.04em", margin: 0 }}>
            ACTIONABLE TASKS
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--ink-secondary)" }}>
            Concrete deliverables mapped to projects, focus lanes, and execution schedules.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              background: "var(--panel-recessed)",
              border: "1px solid var(--milled-border)",
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-xs)",
              color: "var(--ink-secondary)",
            }}
          >
            Hotkeys: <strong style={{ color: "var(--volt-lime)" }}>Ctrl+K</strong> to Quick-Capture
          </span>
        </div>
      </div>

      {/* Telemetry KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Total Active
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--ink-pure)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            {totalActive}
          </div>
        </div>

        <div style={{ background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Inbox Queue
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            {inboxCount}
          </div>
        </div>

        <div style={{ background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Due Today / Overdue
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: dueTodayCount > 0 ? "var(--hazard-orange)" : "var(--signal-green)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            {dueTodayCount}
          </div>
        </div>

        <div style={{ background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Completed
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--signal-green)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
            {completedCount}
          </div>
        </div>
      </div>

      {/* Inline Quick Add */}
      <div style={{ marginBottom: "1.5rem" }}>
        <TaskQuickAdd
          projects={projects}
          focusLanes={focusLanes}
          onAddTask={handleAddTask}
        />
      </div>

      {/* View Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          borderBottom: "1px solid var(--milled-border)",
          paddingBottom: "0.75rem",
          overflowX: "auto",
        }}
      >
        {[
          { key: "all", label: `Active (${totalActive})` },
          { key: "inbox", label: `Inbox (${inboxCount})` },
          { key: "today", label: `Today (${dueTodayCount})` },
          { key: "by_project", label: "By Project" },
          { key: "completed", label: `Done (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="btn"
            style={{
              padding: "0.35rem 0.85rem",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              borderRadius: "var(--radius-xs)",
              background: activeTab === tab.key ? "var(--volt-lime)" : "var(--panel-module)",
              color: activeTab === tab.key ? "var(--chassis-base)" : "var(--ink-primary)",
              border: `1px solid ${activeTab === tab.key ? "var(--volt-lime)" : "var(--milled-border)"}`,
              fontWeight: activeTab === tab.key ? 800 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List Rendering */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          LOADING TASK LEDGER...
        </div>
      ) : error ? (
        <div style={{ padding: "1rem", color: "var(--stamp-crimson)", background: "rgba(255, 23, 68, 0.1)", borderRadius: "var(--radius-xs)" }}>
          {error}
        </div>
      ) : activeTab === "by_project" ? (
        // Grouped by project view
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {projects.map((proj) => {
            const projTasks = tasks.filter(
              (t) => t.project_id === proj.id && t.status !== "completed"
            );
            if (projTasks.length === 0) return null;

            return (
              <div key={proj.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: proj.color || "#3b82f6" }} />
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{proj.name}</h3>
                  <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                    ({projTasks.length} active)
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
                  {projTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projects={projects}
                      focusLanes={focusLanes}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onSelectForTimer={onSelectForTimer}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned tasks group */}
          {(() => {
            const unassigned = tasks.filter((t) => !t.project_id && t.status !== "completed");
            if (unassigned.length === 0) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--ink-secondary)" }}>
                  Unassigned Initiatives ({unassigned.length})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
                  {unassigned.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projects={projects}
                      focusLanes={focusLanes}
                      onToggleComplete={handleToggleComplete}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onSelectForTimer={onSelectForTimer}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            background: "var(--panel-module)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--milled-border)",
            color: "var(--ink-secondary)",
          }}
        >
          No tasks found in this view. Use the quick-add bar above to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
          {filteredTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              projects={projects}
              focusLanes={focusLanes}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onSelectForTimer={onSelectForTimer}
            />
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
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
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: "var(--panel-module)",
              border: "1px solid var(--milled-border-light)",
              borderRadius: "var(--radius-md)",
              width: "100%",
              maxWidth: "500px",
              padding: "1.75rem",
              boxShadow: "var(--shadow-bevel)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-pure)" }}>EDIT ACTION TASK</h3>
              <button
                type="button"
                onClick={closeEditModal}
                style={{ background: "transparent", border: "none", color: "var(--ink-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--ink-pure)",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-xs)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--ink-pure)",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-xs)",
                    fontFamily: "var(--font-body)",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    PRIORITY
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                    <option value="urgent">URGENT</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    STATUS
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  >
                    <option value="inbox">INBOX</option>
                    <option value="ready">READY</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="blocked">BLOCKED</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    PROJECT
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  >
                    <option value="">(None)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    FOCUS LANE
                  </label>
                  <select
                    value={editFocusTaskId}
                    onChange={(e) => setEditFocusTaskId(e.target.value)}
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  >
                    <option value="">(None)</option>
                    {focusLanes.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    ESTIMATE (MINUTES)
                  </label>
                  <input
                    type="number"
                    value={editEstimate}
                    onChange={(e) => setEditEstimate(e.target.value)}
                    placeholder="e.g. 45"
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.3rem" }}>
                    DUE DATE
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    style={{ width: "100%", background: "var(--panel-recessed)", border: "1px solid var(--milled-border)", color: "var(--ink-pure)", padding: "0.5rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={closeEditModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: "var(--volt-lime)", color: "var(--chassis-base)", fontWeight: 700 }}
                >
                  {saving ? "SAVING..." : "UPDATE TASK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
