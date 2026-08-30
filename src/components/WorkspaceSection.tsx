import React, { FormEvent } from "react";
import { DashboardSection } from "./DashboardSection";
import { TasksSection } from "./TasksSection";
import {
  ActiveTimer,
  FocusSession,
  FocusStats,
  FocusTask,
  SyncState,
} from "../types/ledger";

interface WorkspaceSectionProps {
  active: ActiveTimer | null;
  createTask: (e: FormEvent) => void;
  deleteTask: (id: string) => void;
  recentSessions: { items: FocusSession[]; totalCount: number };
  startTask: (id: string, targetMinutes?: number | null) => void;
  stats: FocusStats;
  syncState: SyncState;
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
}: WorkspaceSectionProps) {
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
