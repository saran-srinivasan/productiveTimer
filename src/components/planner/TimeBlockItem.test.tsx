import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TimeBlockItem } from "./TimeBlockItem";
import { PlannedBlockWithTaskDto } from "../../types/api";

describe("<TimeBlockItem />", () => {
  const mockBlock: PlannedBlockWithTaskDto = {
    id: "block-101",
    action_task_id: "task-1",
    plan_date: "2026-10-15",
    start_at: "09:00",
    end_at: "10:30",
    status: "planned",
    notes: "Deep core focus session",
    task_title: "Implement WAL journal mode in SQLite",
    task_priority: "high",
    project_name: "Core Engine",
    project_color: "#3b82f6",
  };

  it("renders block details, times, task title, and project", () => {
    render(
      <TimeBlockItem
        block={mockBlock}
        hasConflict={false}
        onToggleStatus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("09:00 - 10:30")).toBeInTheDocument();
    expect(screen.getByText("Implement WAL journal mode in SQLite")).toBeInTheDocument();
    expect(screen.getByText(/Core Engine/)).toBeInTheDocument();
    expect(screen.getByText(/high/)).toBeInTheDocument();
    expect(screen.getByText("Deep core focus session")).toBeInTheDocument();
    expect(screen.queryByText(/CONFLICT/i)).not.toBeInTheDocument();
  });

  it("shows conflict warning badge when hasConflict is true", () => {
    render(
      <TimeBlockItem
        block={mockBlock}
        hasConflict={true}
        onToggleStatus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/CONFLICT/i)).toBeInTheDocument();
  });

  it("triggers onToggleStatus on complete button click", () => {
    const handleToggle = vi.fn();
    render(
      <TimeBlockItem
        block={mockBlock}
        hasConflict={false}
        onToggleStatus={handleToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const completeBtn = screen.getByText("COMPLETE");
    fireEvent.click(completeBtn);
    expect(handleToggle).toHaveBeenCalledWith(mockBlock);
  });
});
