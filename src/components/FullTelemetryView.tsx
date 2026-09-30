import React, { useState, useMemo } from "react";
import { useLedgerContext } from "../context/LedgerContext";
import { formatDuration, formatLoad, formatDistance } from "../utils/format";

type TelemetryTypeFilter = "all" | "focus" | "gym";

interface UnifiedTelemetryItem {
  id: string;
  source: "focus" | "workout";
  date: string;
  timestamp: number;
  title: string;
  subtitle: string;
  details: string;
  color?: string;
  note?: string;
  rawWorkoutId?: string;
}

export function FullTelemetryView() {
  const { data, workoutActions } = useLedgerContext();
  const [filterType, setFilterType] = useState<TelemetryTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Build unified chronological list of all logs
  const unifiedItems: UnifiedTelemetryItem[] = useMemo(() => {
    const list: UnifiedTelemetryItem[] = [];

    // Map focus sessions
    data.sessions.forEach((session) => {
      const task = data.tasks.find((t) => t.id === session.taskId);
      const timeMs = session.endedAt
        ? new Date(session.endedAt).getTime()
        : new Date(`${session.date}T12:00:00`).getTime();

      list.push({
        id: `focus-${session.id}`,
        source: "focus",
        date: session.date,
        timestamp: timeMs,
        title: task?.name ?? "Archived Lane",
        subtitle: `Focus Runtime: ${formatDuration(session.seconds)}`,
        details: session.note || "Focus session stamped",
        color: task?.color ?? "var(--volt-lime)",
        note: session.note,
      });
    });

    // Map workout entries
    data.workouts.forEach((workout) => {
      const timeMs = workout.createdAt
        ? new Date(workout.createdAt).getTime()
        : new Date(`${workout.date}T12:00:00`).getTime();

      const subtitle =
        workout.kind === "strength"
          ? `${workout.sets} sets × ${workout.reps} reps @ ${workout.weight}kg (${formatLoad(
              (workout.sets || 0) * (workout.reps || 0) * (workout.weight || 0),
            )} tonnage)`
          : `${workout.durationMinutes}m cardio${
              workout.distance ? ` · ${formatDistance(workout.distance)}` : ""
            }`;

      list.push({
        id: `workout-${workout.id}`,
        source: "workout",
        date: workout.date,
        timestamp: timeMs,
        title: workout.exercise,
        subtitle,
        details: workout.intensity ? `[${workout.intensity.toUpperCase()}]` : "",
        color: workout.kind === "strength" ? "var(--hazard-orange)" : "var(--chrono-cyan)",
        note: workout.note,
        rawWorkoutId: workout.id,
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [data.sessions, data.tasks, data.workouts]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (filterType === "focus" && item.source !== "focus") return false;
      if (filterType === "gym" && item.source !== "workout") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    });
  }, [unifiedItems, filterType, searchQuery]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel">
        <div className="panel-heading" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p className="eyebrow">AUDIT.05 // HISTORICAL STREAM ARCHIVE</p>
            <h2>Telemetry Ledger & Review</h2>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter buttons */}
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { id: "all", label: `All (${unifiedItems.length})` },
                { id: "focus", label: `Focus (${data.sessions.length})` },
                { id: "gym", label: `Gym (${data.workouts.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterType(tab.id as TelemetryTypeFilter);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    borderRadius: "4px",
                    background: filterType === tab.id ? "var(--volt-lime)" : "var(--panel-recessed)",
                    color: filterType === tab.id ? "#000" : "var(--ink-secondary)",
                    border: "1px solid var(--milled-border)",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Page size dropdown */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                minHeight: "32px",
                fontSize: "0.74rem",
                fontFamily: "var(--font-mono)",
                background: "var(--panel-recessed)",
                padding: "2px 8px",
              }}
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: "14px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search telemetry by exercise, task lane, date (YYYY-MM-DD), or deliverable notes..."
            style={{ minHeight: "36px", fontSize: "0.82rem" }}
          />
        </div>

        {/* Log Entries List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {paginatedItems.length ? (
            paginatedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "12px",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--panel-recessed)",
                  border: "1px solid var(--milled-border)",
                  borderRadius: "6px",
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div style={{ minWidth: "90px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      color: "var(--ink-secondary)",
                      display: "block",
                    }}
                  >
                    {item.date}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      color: item.source === "focus" ? "var(--volt-lime)" : "var(--hazard-orange)",
                      textTransform: "uppercase",
                    }}
                  >
                    [{item.source}]
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.92rem", color: "var(--ink-pure)" }}>{item.title}</strong>
                    <span style={{ fontSize: "0.76rem", fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>
                      {item.subtitle}
                    </span>
                    {item.details ? (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--ink-secondary)",
                        }}
                      >
                        {item.details}
                      </span>
                    ) : null}
                  </div>
                  {item.note ? (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "0.75rem",
                        color: "var(--ink-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ↳ {item.note}
                    </p>
                  ) : null}
                </div>

                <div>
                  {item.source === "workout" && item.rawWorkoutId ? (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => workoutActions.deleteWorkout(item.rawWorkoutId!)}
                      title={`Delete workout record: ${item.title}`}
                      style={{ width: "26px", height: "26px" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state" style={{ padding: "20px" }}>
              {searchQuery
                ? `[NO TELEMETRY LOGS MATCHING "${searchQuery.toUpperCase()}"]`
                : "[NO TELEMETRY LOGS RECORDED]"}
            </p>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px dashed var(--milled-border)",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
              PAGE {safeCurrentPage} OF {totalPages} [{totalItems} TOTAL LOGS]
            </span>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                style={{ minHeight: "30px", padding: "0 8px", fontSize: "0.7rem" }}
              >
                ⏮ First
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                style={{ minHeight: "30px", padding: "0 10px", fontSize: "0.7rem" }}
              >
                ◀ Prev
              </button>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: "var(--panel-module)",
                  border: "1px solid var(--milled-border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--volt-lime)",
                }}
              >
                {safeCurrentPage}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                style={{ minHeight: "30px", padding: "0 10px", fontSize: "0.7rem" }}
              >
                Next ▶
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                style={{ minHeight: "30px", padding: "0 8px", fontSize: "0.7rem" }}
              >
                Last ⏭
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
