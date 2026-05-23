import { LogRow } from "./LogRow";
import { formatDuration } from "../utils/format";

export function DashboardSection({ recentSessions, stats, syncState, tasks }) {
  const maxSeconds = Math.max(
    ...tasks.map((task) => stats.totalsByTask.get(task.id) ?? 0),
    1,
  );

  return (
    <aside className="dashboard-panel">
      <p className="eyebrow">Dashboard</p>
      <h2>What got done</h2>
      <div className="metric-grid">
        <div>
          <span>Week</span>
          <strong>{formatDuration(stats.weekSeconds)}</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{recentSessions.totalCount}</strong>
        </div>
        <div>
          <span>Best lane</span>
          <strong>{stats.topTask?.seconds ? stats.topTask.name : "None yet"}</strong>
        </div>
      </div>
      <div className="sync-pill" data-state={syncState}>
        {syncState}
      </div>

      <div className="bar-stack">
        {tasks.map((task) => {
          const seconds = stats.totalsByTask.get(task.id) ?? 0;

          return (
            <div className="bar-line" key={task.id}>
              <span>{task.name}</span>
              <div>
                <i
                  style={{
                    width: `${(seconds / maxSeconds) * 100}%`,
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
        <div className="panel-heading compact">
          <h2>Recent logs</h2>
        </div>
        {recentSessions.items.length ? (
          recentSessions.items.map((session) => (
            <LogRow
              key={session.id}
              session={session}
              task={tasks.find((item) => item.id === session.taskId)}
            />
          ))
        ) : (
          <p className="empty-state">No sessions logged yet.</p>
        )}
      </div>
    </aside>
  );
}
