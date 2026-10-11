import React, { useState, useEffect } from "react";
import {
  fetchProjectsApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
} from "../../apiClient";
import { ProjectSummaryDto, CreateProjectRequestDto } from "../../types/api";
import { ProjectCard } from "./ProjectCard";

const COLOR_PRESETS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ccff00", // Volt Lime
  "#00e5ff", // Chrono Cyan
  "#f59e0b", // Amber
  "#ff5722", // Hazard Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export const ProjectsSection: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummaryDto | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLOR_PRESETS[0]);
  const [formStatus, setFormStatus] = useState<"active" | "paused" | "completed" | "archived">("active");
  const [formStartDate, setFormStartDate] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjectsApi();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormName("");
    setFormDescription("");
    setFormColor(COLOR_PRESETS[0]);
    setFormStatus("active");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormTargetDate("");
    setIsModalOpen(true);
  };

  const openEditModal = (project: ProjectSummaryDto) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || "");
    setFormColor(project.color || COLOR_PRESETS[0]);
    setFormStatus(project.status as any);
    setFormStartDate(project.start_date || "");
    setFormTargetDate(project.target_date || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setSaving(true);
      if (editingProject) {
        await updateProjectApi(editingProject.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          color: formColor,
          status: formStatus,
          start_date: formStartDate || null,
          target_date: formTargetDate || null,
        });
      } else {
        const payload: CreateProjectRequestDto = {
          name: formName.trim(),
          description: formDescription.trim(),
          color: formColor,
          status: formStatus,
          start_date: formStartDate || null,
          target_date: formTargetDate || null,
        };
        await createProjectApi(payload);
      }
      closeModal();
      await loadProjects();
    } catch (err: any) {
      alert("Failed to save project: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await deleteProjectApi(id);
      await loadProjects();
    } catch (err: any) {
      alert("Failed to archive project: " + err.message);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: "active" | "paused" | "completed" | "archived"
  ) => {
    try {
      await updateProjectApi(id, { status: newStatus });
      await loadProjects();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "all") return p.status !== "archived";
    return p.status === statusFilter;
  });

  const totalFocusSeconds = projects.reduce(
    (acc, p) => acc + (p.total_focus_seconds || 0),
    0
  );
  const totalTasks = projects.reduce((acc, p) => acc + (p.task_count || 0), 0);
  const activeCount = projects.filter((p) => p.status === "active").length;

  const formatHours = (seconds: number) => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  };

  return (
    <section className="section-block" style={{ padding: "1.5rem" }}>
      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", letterSpacing: "0.04em", margin: 0 }}>
            PROJECTS DIRECTORY
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--ink-secondary)" }}>
            High-level initiatives coordinating focus sessions, tasks, and measurable goals.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{
            background: "var(--volt-lime)",
            color: "var(--chassis-base)",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            padding: "0.6rem 1.25rem",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          + NEW PROJECT
        </button>
      </div>

      {/* Telemetry Summary Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            background: "var(--panel-recessed)",
            border: "1px solid var(--milled-border)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Active Projects
          </span>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--signal-green)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
            {activeCount}
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-recessed)",
            border: "1px solid var(--milled-border)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Cumulative Time
          </span>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--volt-lime)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
            {formatHours(totalFocusSeconds)}
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-recessed)",
            border: "1px solid var(--milled-border)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", textTransform: "uppercase" }}>
            Linked Tasks
          </span>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
            {totalTasks}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--milled-border)",
          paddingBottom: "0.75rem",
        }}
      >
        {["all", "active", "paused", "completed", "archived"].map((st) => (
          <button
            key={st}
            type="button"
            className="btn"
            style={{
              padding: "0.35rem 0.85rem",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              borderRadius: "var(--radius-xs)",
              background: statusFilter === st ? "var(--volt-lime)" : "var(--panel-module)",
              color: statusFilter === st ? "var(--chassis-base)" : "var(--ink-primary)",
              border: `1px solid ${statusFilter === st ? "var(--volt-lime)" : "var(--milled-border)"}`,
              fontWeight: statusFilter === st ? 800 : 500,
              cursor: "pointer",
            }}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          INITIALIZING PROJECT REPOSITORY...
        </div>
      ) : error ? (
        <div style={{ padding: "1.5rem", background: "rgba(255, 23, 68, 0.1)", border: "1px solid var(--stamp-crimson)", color: "var(--stamp-crimson)", borderRadius: "var(--radius-sm)" }}>
          ERROR: {error}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          style={{
            padding: "3.5rem 1rem",
            textAlign: "center",
            background: "var(--panel-module)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--milled-border)",
          }}
        >
          <p style={{ color: "var(--ink-secondary)", fontSize: "0.95rem", marginBottom: "1rem" }}>
            No projects found matching current filter ({statusFilter.toUpperCase()}).
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={openCreateModal}
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={openEditModal}
              onArchive={handleArchive}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
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
          onClick={closeModal}
        >
          <div
            style={{
              background: "var(--panel-module)",
              border: "1px solid var(--milled-border-light)",
              borderRadius: "var(--radius-md)",
              width: "100%",
              maxWidth: "520px",
              padding: "1.75rem",
              boxShadow: "var(--shadow-bevel)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-pure)" }}>
                {editingProject ? "EDIT INITIATIVE" : "NEW PROJECT"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
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

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Engine Overhaul, Q4 Launch"
                  style={{
                    width: "100%",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--ink-pure)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.95rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Strategic scope and definition of done..."
                  style={{
                    width: "100%",
                    background: "var(--panel-recessed)",
                    border: "1px solid var(--milled-border)",
                    color: "var(--ink-pure)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.9rem",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Color Swatches */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Identifier Color
                </label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: color,
                        border: formColor === color ? "3px solid #fff" : "1px solid rgba(0,0,0,0.4)",
                        cursor: "pointer",
                        outline: formColor === color ? `2px solid ${color}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{
                      width: "100%",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      color: "var(--ink-pure)",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <option value="active">ACTIVE</option>
                    <option value="paused">PAUSED</option>
                    <option value="completed">COMPLETED</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--panel-recessed)",
                      border: "1px solid var(--milled-border)",
                      color: "var(--ink-pure)",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    background: "var(--volt-lime)",
                    color: "var(--chassis-base)",
                    fontWeight: 700,
                  }}
                >
                  {saving ? "SAVING..." : editingProject ? "UPDATE INITIATIVE" : "CREATE INITIATIVE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
