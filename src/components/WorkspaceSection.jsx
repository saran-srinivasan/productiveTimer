import { DashboardSection } from "./DashboardSection";
import { TasksSection } from "./TasksSection";

export function WorkspaceSection({
  active,
  createTask,
  deleteTask,
  recentSessions,
  startTask,
  stats,
  syncState,
  taskForm,
  tasks,
}) {
  return (
    <section className="workspace-grid">
      <TasksSection
        active={active}
        onCreateTask={createTask}
        onDeleteTask={deleteTask}
        onStartTask={startTask}
        stats={stats}
        taskForm={taskForm}
        tasks={tasks}
      />
      <DashboardSection
        recentSessions={recentSessions}
        stats={stats}
        syncState={syncState}
        tasks={tasks}
      />
    </section>
  );
}
