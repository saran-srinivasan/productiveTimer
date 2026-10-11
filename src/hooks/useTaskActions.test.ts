import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskActions } from "./useTaskActions";
import { buildInitialLedger } from "../utils/ledger";
import { LedgerData, SyncState } from "../types/ledger";

// Mock apiClient functions
vi.mock("../apiClient", () => ({
  deleteTaskApi: vi.fn().mockResolvedValue({}),
  deleteSessionApi: vi.fn().mockResolvedValue({}),
  upsertActiveSessionApi: vi.fn().mockResolvedValue({}),
  deleteActiveSessionApi: vi.fn().mockResolvedValue({}),
  completeFocusSessionApi: vi.fn().mockResolvedValue({}),
}));

describe("useTaskActions hook", () => {
  it("starts a task and initializes active session state", () => {
    let state: LedgerData = buildInitialLedger();
    const setState = (updater: any) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };
    let sync: SyncState = "Cloud synced";
    const setSync = (val: any) => {
      sync = val;
    };

    const { result } = renderHook(() =>
      useTaskActions({
        setData: setState,
        setSyncState: setSync,
        soundEnabled: false,
        token: "mock-token",
      }),
    );

    const testTaskId = state.tasks[0].id;

    act(() => {
      result.current.startTask(testTaskId, 25);
    });

    expect(state.active).not.toBeNull();
    expect(state.active?.taskId).toBe(testTaskId);
    expect(state.active?.paused).toBe(false);
    expect(state.active?.targetSeconds).toBe(1500);
    expect(state.active?.sessionId).toBeDefined();
  });

  it("pauses and resumes an active timer", () => {
    let state: LedgerData = buildInitialLedger();
    const setState = (updater: any) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };

    const { result } = renderHook(() =>
      useTaskActions({
        setData: setState,
        setSyncState: vi.fn(),
        soundEnabled: false,
        token: "mock-token",
      }),
    );

    const testTaskId = state.tasks[0].id;

    act(() => {
      result.current.startTask(testTaskId);
    });
    expect(state.active?.paused).toBe(false);

    act(() => {
      result.current.pauseTimer();
    });
    expect(state.active?.paused).toBe(true);
    expect(state.active?.clientVersion).toBe(2);

    act(() => {
      result.current.resumeTimer();
    });
    expect(state.active?.paused).toBe(false);
    expect(state.active?.clientVersion).toBe(3);
  });

  it("cancels an active session cleanly", () => {
    let state: LedgerData = buildInitialLedger();
    const setState = (updater: any) => {
      state = typeof updater === "function" ? updater(state) : updater;
    };

    const { result } = renderHook(() =>
      useTaskActions({
        setData: setState,
        setSyncState: vi.fn(),
        soundEnabled: false,
        token: "mock-token",
      }),
    );

    act(() => {
      result.current.startTask(state.tasks[0].id);
    });
    expect(state.active).not.toBeNull();

    act(() => {
      result.current.cancelTimer();
    });
    expect(state.active).toBeNull();
  });
});
