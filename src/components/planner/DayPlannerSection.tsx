import React, { useState, useEffect, useMemo } from "react";
import {
  fetchPlannedBlocksApi,
  createPlannedBlockApi,
  updatePlannedBlockApi,
  deletePlannedBlockApi,
  fetchActionTasksApi,
} from "../../apiClient";
import {
  PlannedBlockWithTaskDto,
  CreatePlannedBlockRequestDto,
  ActionTaskDto,
} from "../../types/api";
import { useLedgerContext } from "../../context/LedgerContext";
import { TimeBlockItem } from "./TimeBlockItem";
import { PlannedVsActualView } from "./PlannedVsActualView";
import { AdaptivePlanModal } from "./AdaptivePlanModal";

export const DayPlannerSection: React.FC = () => {
  const { data } = useLedgerContext();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [blocks, setBlocks] = useState<PlannedBlockWithTaskDto[]>([]);
  const [actionTasks, setActionTasks] = useState<ActionTaskDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAdaptiveModalOpen, setIsAdaptiveModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<PlannedBlockWithTaskDto | null>(null);
  const [formTaskId, setFormTaskId] = useState<string>("");
  const [formStartAt, setFormStartAt] = useState<string>("09:00");
  const [formEndAt, setFormEndAt] = useState<string>("10:30");
  const [formStatus, setFormStatus] = useState<string>("planned");
  const [formNotes, setFormNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Load planned blocks for selectedDate
  const loadBlocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [blocksData, tasksData] = await Promise.all([
        fetchPlannedBlocksApi({ date: selectedDate }),
        fetchActionTasksApi({ status: "inbox,ready,in_progress" }),
      ]);
      setBlocks(blocksData);
      setActionTasks(tasksData);
    } catch (err: any) {
      setError(err.message || "Failed to load planned blocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, [selectedDate]);

  // Navigate dates
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Conflict detection
  const conflictIds = useMemo(() => {
    const conflicts = new Set<string>();
    const sorted = [...blocks].sort((a, b) => a.start_at.localeCompare(b.start_at));

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        // If block j starts before block i ends, they overlap
        if (sorted[j].start_at < sorted[i].end_at) {
          conflicts.add(sorted[i].id);
          conflicts.add(sorted[j].id);
        } else {
          // Since it's sorted, subsequent blocks won't overlap with block i
          break;
        }
      }
    }
    return conflicts;
  }, [blocks]);

  // Daily capacity calculations
  const totalPlannedMinutes = useMemo(() => {
    return blocks.reduce((acc, b) => {
      const [sh, sm] = b.start_at.split(":").map(Number);
      const [eh, em] = b.end_at.split(":").map(Number);
      const startMin = (sh || 0) * 60 + (sm || 0);
      const endMin = (eh || 0) * 60 + (em || 0);
      const diff = endMin >= startMin ? endMin - startMin : 1440 - startMin + endMin;
      return acc + diff;
    }, 0);
  }, [blocks]);

  const maxCapacityMinutes = 480; // 8 hours standard deep work max
  const isOvercapacity = totalPlannedMinutes > maxCapacityMinutes;

  // Filter actual focus sessions for this date
  const actualSessionsForDate = useMemo(() => {
    return (data?.sessions || []).filter((s) => s.date === selectedDate);
  }, [data?.sessions, selectedDate]);

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormTaskId("");
    // Find next convenient open start time or default
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      setFormStartAt(last.end_at);
      const [h, m] = last.end_at.split(":").map(Number);
      const endH = (h + 1) % 24;
      setFormEndAt(`${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    } else {
      setFormStartAt("09:00");
      setFormEndAt("10:30");
    }
    setFormStatus("planned");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (block: PlannedBlockWithTaskDto) => {
    setEditingBlock(block);
    setFormTaskId(block.action_task_id || "");
    setFormStartAt(block.start_at);
    setFormEndAt(block.end_at);
    setFormStatus(block.status);
    setFormNotes(block.notes || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStartAt || !formEndAt) return;

    try {
      setSaving(true);
      if (editingBlock) {
        await updatePlannedBlockApi(editingBlock.id, {
          action_task_id: formTaskId || null,
          plan_date: selectedDate,
          start_at: formStartAt,
          end_at: formEndAt,
          status: formStatus,
          notes: formNotes.trim(),
        });
      } else {
        const payload: CreatePlannedBlockRequestDto = {
          action_task_id: formTaskId || null,
          plan_date: selectedDate,
          start_at: formStartAt,
          end_at: formEndAt,
          status: formStatus,
          notes: formNotes.trim(),
        };
        await createPlannedBlockApi(payload);
      }
      closeModal();
      await loadBlocks();
    } catch (err: any) {
      alert("Error saving planned block: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (block: PlannedBlockWithTaskDto) => {
    try {
      const nextStatus = block.status === "completed" ? "planned" : "completed";
      await updatePlannedBlockApi(block.id, { status: nextStatus });
      await loadBlocks();
    } catch (err: any) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this scheduled time block?")) return;
    try {
      await deletePlannedBlockApi(id);
      await loadBlocks();
    } catch (err: any) {
      alert("Error deleting block: " + err.message);
    }
  };

  return (
    <section className="section-panel" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Header */}
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
                background: "var(--chrono-cyan)",
                color: "#000",
                fontSize: "10px",
                fontWeight: "900",
                padding: "2px 6px",
                borderRadius: "3px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              MODULE.09
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
              DAY PLANNER & TIME BLOCKING
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fore-muted)" }}>
            Allocate deep work blocks, prevent schedule collisions, and monitor planned vs. actual adherence.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            id="open-adaptive-plan-btn"
            onClick={() => setIsAdaptiveModalOpen(true)}
            style={{
              background: "var(--panel-module)",
              color: "var(--volt-lime)",
              border: "1px solid var(--volt-lime)",
              borderRadius: "4px",
              padding: "8px 14px",
              fontWeight: "800",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚡</span> AUTO-SCHEDULE PLAN
          </button>

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
            <span>⏰</span> + SCHEDULE TIME BLOCK
          </button>
        </div>
      </div>

      {/* Date Navigation & Capacity Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          background: "var(--panel-module)",
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid var(--milled-border)",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Date Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => handleShiftDate(-1)}
            style={{
              background: "var(--chassis-bg)",
              border: "1px solid var(--milled-border)",
              color: "var(--fore-primary)",
              borderRadius: "4px",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ← PREV
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: "var(--chassis-bg)",
              border: "1px solid var(--milled-border)",
              color: "var(--fore-primary)",
              borderRadius: "4px",
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          />

          <button
            type="button"
            onClick={() => handleShiftDate(1)}
            style={{
              background: "var(--chassis-bg)",
              border: "1px solid var(--milled-border)",
              color: "var(--fore-primary)",
              borderRadius: "4px",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            NEXT →
          </button>

          <button
            type="button"
            onClick={handleToday}
            style={{
              background: "transparent",
              border: "1px solid var(--milled-border)",
              color: "var(--volt-lime)",
              borderRadius: "4px",
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            TODAY
          </button>
        </div>

        {/* Capacity Warning Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {conflictIds.size > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: "900",
                color: "var(--stamp-crimson)",
                background: "rgba(239, 68, 68, 0.15)",
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid var(--stamp-crimson)",
              }}
            >
              ⚠ {conflictIds.size} OVERLAPPING BLOCKS
            </span>
          )}

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "4px",
              border: `1px solid ${isOvercapacity ? "var(--hazard-orange)" : "var(--signal-green)"}`,
              background: isOvercapacity ? "rgba(255, 87, 34, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isOvercapacity ? "var(--hazard-orange)" : "var(--signal-green)",
              fontWeight: "800",
            }}
          >
            {isOvercapacity ? "⚠ OVERCAPACITY: " : "CAPACITY: "}
            {Math.floor(totalPlannedMinutes / 60)}h {totalPlannedMinutes % 60}m / 8h (
            {isOvercapacity
              ? `+${totalPlannedMinutes - maxCapacityMinutes}m overload`
              : `${maxCapacityMinutes - totalPlannedMinutes}m buffer left`}
            )
          </div>
        </div>
      </div>

      {/* Dual-Track Planned vs Actual Telemetry Component */}
      <PlannedVsActualView
        date={selectedDate}
        plannedBlocks={blocks}
        actualSessions={actualSessionsForDate}
        focusLanes={data?.tasks}
      />

      {/* Planned Blocks List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
          [ SYNCHRONIZING TIME BLOCKS FOR {selectedDate}... ]
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--hazard-orange)", fontFamily: "var(--font-mono)" }}>
          FAILED TO LOAD TIME BLOCKS: {error}
        </div>
      ) : blocks.length === 0 ? (
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
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📅</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--fore-primary)", marginBottom: "4px" }}>
            NO TIME BLOCKS SCHEDULED FOR {selectedDate}
          </div>
          <p style={{ fontSize: "13px", maxWidth: "440px", margin: "0 auto 16px auto" }}>
            Plan your day proactively: allocate tasks into explicit hourly windows to guard your attention against distractions.
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
            SCHEDULE FIRST BLOCK
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {blocks.map((block) => (
            <TimeBlockItem
              key={block.id}
              block={block}
              hasConflict={conflictIds.has(block.id)}
              onToggleStatus={handleToggleStatus}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal: Schedule / Edit Block */}
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
              maxWidth: "500px",
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
                {editingBlock ? "[ MODIFY TIME BLOCK ]" : "[ ALLOCATE TIME BLOCK ]"}
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
              {/* Task Selection */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  ACTION TASK (OPTIONAL)
                </label>
                <select
                  value={formTaskId}
                  onChange={(e) => setFormTaskId(e.target.value)}
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
                  <option value="">(None - General Focus Block)</option>
                  {actionTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.priority.toUpperCase()}] {t.title} {t.estimate_minutes ? `(${t.estimate_minutes}m)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Times */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    START TIME (HH:MM) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    END TIME (HH:MM) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  BLOCK STATUS
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
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
                  <option value="planned">PLANNED</option>
                  <option value="completed">COMPLETED</option>
                  <option value="skipped">SKIPPED</option>
                  <option value="rescheduled">RESCHEDULED</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  INTENTION / NOTES
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Deep focus mode, phone on DND, zero meetings"
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

              {/* Buttons */}
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
                  {saving ? "COMMITTING..." : editingBlock ? "SAVE CHANGES" : "ALLOCATE BLOCK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adaptive Plan Proposal Modal */}
      <AdaptivePlanModal
        isOpen={isAdaptiveModalOpen}
        onClose={() => setIsAdaptiveModalOpen(false)}
        date={selectedDate}
        tasks={actionTasks}
        existingBlocks={blocks}
        onPlanApplied={loadBlocks}
      />
    </section>
  );
};
