import React, { useState, useEffect } from "react";
import { fetchWeeklyReviewApi } from "../../apiClient";
import { WeeklyReviewSummaryDto } from "../../types/api";

interface WeeklyReviewViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyReviewView: React.FC<WeeklyReviewViewProps> = ({
  isOpen,
  onClose,
}) => {
  // Compute start of current week (Monday)
  const getStartOfWeek = (d: Date): string => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    date.setDate(diff);
    return date.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState<string>(() => getStartOfWeek(new Date()));
  const [summary, setSummary] = useState<WeeklyReviewSummaryDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadWeekly = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWeeklyReviewApi(startDate);
        setSummary(data);
      } catch (err: any) {
        setError(err.message || "Failed to load weekly synthesis");
      } finally {
        setLoading(false);
      }
    };

    loadWeekly();
  }, [isOpen, startDate]);

  if (!isOpen) return null;

  const handleShiftWeek = (weeks: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + weeks * 7);
    setStartDate(d.toISOString().split("T")[0]);
  };

  const totalFocusHours = summary ? Math.floor(summary.total_focus_seconds / 3600) : 0;
  const totalFocusMins = summary
    ? Math.floor((summary.total_focus_seconds % 3600) / 60)
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--panel-module)",
          border: "2px solid var(--phosphor-amber)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "760px",
          padding: "24px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.85)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid var(--milled-border)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                background: "var(--phosphor-amber)",
                color: "#000",
                fontWeight: "900",
                padding: "2px 6px",
                borderRadius: "3px",
              }}
            >
              RETROSPECTIVE PROTOCOL
            </span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "800", color: "var(--fore-primary)" }}>
              WEEKLY EXECUTIVE SYNTHESIS
            </h3>
          </div>

          {/* Week Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              style={{
                background: "var(--chassis-bg)",
                border: "1px solid var(--milled-border)",
                color: "var(--fore-primary)",
                borderRadius: "4px",
                padding: "4px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              ← PREV
            </button>

            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--volt-lime)", fontWeight: "800" }}>
              {summary ? `${summary.start_date} → ${summary.end_date}` : startDate}
            </span>

            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              style={{
                background: "var(--chassis-bg)",
                border: "1px solid var(--milled-border)",
                color: "var(--fore-primary)",
                borderRadius: "4px",
                padding: "4px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              NEXT →
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fore-muted)",
                fontSize: "18px",
                cursor: "pointer",
                marginLeft: "8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
            [ SYNTHESIZING WEEKLY METRICS & ARTIFACTS... ]
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--hazard-orange)", fontFamily: "var(--font-mono)" }}>
            ERROR: {error}
          </div>
        ) : summary ? (
          <div>
            {/* KPI Summary Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
                  TOTAL FOCUS
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--volt-lime)", marginTop: "2px" }}>
                  {totalFocusHours}h {totalFocusMins}m
                </div>
              </div>

              <div
                style={{
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
                  TASKS CLOSED
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--signal-green)", marginTop: "2px" }}>
                  {summary.completed_tasks_count}
                </div>
              </div>

              <div
                style={{
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
                  GYM SESSIONS
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--hazard-orange)", marginTop: "2px" }}>
                  {summary.workout_count}
                </div>
              </div>

              <div
                style={{
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
                  TRAINING VOLUME
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--amber-gold, #f59e0b)", marginTop: "2px" }}>
                  {(summary.total_workout_volume || 0).toLocaleString()} kg
                </div>
              </div>

              <div
                style={{
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
                  HABIT ADHERENCE
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--chrono-cyan)", marginTop: "2px" }}>
                  {Math.round(summary.habit_completion_rate * 100)}%
                </div>
              </div>
            </div>

            {/* Daily Review Logs Timeline */}
            <div>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--fore-muted)",
                  textTransform: "uppercase",
                }}
              >
                [ ARCHIVED DAILY REFLECTIONS ({summary.daily_reviews.length} LOGS) ]
              </h4>

              {summary.daily_reviews.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "6px",
                    textAlign: "center",
                    color: "var(--fore-muted)",
                    fontSize: "12px",
                  }}
                >
                  No daily review entries recorded for this 7-day window. Complete daily reviews to populate this retrospective.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {summary.daily_reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        background: "var(--chassis-bg)",
                        border: "1px solid var(--milled-border)",
                        borderRadius: "6px",
                        padding: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          paddingBottom: "6px",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "800", color: "var(--fore-primary)", fontSize: "12px" }}>
                          📅 {rev.review_date}
                        </span>
                        <div style={{ display: "flex", gap: "10px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                          {rev.energy_rating && (
                            <span style={{ color: "var(--volt-lime)" }}>
                              ENERGY: {rev.energy_rating}/5
                            </span>
                          )}
                          {rev.focus_rating && (
                            <span style={{ color: "var(--chrono-cyan)" }}>
                              FOCUS: {rev.focus_rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {rev.accomplishments && (
                        <div style={{ fontSize: "12px", marginBottom: "6px" }}>
                          <strong style={{ color: "var(--signal-green)" }}>Accomplishments: </strong>
                          <span style={{ color: "var(--fore-primary)" }}>{rev.accomplishments}</span>
                        </div>
                      )}

                      {rev.blockers && (
                        <div style={{ fontSize: "12px", marginBottom: "6px" }}>
                          <strong style={{ color: "var(--hazard-orange)" }}>Blockers: </strong>
                          <span style={{ color: "var(--fore-primary)" }}>{rev.blockers}</span>
                        </div>
                      )}

                      {rev.reflection && (
                        <div style={{ fontSize: "12px" }}>
                          <strong style={{ color: "var(--chrono-cyan)" }}>Reflection: </strong>
                          <span style={{ color: "var(--fore-primary)" }}>{rev.reflection}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
