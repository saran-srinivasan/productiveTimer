import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { EstimationAccuracyCard } from "./EstimationAccuracyCard";
import { EstimationAccuracyData } from "../../hooks/useAnalytics";

describe("<EstimationAccuracyCard />", () => {
  const mockData: EstimationAccuracyData = {
    totalTasksCalibrated: 3,
    totalEstimatedMinutes: 90,
    totalActualMinutes: 120,
    planningBiasFactor: 1.33,
    underestimatedCount: 2,
    accurateCount: 1,
    overestimatedCount: 0,
    tasks: [
      {
        taskId: "t1",
        taskTitle: "Refactor Rust Handlers",
        estimatedMinutes: 30,
        actualMinutes: 45,
        ratio: 1.5,
        status: "underestimated",
      },
      {
        taskId: "t2",
        taskTitle: "Add Migrations",
        estimatedMinutes: 30,
        actualMinutes: 32,
        ratio: 1.07,
        status: "accurate",
      },
      {
        taskId: "t3",
        taskTitle: "Write Vitest Suite",
        estimatedMinutes: 30,
        actualMinutes: 43,
        ratio: 1.43,
        status: "underestimated",
      },
    ],
  };

  it("renders planning bias factor and calibrated task breakdown", () => {
    render(<EstimationAccuracyCard data={mockData} />);

    expect(screen.getByText("1.33x")).toBeDefined();
    expect(screen.getByText("Refactor Rust Handlers")).toBeDefined();
    expect(screen.getByText("Write Vitest Suite")).toBeDefined();
    expect(screen.getByText(/Underestimating/)).toBeDefined();
  });
});
