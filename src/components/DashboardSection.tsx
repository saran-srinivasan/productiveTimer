import React, { useState } from "react";
import { LogRow } from "./LogRow";
import { formatDuration } from "../utils/format";
import { FocusSession, FocusStats, FocusTask, SyncState } from "../types/ledger";

interface DashboardSectionProps {
  recentSessions: { items: FocusSession[]; totalCount: number };
  stats: FocusStats;
  syncState: SyncState;
  tasks: FocusTask[];
}

export function DashboardSection({
  recentSessions,
  stats,
  tasks,
}: DashboardSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const maxSeconds = Math.max(
    ...tasks.map((task) => stats.totalsByTask.get(task.id) ?? 0),
    1,
  );

  const filteredLogs = (recentSessions.items || []).filter((session) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const task = tasks.find((item) => item.id === session.taskId);
    const taskName = task?.name?.toLowerCase() || "";
    const noteText = session.note?.toLowerCase() || "";
    return taskName.includes(q) || noteText.includes(q);
  });

  return (
    <aside className="dashboard-panel glass-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">TEL.02 // TELEMETRY & LOGS</p>
          <h2>System Telemetry</h2>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span>7-Day Focus</span>
          <strong>{formatDuration(stats.weekSeconds)}</strong>
        </div>
        <div className="metric-card">
          <span>Logs Total</span>
          <strong>{recentSessions.totalCount}</strong>
        </div>
        <div className="metric-card">
          <span>Top Lane</span>
          <strong title={stats.topTask?.name ?? "None"}>
            {stats.topTask?.seconds ? stats.topTask.name : "None"}
          </strong>
        </div>
      </div>

      <div className="bar-stack">
        <span className="eyebrow" style={{ marginBottom: 2 }}>
          LANE DISTRIBUTION METER
        </span>
        {tasks.map((task) => {
          const seconds = stats.totalsByTask.get(task.id) ?? 0;
          const percentage = Math.round((seconds / maxSeconds) * 100);

          return (
            <div
              className="bar-line"
              key={task.id}
              title={`${task.name}: ${formatDuration(seconds)}`}
            >
              <span>{task.name}</span>
              <div className="bar-line-track">
                <i
                  className="bar-line-fill"
                  style={{
                    width: `${percentage}%`,
                    background: task.color,
                  }}
                />
              </div>
              <strong>{formatDuration(seconds)}</strong>
            </div>
          );
        })}
      </div>

      <div className="recent-log">
        <div
          className="panel-heading compact"
          style={{ flexWrap: "wrap", gap: "8px" }}
        >
          <h2>Telemetry Stream</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs..."
            style={{
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              minHeight: "28px",
              width: "120px",
              background: "var(--panel-recessed)",
            }}
          />
        </div>
        <div className="recent-log-list">
          {filteredLogs.length ? (
            filteredLogs.map((session) => (
              <LogRow
                key={session.id}
                session={session}
                task={tasks.find((item) => item.id === session.taskId)}
              />
            ))
          ) : (
            <p className="empty-state">
              {searchQuery
                ? `[NO LOGS MATCHING "${searchQuery.toUpperCase()}"]`
                : "[NO SESSION LOGS RECORDED]"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
