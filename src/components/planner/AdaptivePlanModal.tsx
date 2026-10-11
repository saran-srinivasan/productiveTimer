import React, { useState, useEffect } from "react";
import {
  ActionTaskDto,
  PlannedBlockWithTaskDto,
  CreatePlannedBlockRequestDto,
} from "../../types/api";
import {
  generateAdaptiveDailyPlan,
  AdaptivePlanProposal,
  ProposedBlock,
} from "../../utils/adaptivePlanner";
import { createPlannedBlockApi } from "../../apiClient";

interface AdaptivePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  tasks: ActionTaskDto[];
  existingBlocks: PlannedBlockWithTaskDto[];
  estimationBiasFactor?: number;
  onPlanApplied: () => void;
}

export const AdaptivePlanModal: React.FC<AdaptivePlanModalProps> = ({
  isOpen,
  onClose,
  date,
  tasks,
  existingBlocks,
  estimationBiasFactor = 1.0,
  onPlanApplied,
}) => {
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:30");
  const [capacityHours, setCapacityHours] = useState(7);
  const [proposal, setProposal] = useState<AdaptivePlanProposal | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<ProposedBlock[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate proposal whenever params change
  useEffect(() => {
    if (!isOpen) return;

    const prop = generateAdaptiveDailyPlan(tasks, {
      date,
      workStart,
      workEnd,
      breakStart: "12:30",
      breakDurationMinutes: 60,
      dailyCapacityMaxMinutes: capacityHours * 60,
      estimationBiasFactor,
      existingBlocks,
    });
    setProposal(prop);
    setSelectedBlocks(prop.proposedBlocks);
  }, [isOpen, date, tasks, existingBlocks, workStart, workEnd, capacityHours, estimationBiasFactor]);

  if (!isOpen) return null;

  const toggleBlock = (block: ProposedBlock) => {
    if (selectedBlocks.some((b) => b.action_task_id === block.action_task_id && b.start_at === block.start_at)) {
      setSelectedBlocks((prev) =>
        prev.filter((b) => !(b.action_task_id === block.action_task_id && b.start_at === block.start_at)),
      );
    } else {
      setSelectedBlocks((prev) => [...prev, block]);
    }
  };

  const handleApplySchedule = async () => {
    if (selectedBlocks.length === 0) {
      onClose();
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      // Write selected blocks to backend sequentially or parallel
      await Promise.all(
        selectedBlocks.map((b) => {
          const req: CreatePlannedBlockRequestDto = {
            action_task_id: b.action_task_id,
            plan_date: b.plan_date,
            start_at: b.start_at,
            end_at: b.end_at,
            notes: b.notes,
          };
          return createPlannedBlockApi(req);
        }),
      );

      onPlanApplied();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to schedule proposed blocks");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectedMin = selectedBlocks.reduce((acc, b) => acc + b.duration_minutes, 0);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        className="modal-box glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          padding: "24px",
          borderRadius: "var(--radius-md)",
          background: "var(--panel-module)",
          border: "1px solid var(--volt-lime)",
          boxShadow: "0 0 24px rgba(204, 255, 0, 0.15)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <span className="eyebrow">// OPTIMIZER // ADAPTIVE CAPACITY PLAN</span>
            <h3 style={{ margin: "2px 0 0", fontSize: "1.2rem", color: "var(--ink-pure)" }}>
              Draft Schedule Proposal: {date}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-secondary)",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Configuration strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            background: "var(--panel-recessed)",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            marginBottom: "16px",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div>
            <label style={{ display: "block", color: "var(--ink-secondary)", marginBottom: "4px" }}>
              Work Hours
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                style={{ padding: "2px 4px", fontSize: "0.72rem", background: "var(--panel-elevated)", color: "var(--ink-pure)", border: "1px solid var(--milled-border)", borderRadius: "3px" }}
              />
              <span>-</span>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                style={{ padding: "2px 4px", fontSize: "0.72rem", background: "var(--panel-elevated)", color: "var(--ink-pure)", border: "1px solid var(--milled-border)", borderRadius: "3px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "var(--ink-secondary)", marginBottom: "4px" }}>
              Capacity Cap
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input
                type="number"
                min="1"
                max="12"
                value={capacityHours}
                onChange={(e) => setCapacityHours(Number(e.target.value) || 6)}
                style={{ width: "50px", padding: "2px 4px", fontSize: "0.72rem", background: "var(--panel-elevated)", color: "var(--ink-pure)", border: "1px solid var(--milled-border)", borderRadius: "3px" }}
              />
              <span style={{ color: "var(--ink-primary)" }}>hours</span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "var(--ink-secondary)", marginBottom: "4px" }}>
              Bias Calibrator
            </label>
            <span style={{ color: "var(--volt-lime)", fontWeight: 700 }}>
              {estimationBiasFactor.toFixed(2)}x Multiplier
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: "var(--stamp-crimson)", fontSize: "0.75rem", marginBottom: "10px", fontFamily: "var(--font-mono)" }}>
            Error: {error}
          </div>
        )}

        {/* Proposed Blocks List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {proposal && proposal.proposedBlocks.length > 0 ? (
            proposal.proposedBlocks.map((b) => {
              const isSelected = selectedBlocks.some(
                (sb) => sb.action_task_id === b.action_task_id && sb.start_at === b.start_at,
              );
              return (
                <div
                  key={`${b.action_task_id}-${b.start_at}`}
                  onClick={() => toggleBlock(b)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "10px 12px",
                    background: isSelected ? "rgba(204, 255, 0, 0.08)" : "var(--panel-recessed)",
                    border: `1px solid ${isSelected ? "var(--volt-lime)" : "var(--milled-border)"}`,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: "pointer", accentColor: "var(--volt-lime)" }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontFamily: "var(--font-mono)",
                            textTransform: "uppercase",
                            padding: "1px 4px",
                            borderRadius: "2px",
                            background:
                              b.priority === "urgent"
                                ? "var(--stamp-crimson)"
                                : b.priority === "high"
                                ? "var(--hazard-orange)"
                                : "var(--panel-elevated)",
                            color: b.priority === "urgent" || b.priority === "high" ? "#fff" : "var(--ink-secondary)",
                          }}
                        >
                          {b.priority}
                        </span>
                        <strong
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--ink-pure)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={b.task_title}
                        >
                          {b.task_title}
                        </strong>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
                        {b.notes}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    <strong style={{ fontSize: "0.85rem", color: "var(--volt-lime)" }}>
                      {b.start_at} - {b.end_at}
                    </strong>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "var(--ink-secondary)" }}>
                      {b.duration_minutes}m (was {b.original_estimate_minutes}m)
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-state" style={{ padding: "24px 0", textAlign: "center" }}>
              [NO ACTIONABLE TASKS TO SCHEDULE OR FREE CAPACITY EXHAUSTED]
            </p>
          )}
        </div>

        {/* Capacity Rollup Footer */}
        <div
          style={{
            paddingTop: "12px",
            borderTop: "1px solid var(--milled-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--ink-secondary)" }}>PLANNED: </span>
            <strong style={{ color: "var(--ink-pure)" }}>{Math.round(totalSelectedMin / 60 * 10) / 10}h</strong>
            <span style={{ color: "var(--ink-secondary)" }}> / {capacityHours}h CAP</span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: "var(--ink-secondary)",
                border: "1px solid var(--milled-border)",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
            <button
              type="button"
              id="apply-adaptive-plan-btn"
              onClick={handleApplySchedule}
              disabled={submitting || selectedBlocks.length === 0}
              style={{
                padding: "8px 16px",
                background: "var(--volt-lime)",
                color: "#0a0d13",
                fontWeight: 800,
                border: "none",
                borderRadius: "var(--radius-xs)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                cursor: "pointer",
                boxShadow: "0 0 10px var(--volt-glow)",
              }}
            >
              {submitting ? "Writing Blocks..." : `Accept Schedule (${selectedBlocks.length} Blocks)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
