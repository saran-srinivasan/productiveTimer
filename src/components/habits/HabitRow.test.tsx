import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { HabitRow } from "./HabitRow";
import { HabitWithHistoryDto } from "../../types/api";

describe("<HabitRow />", () => {
  const mockHabit: HabitWithHistoryDto = {
    id: "habit-1",
    name: "Morning Cold Shower",
    schedule_rule: "daily",
    target_frequency: 1,
    color: "#10b981",
    active: true,
    current_streak: 5,
    recent_dates: ["2026-10-10", "2026-10-11"],
    created_at: "2026-10-01",
  };

  const mockDays = [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ];

  it("renders habit title, schedule rule, and streak indicator", () => {
    render(
      <HabitRow
        habit={mockHabit}
        days={mockDays}
        onToggleDate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Morning Cold Shower")).toBeInTheDocument();
    expect(screen.getByText("daily")).toBeInTheDocument();
    expect(screen.getByText(/5D STREAK/i)).toBeInTheDocument();
    expect(screen.getByText("2/7")).toBeInTheDocument();
  });

  it("triggers onToggleDate when day cell is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <HabitRow
        habit={mockHabit}
        days={mockDays}
        onToggleDate={handleToggle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Find button for 2026-10-11
    const dayBtn = screen.getByTitle(/on 2026-10-11/i);
    fireEvent.click(dayBtn);
    expect(handleToggle).toHaveBeenCalledWith("habit-1", "2026-10-11");
  });

  it("triggers onEdit when edit button clicked", () => {
    const handleEdit = vi.fn();
    render(
      <HabitRow
        habit={mockHabit}
        days={mockDays}
        onToggleDate={vi.fn()}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByText("EDIT");
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockHabit);
  });
});
