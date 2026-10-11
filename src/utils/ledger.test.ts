import { describe, it, expect } from "vitest";
import { canonicalizeData, buildInitialLedger, normalizeTaskName } from "./ledger";
import { LedgerData } from "../types/ledger";

describe("ledger utils", () => {
  it("normalizes task names by lowercasing and trimming spaces", () => {
    expect(normalizeTaskName("  Deep   Work  ")).toBe("deep work");
    expect(normalizeTaskName("FITNESS ")).toBe("fitness");
  });

  it("builds initial ledger with starter tasks and null active timer", () => {
    const initial = buildInitialLedger();
    expect(initial.tasks.length).toBeGreaterThan(0);
    expect(initial.sessions).toEqual([]);
    expect(initial.active).toBeNull();
  });

  it("canonicalizes duplicate task names by merging onto first instance", () => {
    const raw: Partial<LedgerData> = {
      tasks: [
        { id: "t1", name: "Coding", targetMinutes: 60, color: "#fff" },
        { id: "t2", name: "  coding  ", targetMinutes: 30, color: "#000" },
      ],
      sessions: [
        {
          id: "s1",
          taskId: "t2",
          seconds: 1800,
          date: "2026-10-10",
          endedAt: "2026-10-10T12:00:00Z",
        },
      ],
      workouts: [],
      completions: [],
    };

    const canonical = canonicalizeData(raw);
    expect(canonical.tasks.length).toBe(1);
    expect(canonical.tasks[0].id).toBe("t1");
    // Session originally mapped to t2 is remapped to t1
    expect(canonical.sessions[0].taskId).toBe("t1");
  });

  it("preserves valid active session when taskId exists in tasks", () => {
    const raw: Partial<LedgerData> = {
      tasks: [{ id: "t1", name: "Coding", targetMinutes: 45, color: "#fff" }],
      sessions: [],
      workouts: [],
      completions: [],
      active: {
        taskId: "t1",
        startedAt: 1000000,
        elapsedSeconds: 120,
        targetSeconds: 2700,
        paused: false,
        sessionId: "act-1",
        clientVersion: 1,
      },
    };

    const canonical = canonicalizeData(raw);
    expect(canonical.active).not.toBeNull();
    expect(canonical.active?.taskId).toBe("t1");
    expect(canonical.active?.elapsedSeconds).toBe(120);
    expect(canonical.active?.sessionId).toBe("act-1");
  });

  it("drops active session if referenced task does not exist", () => {
    const raw: Partial<LedgerData> = {
      tasks: [{ id: "t1", name: "Coding", targetMinutes: 45, color: "#fff" }],
      sessions: [],
      workouts: [],
      completions: [],
      active: {
        taskId: "non-existent-task",
        startedAt: 1000000,
        elapsedSeconds: 50,
        paused: false,
      },
    };

    const canonical = canonicalizeData(raw);
    expect(canonical.active).toBeNull();
  });
});
