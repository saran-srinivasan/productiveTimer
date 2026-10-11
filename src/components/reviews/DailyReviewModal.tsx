import React, { useState, useEffect } from "react";
import { fetchDailyReviewApi, upsertDailyReviewApi } from "../../apiClient";
import { DailyReviewDto, UpsertDailyReviewRequestDto } from "../../types/api";

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const [reviewDate, setReviewDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [accomplishments, setAccomplishments] = useState<string>("");
  const [blockers, setBlockers] = useState<string>("");
  const [reflection, setReflection] = useState<string>("");
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [focusRating, setFocusRating] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadReview = async () => {
      try {
        setLoading(true);
        const data = await fetchDailyReviewApi(reviewDate);
        if (data) {
          setAccomplishments(data.accomplishments || "");
          setBlockers(data.blockers || "");
          setReflection(data.reflection || "");
          setEnergyRating(data.energy_rating || 4);
          setFocusRating(data.focus_rating || 4);
        } else {
          setAccomplishments("");
          setBlockers("");
          setReflection("");
          setEnergyRating(4);
          setFocusRating(4);
        }
      } catch {
        // Fallback to fresh form
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [isOpen, reviewDate]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const payload: UpsertDailyReviewRequestDto = {
        accomplishments: accomplishments.trim(),
        blockers: blockers.trim(),
        reflection: reflection.trim(),
        energy_rating: energyRating,
        focus_rating: focusRating,
      };
      await upsertDailyReviewApi(reviewDate, payload);
      onClose();
    } catch (err: any) {
      alert("Error saving review: " + err.message);
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
          border: "2px solid var(--chrono-cyan)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "600px",
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
            paddingBottom: "12px",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                background: "var(--chrono-cyan)",
                color: "#000",
                fontWeight: "900",
                padding: "2px 6px",
                borderRadius: "3px",
              }}
            >
              DAY CLOSING PROTOCOL
            </span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "17px", fontWeight: "800", color: "var(--fore-primary)" }}>
              GUIDED DAILY REVIEW
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              style={{
                background: "var(--chassis-bg)",
                border: "1px solid var(--milled-border)",
                color: "var(--fore-primary)",
                borderRadius: "4px",
                padding: "4px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            />
            <button
              type="button"
              onClick={onClose}
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
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
            [ RETRIEVING ARCHIVED REVIEW... ]
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 1. Key Accomplishments */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--signal-green)", fontFamily: "var(--font-mono)", fontWeight: "800", marginBottom: "6px" }}>
                1. WHAT GOT DONE TODAY? (ACCOMPLISHMENTS)
              </label>
              <textarea
                rows={3}
                value={accomplishments}
                onChange={(e) => setAccomplishments(e.target.value)}
                placeholder="Bullet points of closed tasks, shipped modules, workout completions..."
                style={{
                  width: "100%",
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  color: "var(--fore-primary)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* 2. Obstacles & Blockers */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--hazard-orange)", fontFamily: "var(--font-mono)", fontWeight: "800", marginBottom: "6px" }}>
                2. WHAT IMPEDED VELOCITY? (BLOCKERS / FRICTIONS)
              </label>
              <textarea
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Interruptions, context switching, poor sleep, technical debt..."
                style={{
                  width: "100%",
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  color: "var(--fore-primary)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* 3. Reflection / Improvement */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)", fontWeight: "800", marginBottom: "6px" }}>
                3. DAILY LESSON & INTENTION FOR TOMORROW
              </label>
              <textarea
                rows={2}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What can be calibrated tomorrow to maintain peak focus?"
                style={{
                  width: "100%",
                  background: "var(--chassis-bg)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  color: "var(--fore-primary)",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Ratings: Energy & Focus (1-5) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "6px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  ENERGY LEVEL: {energyRating} / 5
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyRating(lvl)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background: energyRating === lvl ? "var(--volt-lime)" : "var(--chassis-bg)",
                        color: energyRating === lvl ? "#000" : "var(--fore-muted)",
                        border: "1px solid var(--milled-border)",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "800",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  FOCUS QUALITY: {focusRating} / 5
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFocusRating(lvl)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background: focusRating === lvl ? "var(--chrono-cyan)" : "var(--chassis-bg)",
                        color: focusRating === lvl ? "#000" : "var(--fore-muted)",
                        border: "1px solid var(--milled-border)",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "800",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={onClose}
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
                DISCARD
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "var(--chrono-cyan)",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 20px",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)",
                }}
              >
                {saving ? "COMMITTING..." : "SAVE DAILY REVIEW"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
