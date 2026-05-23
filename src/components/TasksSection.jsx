import { formatDuration } from "../utils/format";

export function TasksSection({
  active,
  onCreateTask,
  onDeleteTask,
  onStartTask,
  stats,
  taskForm,
  tasks,
}) {
  return (
    <div className="task-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tasks</p>
          <h2>Pick current work</h2>
        </div>
      </div>

      <div className="task-list">
        {tasks.map((task) => {
          const todaySeconds = stats.todayByTask.get(task.id) ?? 0;
          const progress = Math.min(
            100,
            (todaySeconds / (task.targetMinutes * 60)) * 100,
          );

          return (
            <article
              className="task-card"
              key={task.id}
              style={{ "--task-color": task.color }}
            >
              <div className="task-topline">
                <span className="task-dot" />
                <h3>{task.name}</h3>
                <button
                  className="icon-button"
                  onClick={() => onDeleteTask(task.id)}
                  title={`Delete ${task.name}`}
                  type="button"
                >
                  x
                </button>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="task-meta">
                <span>{formatDuration(todaySeconds)} today</span>
                <span>{task.targetMinutes}m goal</span>
              </div>
              <button
                className="start-button"
                onClick={() => onStartTask(task.id)}
                disabled={Boolean(active && active.taskId !== task.id)}
              >
                {active?.taskId === task.id
                  ? "Running"
                  : active
                    ? "Finish current"
                    : "Start focus"}
              </button>
            </article>
          );
        })}
      </div>

      <form className="new-task-form" onSubmit={onCreateTask}>
        <input
          value={taskForm.taskName}
          onChange={(event) => taskForm.setTaskName(event.target.value)}
          placeholder="New task name"
        />
        <input
          type="number"
          min="5"
          step="5"
          value={taskForm.taskTarget}
          onChange={(event) => taskForm.setTaskTarget(event.target.value)}
          aria-label="Daily target minutes"
        />
        <input
          type="color"
          value={taskForm.taskColor}
          onChange={(event) => taskForm.setTaskColor(event.target.value)}
        />
        <button className="primary" type="submit">
          Add
        </button>
      </form>
    </div>
  );
}
