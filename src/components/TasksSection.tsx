import React, { FormEvent } from "react";
import { formatDuration } from "../utils/format";
import { ActiveTimer, FocusStats, FocusTask } from "../types/ledger";

interface TasksSectionProps {
  active: ActiveTimer | null;
  onCreateTask: (e: FormEvent) => void;
  onDeleteTask: (id: string) => void;
  onStartTask: (id: string, targetMinutes?: number | null) => void;
  stats: FocusStats;
  taskForm: {
    taskName: string;
    taskTarget: number;
    taskColor: string;
    setTaskName: (val: string) => void;
    setTaskTarget: (val: number) => void;
    setTaskColor: (val: string) => void;
  };
  tasks: FocusTask[];
}

export function TasksSection({
  active,
  onCreateTask,
  onDeleteTask,
  onStartTask,
  stats,
  taskForm,
  tasks,
}: TasksSectionProps) {
  return (
    <div className="task-panel glass-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SYS.01 // TASK-LANES</p>
          <h2>Active Focus Lanes</h2>
        </div>
      </div>

      <div className="task-list">
        {tasks.map((task) => {
          const todaySeconds = stats.todayByTask.get(task.id) ?? 0;
          const targetSeconds = (task.targetMinutes || 30) * 60;
          const progressPercent = Math.min(
            100,
            Math.round((todaySeconds / targetSeconds) * 100),
          );
          const isThisActive = active?.taskId === task.id;

          return (
            <article
              className={`task-card ${isThisActive ? "is-active-task" : ""}`}
              key={task.id}
              style={{ "--task-color": task.color } as React.CSSProperties}
            >
              <div className="task-topline">
                <div className="task-title-group">
                  <span className="task-dot" />
                  <h3 title={task.name}>{task.name}</h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => onDeleteTask(task.id)}
                  title={`Delete ${task.name}`}
                  type="button"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div
                className="progress-track"
                title={`${progressPercent}% completed`}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="task-meta">
                <span>{formatDuration(todaySeconds)} logged</span>
                <span>
                  {task.targetMinutes}m [{progressPercent}%]
                </span>
              </div>

              <button
                className={`start-button ${isThisActive ? "is-running" : ""}`}
                onClick={() => onStartTask(task.id)}
                disabled={Boolean(active && active.taskId !== task.id)}
                type="button"
              >
                {isThisActive ? (
                  <>
                    <span className="sync-dot" style={{ background: "#000" }} />
                    Running Lane
                  </>
                ) : active ? (
                  "Lane Occupied"
                ) : (
                  <>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Engage Lane
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      <form className="new-task-form" onSubmit={onCreateTask}>
        <input
          value={taskForm.taskName}
          onChange={(event) => taskForm.setTaskName(event.target.value)}
          placeholder="New focus lane name..."
          required
        />
        <input
          type="number"
          min="5"
          step="5"
          value={taskForm.taskTarget}
          onChange={(event) => taskForm.setTaskTarget(Number(event.target.value))}
          aria-label="Daily target minutes"
          title="Daily target minutes"
        />
        <input
          type="color"
          value={taskForm.taskColor}
          onChange={(event) => taskForm.setTaskColor(event.target.value)}
          title="Lane theme color"
        />
        <button className="btn btn-primary" type="submit">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Add
        </button>
      </form>
    </div>
  );
}
