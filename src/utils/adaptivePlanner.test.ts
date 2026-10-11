import { describe, it, expect } from "vitest";
import {
  generateAdaptiveDailyPlan,
  timeToMinutes,
  minutesToTime,
} from "./adaptivePlanner";
import { ActionTaskDto } from "../types/api";

describe("adaptivePlanner", () => {
  it("converts between minutes and time strings accurately", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(timeToMinutes("12:00")).toBe(720);
    expect(minutesToTime(720)).toBe("12:00");
  });

  it("prioritizes urgent and high tasks and strictly respects daily capacity cap", () => {
    const mockTasks: ActionTaskDto[] = [
      {
        id: "task-low",
        title: "Clean desk",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "low",
        estimate_minutes: 60,
      },
      {
        id: "task-urgent",
        title: "Hotfix prod crash",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "urgent",
        estimate_minutes: 60,
      },
      {
        id: "task-high",
        title: "Client report",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "high",
        estimate_minutes: 120,
      },
    ];

    const proposal = generateAdaptiveDailyPlan(mockTasks, {
      date: "2026-10-12",
      workStart: "09:00",
      workEnd: "17:00",
      dailyCapacityMaxMinutes: 180, // Cap is 3 hours (180 mins)
      estimationBiasFactor: 1.0,
      breakStart: "12:00",
      breakDurationMinutes: 60,
    });

    // Total planned minutes must NOT exceed 180
    expect(proposal.totalPlannedMinutes).toBeLessThanOrEqual(180);

    // Urgent task must be scheduled first
    expect(proposal.proposedBlocks.length).toBeGreaterThan(0);
    expect(proposal.proposedBlocks[0].action_task_id).toBe("task-urgent");
    expect(proposal.proposedBlocks[0].start_at).toBe("09:00");
    expect(proposal.proposedBlocks[0].end_at).toBe("10:00");

    // High task scheduled next (120 min fits into 180 total: 60 + 120 = 180)
    expect(proposal.proposedBlocks[1].action_task_id).toBe("task-high");
    expect(proposal.proposedBlocks[1].start_at).toBe("10:00");
    expect(proposal.proposedBlocks[1].end_at).toBe("12:00");

    // Low task cannot fit because total reached 180 min cap
    expect(proposal.unfitTasksCount).toBe(1);
    expect(proposal.proposedBlocks.find((b) => b.action_task_id === "task-low")).toBeUndefined();
  });

  it("applies estimation bias factor to scale task durations", () => {
    const mockTasks: ActionTaskDto[] = [
      {
        id: "task-code",
        title: "Refactor backend",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "high",
        estimate_minutes: 40,
      },
    ];

    // With bias 1.5x, 40m becomes 60m
    const proposal = generateAdaptiveDailyPlan(mockTasks, {
      date: "2026-10-12",
      workStart: "09:00",
      workEnd: "17:00",
      dailyCapacityMaxMinutes: 300,
      estimationBiasFactor: 1.5,
    });

    expect(proposal.proposedBlocks[0].duration_minutes).toBe(60);
    expect(proposal.proposedBlocks[0].start_at).toBe("09:00");
    expect(proposal.proposedBlocks[0].end_at).toBe("10:00");
    expect(proposal.totalPlannedMinutes).toBe(60);
  });

  it("skips scheduled lunch break intervals cleanly", () => {
    const mockTasks: ActionTaskDto[] = [
      {
        id: "task-morning",
        title: "Morning session",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "urgent",
        estimate_minutes: 120, // 2h: 09:00 - 11:00
      },
      {
        id: "task-noon",
        title: "Midday session",
        description: "",
        completion_notes: "",
        status: "ready",
        priority: "high",
        estimate_minutes: 120, // 2h: can't fit into 11:00 - 12:00 before lunch at 12:00, so must start after lunch (13:00)
      },
    ];

    const proposal = generateAdaptiveDailyPlan(mockTasks, {
      date: "2026-10-12",
      workStart: "09:00",
      workEnd: "17:00",
      breakStart: "12:00",
      breakDurationMinutes: 60, // Lunch 12:00 - 13:00
      dailyCapacityMaxMinutes: 400,
      estimationBiasFactor: 1.0,
    });

    expect(proposal.proposedBlocks[0].start_at).toBe("09:00");
    expect(proposal.proposedBlocks[0].end_at).toBe("11:00");

    // Midday session needs 120 min, only 60 min left before lunch (11:00-12:00), so jumps to 13:00
    expect(proposal.proposedBlocks[1].start_at).toBe("13:00");
    expect(proposal.proposedBlocks[1].end_at).toBe("15:00");
  });
});
