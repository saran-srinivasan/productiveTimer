import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TaskCard } from "./TaskCard";
import { ActionTaskDto } from "../../types/api";

describe("<TaskCard />", () => {
  const mockTask: ActionTaskDto = {
    id: "task-act-1",
    title: "Implement SQLite Wal journal mode",
    description: "Improves concurrency for timer session stamps",
    status: "ready",
    priority: "high",
    estimate_minutes: 45,
    due_at: "2026-10-15T00:00:00",
    completed_at: null,
    completion_notes: "",
    created_at: "2026-10-11T00:00:00",
    updated_at: "2026-10-11T00:00:00",
  };

  it("renders task metadata and badges", () => {
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelectForTimer={vi.fn()}
      />
    );

    expect(screen.getByText("Implement SQLite Wal journal mode")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText(/45m/)).toBeInTheDocument();
  });

  it("triggers completion toggle on checkbox click", () => {
    const handleToggle = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={handleToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const checkbox = screen.getByTitle(/Mark completed/i);
    fireEvent.click(checkbox);
    expect(handleToggle).toHaveBeenCalledWith(mockTask);
  });

  it("triggers select for timer callback", () => {
    const handleSelect = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onToggleComplete={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSelectForTimer={handleSelect}
      />
    );

    const focusBtn = screen.getByRole("button", { name: /▶ Focus/i });
    fireEvent.click(focusBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockTask);
  });
});
