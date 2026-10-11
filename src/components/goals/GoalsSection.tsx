import React, { useState, useEffect } from "react";
import {
  fetchGoalsApi,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  addMilestoneApi,
  updateMilestoneApi,
  deleteMilestoneApi,
  fetchProjectsApi,
} from "../../apiClient";
import {
  GoalWithMilestonesDto,
  GoalMilestoneDto,
  CreateGoalRequestDto,
  ProjectDto,
} from "../../types/api";
import { GoalProgressCard } from "./GoalProgressCard";

export const GoalsSection: React.FC = () => {
  const [goals, setGoals] = useState<GoalWithMilestonesDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithMilestonesDto | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("outcome");
  const [formTargetValue, setFormTargetValue] = useState<number>(100);
  const [formUnit, setFormUnit] = useState("%");
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTargetDate, setFormTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [goalsData, projectsData] = await Promise.all([
        fetchGoalsApi(),
        fetchProjectsApi(),
      ]);
      setGoals(goalsData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormTitle("");
    setFormType("outcome");
    setFormTargetValue(100);
    setFormUnit("%");
    setFormProjectId("");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    // Default target date: 30 days from now
    const target = new Date();
    target.setDate(target.getDate() + 30);
    setFormTargetDate(target.toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: GoalWithMilestonesDto) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormType(goal.goal_type);
    setFormTargetValue(goal.target_value);
    setFormUnit(goal.unit);
    setFormProjectId(goal.project_id || "");
    setFormStartDate(goal.start_date || "");
    setFormTargetDate(goal.target_date || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleGoalTypeChange = (type: string) => {
    setFormType(type);
    if (type === "outcome") {
      setFormTargetValue(100);
      setFormUnit("%");
    } else if (type === "time") {
      setFormTargetValue(20);
      setFormUnit("hrs");
    } else if (type === "consistency") {
      setFormTargetValue(25);
      setFormUnit("days");
    } else if (type === "training") {
      setFormTargetValue(12);
      setFormUnit("sessions");
    } else if (type === "habit") {
      setFormTargetValue(30);
      setFormUnit("streaks");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      setSaving(true);
      if (editingGoal) {
        await updateGoalApi(editingGoal.id, {
          title: formTitle.trim(),
          target_value: Number(formTargetValue),
          unit: formUnit.trim(),
          project_id: formProjectId || null,
          start_date: formStartDate,
          target_date: formTargetDate,
        });
      } else {
        const payload: CreateGoalRequestDto = {
          title: formTitle.trim(),
          goal_type: formType,
          target_value: Number(formTargetValue),
          current_value: 0,
          unit: formUnit.trim(),
          project_id: formProjectId || null,
          start_date: formStartDate,
          target_date: formTargetDate,
          status: "in_progress",
        };
        await createGoalApi(payload);
      }
      closeModal();
      await loadData();
    } catch (err: any) {
      alert("Error saving goal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Archive / Delete this goal?")) return;
    try {
      await deleteGoalApi(id);
      await loadData();
    } catch (err: any) {
      alert("Error deleting goal: " + err.message);
    }
  };

  const handleAddMilestone = async (goalId: string, title: string, targetDate?: string) => {
    try {
      await addMilestoneApi(goalId, {
        title,
        target_date: targetDate || null,
      });
      await loadData();
    } catch (err: any) {
      alert("Error adding milestone: " + err.message);
    }
  };

  const handleToggleMilestone = async (goalId: string, milestone: GoalMilestoneDto) => {
    try {
      const isCompleted = milestone.status === "completed";
      await updateMilestoneApi(goalId, milestone.id, {
        status: isCompleted ? "pending" : "completed",
        completed_at: isCompleted ? null : new Date().toISOString(),
      });
      await loadData();
    } catch (err: any) {
      alert("Error updating milestone: " + err.message);
    }
  };

  const handleDeleteMilestone = async (goalId: string, milestoneId: string) => {
    try {
      await deleteMilestoneApi(goalId, milestoneId);
      await loadData();
    } catch (err: any) {
      alert("Error deleting milestone: " + err.message);
    }
  };

  // Filter goals
  const filteredGoals = goals.filter((g) => {
    if (typeFilter !== "all" && g.goal_type !== typeFilter) return false;
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (projectFilter !== "all" && g.project_id !== projectFilter) return false;
    return true;
  });

  // KPI calculations
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed" || g.progress_percentage >= 100).length;
  const inProgressGoals = goals.filter((g) => g.status === "in_progress" && g.progress_percentage < 100).length;
  const avgProgress =
    totalGoals > 0
      ? Math.round(goals.reduce((acc, g) => acc + g.progress_percentage, 0) / totalGoals)
      : 0;

  return (
    <section className="section-panel" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid var(--milled-border)",
          paddingBottom: "16px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                background: "var(--phosphor-amber)",
                color: "#000",
                fontSize: "10px",
                fontWeight: "900",
                padding: "2px 6px",
                borderRadius: "3px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              MODULE.08
            </span>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "800",
                margin: 0,
                letterSpacing: "0.04em",
                color: "var(--fore-primary)",
              }}
            >
              GOALS & MILESTONES
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fore-muted)" }}>
            Outcome targets, time allocations, consistency streaks, and milestone execution engine.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            background: "var(--volt-lime)",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontWeight: "800",
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 0 12px rgba(204, 255, 0, 0.25)",
          }}
        >
          <span>🎯</span> + DEFINE GOAL
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            TOTAL GOALS
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--fore-primary)", marginTop: "4px" }}>
            {totalGoals}
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Active operating vectors
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            IN PROGRESS
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--phosphor-amber)", marginTop: "4px" }}>
            {inProgressGoals}
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Under active progression
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            COMPLETED
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--signal-green)", marginTop: "4px" }}>
            {completedGoals}
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Achieved milestones
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            AVERAGE PROGRESS
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--chrono-cyan)", marginTop: "4px" }}>
            {avgProgress}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Cross-domain execution rate
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
          background: "var(--panel-module)",
          padding: "10px 14px",
          borderRadius: "6px",
          border: "1px solid var(--milled-border)",
        }}
      >
        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fore-muted)", fontWeight: "700" }}>
          FILTERS:
        </span>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            background: "var(--chassis-bg)",
            color: "var(--fore-primary)",
            border: "1px solid var(--milled-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <option value="all">ALL TYPES</option>
          <option value="outcome">OUTCOME</option>
          <option value="time">TIME TARGET</option>
          <option value="consistency">CONSISTENCY</option>
          <option value="training">TRAINING</option>
          <option value="habit">HABIT</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: "var(--chassis-bg)",
            color: "var(--fore-primary)",
            border: "1px solid var(--milled-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <option value="all">ALL STATUSES</option>
          <option value="in_progress">IN PROGRESS</option>
          <option value="completed">COMPLETED</option>
          <option value="paused">PAUSED</option>
          <option value="archived">ARCHIVED</option>
        </select>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            background: "var(--chassis-bg)",
            color: "var(--fore-primary)",
            border: "1px solid var(--milled-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <option value="all">ALL PROJECTS</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span style={{ marginLeft: "auto", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--fore-muted)" }}>
          Showing {filteredGoals.length} of {goals.length}
        </span>
      </div>

      {/* Goal Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
          [ LOADING TELEMETRY GOAL VECTORS... ]
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--hazard-orange)", fontFamily: "var(--font-mono)" }}>
          FAILED TO LOAD GOALS: {error}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--panel-module)",
            borderRadius: "6px",
            border: "1px dashed var(--milled-border)",
            color: "var(--fore-muted)",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎯</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--fore-primary)", marginBottom: "4px" }}>
            NO GOALS FOUND
          </div>
          <p style={{ fontSize: "13px", maxWidth: "440px", margin: "0 auto 16px auto" }}>
            Establish high-level outcomes, time commitments, or consistency targets to drive daily focus.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              background: "var(--volt-lime)",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              padding: "6px 14px",
              fontWeight: "700",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            CREATE FIRST GOAL
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredGoals.map((goal) => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              projects={projects}
              onUpdateGoal={openEditModal}
              onDeleteGoal={handleDeleteGoal}
              onAddMilestone={handleAddMilestone}
              onToggleMilestone={handleToggleMilestone}
              onDeleteMilestone={handleDeleteMilestone}
            />
          ))}
        </div>
      )}

      {/* Goal Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "var(--panel-module)",
              border: "2px solid var(--volt-lime)",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "540px",
              padding: "24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--milled-border)",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
                {editingGoal ? "[ EDIT GOAL VECTOR ]" : "[ DEFINE NEW GOAL ]"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--fore-muted)",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Title */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  GOAL TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Complete MVP v1, Focus 50 Hours, 20 Gym Sessions"
                  style={{
                    width: "100%",
                    background: "var(--chassis-bg)",
                    border: "1px solid var(--milled-border)",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    color: "var(--fore-primary)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Goal Type & Project */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    GOAL TYPE
                  </label>
                  <select
                    disabled={!!editingGoal}
                    value={formType}
                    onChange={(e) => handleGoalTypeChange(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <option value="outcome">Outcome (Milestones %)</option>
                    <option value="time">Time (Logged Focus Hours)</option>
                    <option value="consistency">Consistency (Active Days)</option>
                    <option value="training">Training (Workout Count)</option>
                    <option value="habit">Habit Adherence</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    ASSOCIATED PROJECT
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                    }}
                  >
                    <option value="">(None - Standalone)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Value & Unit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    TARGET QUANTITY *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formTargetValue}
                    onChange={(e) => setFormTargetValue(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "var(--fore-primary)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    UNIT (e.g. %, hrs, days, reps)
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "var(--fore-primary)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Start & Target Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    START DATE
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    TARGET COMPLETION DATE
                  </label>
                  <input
                    type="date"
                    required
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent",
                    color: "var(--fore-muted)",
                    border: "1px solid var(--milled-border)",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "var(--volt-lime)",
                    color: "#000",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 18px",
                    fontWeight: "800",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(204, 255, 0, 0.3)",
                  }}
                >
                  {saving ? "COMMITTING..." : editingGoal ? "UPDATE GOAL" : "CONFIRM GOAL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
