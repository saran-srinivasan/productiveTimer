import { formatDuration } from "../utils/format";

export function LogRow({ session, task }) {
  return (
    <div className="log-row">
      <span style={{ background: task?.color ?? "#222" }} />
      <div>
        <strong>{task?.name ?? "Deleted task"}</strong>
        <p>{session.note || "Focused work logged"}</p>
      </div>
      <time>{formatDuration(session.seconds)}</time>
    </div>
  );
}
