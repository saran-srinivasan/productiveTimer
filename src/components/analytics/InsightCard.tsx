import React, { useState } from "react";
import { InsightItemDto } from "../../types/api";

interface InsightCardProps {
  insight: InsightItemDto;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const severityBorder =
    insight.severity === "alert"
      ? "var(--stamp-crimson)"
      : insight.severity === "warning"
      ? "var(--phosphor-amber)"
      : insight.severity === "success"
      ? "var(--signal-green)"
      : "var(--chrono-cyan)";

  const severityBg =
    insight.severity === "alert"
      ? "rgba(255, 23, 68, 0.08)"
      : insight.severity === "warning"
      ? "rgba(255, 171, 0, 0.08)"
      : insight.severity === "success"
      ? "rgba(0, 230, 118, 0.08)"
      : "rgba(0, 229, 255, 0.08)";

  return (
    <>
      <div
        className="insight-card"
        style={{
          background: severityBg,
          border: `1px solid ${severityBorder}`,
          borderRadius: "var(--radius-sm)",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  borderRadius: "2px",
                  background: severityBorder,
                  color: "#0a0d13",
                  fontWeight: 800,
                }}
              >
                {insight.category} // {insight.severity}
              </span>
            </div>
            <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-pure)" }}>
              {insight.title}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setEvidenceOpen(true)}
            title="Inspect backing calculation & evidence"
            style={{
              padding: "3px 8px",
              background: "var(--panel-module)",
              border: "1px solid var(--milled-border)",
              borderRadius: "var(--radius-xs)",
              color: "var(--ink-primary)",
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🔍 View Evidence
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-primary)", lineHeight: 1.4 }}>
          {insight.message}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.68rem",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-secondary)",
            borderTop: "1px dashed rgba(255, 255, 255, 0.1)",
            paddingTop: "6px",
          }}
        >
          <span>METRIC: {insight.metric_name}</span>
          <span>{insight.supporting_record_ids.length} BACKING RECORDS</span>
        </div>
      </div>

      {/* Traceable Evidence Modal */}
      {evidenceOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setEvidenceOpen(false)}
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
              width: "min(540px, 100%)",
              padding: "22px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${severityBorder}`,
              background: "var(--panel-module)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span className="eyebrow">// AUDIT // DETERMINISTIC EVIDENCE</span>
                <h3 style={{ margin: "2px 0 0", fontSize: "1.1rem", color: "var(--ink-pure)" }}>
                  {insight.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceOpen(false)}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "var(--panel-recessed)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--volt-lime)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "4px" }}>
                  MATHEMATICAL FORMULA:
                </span>
                <code style={{ fontSize: "0.82rem", color: "var(--ink-pure)", fontFamily: "var(--font-mono)" }}>
                  {insight.formula}
                </code>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "6px" }}>
                  CALCULATION DATA POINTS:
                </span>
                <pre
                  style={{
                    background: "var(--panel-recessed)",
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    color: "var(--ink-primary)",
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(insight.data_points, null, 2)}
                </pre>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "6px" }}>
                  SUPPORTING ENTITY RECORD IDS:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {insight.supporting_record_ids.length > 0 ? (
                    insight.supporting_record_ids.map((id) => (
                      <span
                        key={id}
                        style={{
                          padding: "3px 8px",
                          background: "var(--panel-recessed)",
                          border: "1px solid var(--milled-border)",
                          borderRadius: "var(--radius-xs)",
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--volt-lime)",
                        }}
                      >
                        {id}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-secondary)" }}>
                      Aggregate statistical distribution (no single entity id)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEvidenceOpen(false)}
                  style={{
                    padding: "6px 14px",
                    background: "var(--panel-elevated)",
                    color: "var(--ink-pure)",
                    border: "1px solid var(--milled-border)",
                    borderRadius: "var(--radius-xs)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
