import React from "react";
import { PlannedBlockWithTaskDto } from "../../types/api";
import { FocusSession, FocusTask } from "../../types/ledger";

interface PlannedVsActualViewProps {
  date: string;
  plannedBlocks: PlannedBlockWithTaskDto[];
  actualSessions: FocusSession[];
  focusLanes?: FocusTask[];
}

export const PlannedVsActualView: React.FC<PlannedVsActualViewProps> = ({
  date,
  plannedBlocks,
  actualSessions,
  focusLanes = [],
}) => {
  // Helper to parse "HH:MM" into minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    }
    return 0;
  };

  // Helper to parse ISO ended_at into minutes from midnight
  const parseIsoToMinutes = (isoStr: string): number => {
    try {
      const d = new Date(isoStr);
      return d.getHours() * 60 + d.getMinutes();
    } catch {
      return 0;
    }
  };

  // Calculate planned minutes
  const totalPlannedMinutes = plannedBlocks.reduce((acc, block) => {
    const startM = parseTimeToMinutes(block.start_at);
    const endM = parseTimeToMinutes(block.end_at);
    const diff = endM >= startM ? endM - startM : 1440 - startM + endM;
    return acc + diff;
  }, 0);

  // Calculate actual logged focus minutes for this date
  const totalActualMinutes = Math.round(
    actualSessions.reduce((acc, s) => acc + s.seconds, 0) / 60
  );

  const varianceMinutes = totalActualMinutes - totalPlannedMinutes;
  const adherenceRate =
    totalPlannedMinutes > 0
      ? Math.min(100, Math.round((totalActualMinutes / totalPlannedMinutes) * 100))
      : 0;

  // Workday timeline window: 07:00 (420m) to 22:00 (1320m) = 900 minutes total
  const TIMELINE_START = 7 * 60; // 07:00
  const TIMELINE_END = 22 * 60; // 22:00
  const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START; // 900 mins

  const getPositionStyle = (startMin: number, durationMin: number) => {
    const clampedStart = Math.max(TIMELINE_START, Math.min(TIMELINE_END, startMin));
    const leftPercent = ((clampedStart - TIMELINE_START) / TIMELINE_SPAN) * 100;
    const widthPercent = Math.max(1, (durationMin / TIMELINE_SPAN) * 100);
    return {
      left: `${leftPercent}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    };
  };

  // Generate hourly markers from 07:00 to 22:00
  const hourMarkers: number[] = [];
  for (let h = 7; h <= 22; h += 2) {
    hourMarkers.push(h);
  }

  return (
    <div
      style={{
        background: "var(--panel-module)",
        border: "1px solid var(--milled-border)",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              background: "var(--chrono-cyan)",
              color: "#000",
              fontWeight: "900",
              padding: "2px 6px",
              borderRadius: "3px",
              letterSpacing: "0.08em",
            }}
          >
            DUAL-TRACK TELEMETRY
          </span>
          <h3
            style={{
              margin: "6px 0 0 0",
              fontSize: "16px",
              fontWeight: "800",
              color: "var(--fore-primary)",
            }}
          >
            PLANNED VS. ACTUAL EXECUTION [{date}]
          </h3>
        </div>

        {/* Stats Strip */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
              PLANNED
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
              {Math.floor(totalPlannedMinutes / 60)}h {totalPlannedMinutes % 60}m
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
              ACTUAL LOGGED
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--chrono-cyan)", fontFamily: "var(--font-mono)" }}>
              {Math.floor(totalActualMinutes / 60)}h {totalActualMinutes % 60}m
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
              VARIANCE
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: varianceMinutes >= 0 ? "var(--signal-green)" : "var(--hazard-orange)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {varianceMinutes >= 0 ? `+${varianceMinutes}m` : `${varianceMinutes}m`}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
              ADHERENCE
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--fore-primary)", fontFamily: "var(--font-mono)" }}>
              {adherenceRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Visual Dual Timeline Bar */}
      <div style={{ position: "relative", marginTop: "24px" }}>
        {/* Hourly Axis */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "var(--fore-muted)",
            marginBottom: "8px",
            paddingLeft: "80px",
          }}
        >
          {hourMarkers.map((h) => (
            <span key={h}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>

        {/* Track 1: Planned Blocks */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <div
            style={{
              width: "80px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              fontWeight: "700",
              color: "var(--volt-lime)",
            }}
          >
            PLANNED:
          </div>
          <div
            style={{
              flex: 1,
              height: "26px",
              background: "rgba(0, 0, 0, 0.4)",
              borderRadius: "4px",
              border: "1px solid var(--milled-border)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {plannedBlocks.map((block) => {
              const startM = parseTimeToMinutes(block.start_at);
              const endM = parseTimeToMinutes(block.end_at);
              const durM = Math.max(15, endM >= startM ? endM - startM : 60);
              const pos = getPositionStyle(startM, durM);

              return (
                <div
                  key={block.id}
                  title={`${block.start_at}-${block.end_at}: ${block.task_title || "Block"} (${block.status})`}
                  style={{
                    position: "absolute",
                    top: "2px",
                    bottom: "2px",
                    ...pos,
                    background:
                      block.status === "completed"
                        ? "var(--signal-green)"
                        : block.project_color || "var(--volt-lime)",
                    opacity: 0.85,
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                    fontSize: "10px",
                    fontWeight: "800",
                    color: "#000",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {block.task_title || block.start_at}
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 2: Actual Focus Sessions */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "80px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              fontWeight: "700",
              color: "var(--chrono-cyan)",
            }}
          >
            ACTUAL:
          </div>
          <div
            style={{
              flex: 1,
              height: "26px",
              background: "rgba(0, 0, 0, 0.4)",
              borderRadius: "4px",
              border: "1px solid var(--milled-border)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {actualSessions.map((session) => {
              const durMin = Math.max(5, Math.round(session.seconds / 60));
              const endMin = parseIsoToMinutes(session.endedAt || (session as any).ended_at || "");
              const startMin = Math.max(0, endMin - durMin);
              const pos = getPositionStyle(startMin, durMin);

              const lane = focusLanes.find((l) => l.id === (session.taskId || (session as any).task_id));
              const laneColor = lane?.color || "var(--chrono-cyan)";

              return (
                <div
                  key={session.id}
                  title={`${lane?.name || "Session"}: ${durMin}m (${session.note || "No notes"})`}
                  style={{
                    position: "absolute",
                    top: "2px",
                    bottom: "2px",
                    ...pos,
                    background: laneColor,
                    opacity: 0.85,
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                    fontSize: "10px",
                    fontWeight: "800",
                    color: "#000",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {durMin}m
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
