import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { GoalProgressCard } from "./GoalProgressCard";
import { GoalWithMilestonesDto, ProjectDto } from "../../types/api";

describe("<GoalProgressCard />", () => {
  const mockGoal: GoalWithMilestonesDto = {
    id: "goal-1",
    project_id: "proj-1",
    title: "Master Rust Axum Framework",
    goal_type: "outcome",
    target_value: 100,
    current_value: 50,
    unit: "%",
    start_date: "2026-10-01",
    target_date: "2026-11-01",
    status: "in_progress",
    progress_percentage: 50,
    milestones: [
      {
        id: "ms-1",
        goal_id: "goal-1",
        title: "Finish basic routing",
        target_date: "2026-10-10",
        status: "completed",
        completed_at: "2026-10-09T12:00:00Z",
      },
      {
        id: "ms-2",
        goal_id: "goal-1",
        title: "Implement middleware and auth",
        target_date: "2026-10-20",
        status: "pending",
        completed_at: null,
      },
    ],
  };

  const mockProjects: ProjectDto[] = [
    {
      id: "proj-1",
      name: "ProductiveTimer OS",
      description: "Personal OS",
      color: "#3b82f6",
      status: "active",
      start_date: "2026-10-01",
      target_date: "2026-12-31",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  it("renders goal card with title, type, and associated project", () => {
    render(
      <GoalProgressCard
        goal={mockGoal}
        projects={mockProjects}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onAddMilestone={vi.fn()}
        onToggleMilestone={vi.fn()}
        onDeleteMilestone={vi.fn()}
      />
    );

    expect(screen.getByText("Master Rust Axum Framework")).toBeInTheDocument();
    expect(screen.getByText(/ProductiveTimer OS/)).toBeInTheDocument();
    expect(screen.getByText("outcome")).toBeInTheDocument();
    expect(screen.getByText("Finish basic routing")).toBeInTheDocument();
    expect(screen.getByText("Implement middleware and auth")).toBeInTheDocument();
  });

  it("calls onToggleMilestone when milestone checkbox is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <GoalProgressCard
        goal={mockGoal}
        projects={mockProjects}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onAddMilestone={vi.fn()}
        onToggleMilestone={handleToggle}
        onDeleteMilestone={vi.fn()}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(2);
    fireEvent.click(checkboxes[1]);
    expect(handleToggle).toHaveBeenCalledWith("goal-1", mockGoal.milestones[1]);
  });
});
