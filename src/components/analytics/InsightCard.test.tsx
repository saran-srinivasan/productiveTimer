import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { InsightCard } from "./InsightCard";
import { InsightItemDto } from "../../types/api";

describe("<InsightCard />", () => {
  const mockInsight: InsightItemDto = {
    id: "insight-1",
    rule_id: "overdue_high_priority",
    title: "2 High-Priority Task(s) Overdue",
    message: "2 critical tasks past deadline (e.g. 'Fix Prod Bug').",
    severity: "alert",
    category: "tasks",
    metric_name: "overdue_urgent_count",
    formula: "COUNT(action_tasks WHERE status != 'completed' AND due_at < now)",
    data_points: { count: 2, task_titles: ["Fix Prod Bug", "Ship Auth"] },
    supporting_record_ids: ["task-1", "task-2"],
    created_at: "2026-10-11T12:00:00Z",
  };

  it("renders insight details and opens evidence drill-down modal", () => {
    render(<InsightCard insight={mockInsight} />);

    expect(screen.getByText("2 High-Priority Task(s) Overdue")).toBeDefined();
    expect(screen.getByText(/2 critical tasks past deadline/)).toBeDefined();

    // Click View Evidence
    const evidenceBtn = screen.getByText("🔍 View Evidence");
    fireEvent.click(evidenceBtn);

    // Modal opens showing formula and supporting IDs
    expect(screen.getByText(/COUNT\(action_tasks WHERE status != 'completed'/)).toBeDefined();
    expect(screen.getByText("task-1")).toBeDefined();
    expect(screen.getByText("task-2")).toBeDefined();
  });
});
