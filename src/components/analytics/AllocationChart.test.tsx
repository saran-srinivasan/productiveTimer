import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AllocationChart } from "./AllocationChart";
import { AllocationSlice } from "../../hooks/useAnalytics";

describe("<AllocationChart />", () => {
  const mockByProject: AllocationSlice[] = [
    { id: "p1", label: "ProductiveTimer OS", color: "#3b82f6", seconds: 7200, percentage: 67 },
    { id: "p2", label: "Rust Backend", color: "#ccff00", seconds: 3600, percentage: 33 },
  ];

  const mockByLane: AllocationSlice[] = [
    { id: "l1", label: "Deep Coding", color: "#ccff00", seconds: 10800, percentage: 100 },
  ];

  const mockByGoal: AllocationSlice[] = [
    { id: "g1", label: "Launch V1", color: "#00e5ff", seconds: 10800, percentage: 100 },
  ];

  const mockByTod: AllocationSlice[] = [
    { id: "morning", label: "Morning (05:00 - 12:00)", color: "#ffab00", seconds: 10800, percentage: 100 },
  ];

  it("renders multi-dimensional breakdown and switches active dimension", () => {
    render(
      <AllocationChart
        byProject={mockByProject}
        byLane={mockByLane}
        byGoal={mockByGoal}
        byTimeOfDay={mockByTod}
        totalSeconds={10800}
      />,
    );

    // Initial project tab
    expect(screen.getByText("ProductiveTimer OS")).toBeDefined();
    expect(screen.getByText("Rust Backend")).toBeDefined();

    // Switch to Lane tab
    const laneBtn = screen.getByText("Lane");
    fireEvent.click(laneBtn);
    expect(screen.getByText("Deep Coding")).toBeDefined();

    // Switch to Goal tab
    const goalBtn = screen.getByText("Goal");
    fireEvent.click(goalBtn);
    expect(screen.getByText("Launch V1")).toBeDefined();

    // Switch to Time-of-Day tab
    const todBtn = screen.getByText("Time-of-Day");
    fireEvent.click(todBtn);
    expect(screen.getByText("Morning (05:00 - 12:00)")).toBeDefined();
  });
});
