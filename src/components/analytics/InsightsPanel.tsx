import React, { useEffect, useState } from "react";
import { fetchInsightsApi } from "../../apiClient";
import { InsightsResponseDto } from "../../types/api";
import { InsightCard } from "./InsightCard";

export const InsightsPanel: React.FC = () => {
  const [data, setData] = useState<InsightsResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchInsightsApi();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
        <span className="eyebrow">// TEL.06 // INTELLIGENCE ENGINE</span>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", margin: "8px 0 0" }}>
          Analyzing deterministic performance rules...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
        <span className="eyebrow">// TEL.06 // INTELLIGENCE ENGINE</span>
        <p style={{ fontSize: "0.8rem", color: "var(--stamp-crimson)", fontFamily: "var(--font-mono)", margin: "8px 0 0" }}>
          Engine unavailable: {error}
        </p>
      </div>
    );
  }

  const daysLogged = data?.days_logged || 0;
  const hasSufficientData = data?.has_sufficient_data ?? false;
  const insights = data?.insights || [];

  return (
    <div className="glass-panel" style={{ padding: "16px", borderRadius: "var(--radius-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <span className="eyebrow">// TEL.06 // DETERMINISTIC INTELLIGENCE</span>
          <h3 style={{ fontSize: "1.05rem", color: "var(--ink-pure)", margin: "2px 0 0" }}>
            Operational Insights
          </h3>
        </div>
        <button
          type="button"
          onClick={loadInsights}
          title="Re-run deterministic rules"
          style={{
            padding: "3px 8px",
            background: "var(--panel-recessed)",
            border: "1px solid var(--milled-border)",
            borderRadius: "var(--radius-xs)",
            color: "var(--ink-secondary)",
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          🔄 Re-evaluate
        </button>
      </div>

      {/* TASK-3.3.3: Graceful Insufficient Data Handling */}
      {!hasSufficientData ? (
        <div
          style={{
            padding: "16px",
            background: "rgba(0, 229, 255, 0.05)",
            border: "1px dashed var(--chrono-cyan)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "1.1rem" }}>📡</span>
            <strong style={{ fontSize: "0.85rem", color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)" }}>
              BASELINE CALIBRATION IN PROGRESS
            </strong>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--ink-primary)", lineHeight: 1.4, margin: "0 0 10px" }}>
            The explainable insights engine requires at least 7 active days of focus logs to compute reliable velocity drops, planning bias, and capacity patterns without statistical noise.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "6px", background: "var(--panel-recessed)", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.round((daysLogged / 7) * 100))}%`,
                  height: "100%",
                  background: "var(--chrono-cyan)",
                }}
              />
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
              {daysLogged} / 7 Days Logged
            </span>
          </div>
        </div>
      ) : insights.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "14px",
            background: "rgba(0, 230, 118, 0.06)",
            border: "1px solid rgba(0, 230, 118, 0.2)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            color: "var(--signal-green)",
          }}
        >
          ✓ ALL SIGNALS NOMINAL: Zero anomalies detected across projects, goals, or schedule delivery.
        </div>
      )}
    </div>
  );
};
