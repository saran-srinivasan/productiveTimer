import React from "react";
import { formatDuration } from "../utils/format";
import { FocusSession, FocusTask } from "../types/ledger";

interface LogRowProps {
  session: FocusSession;
  task?: FocusTask;
}

export function LogRow({ session, task }: LogRowProps) {
  return (
    <div className="log-row">
      <span
        className="log-row-bar"
        style={{ background: task?.color ?? "var(--volt-lime)" }}
      />
      <div className="log-row-content">
        <strong>{task?.name ?? "Archived Lane"}</strong>
        <p>{session.note || "Focused work session logged"}</p>
      </div>
      <time>{formatDuration(session.seconds)}</time>
    </div>
  );
}
