import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TimerStage } from "./TimerStage";
import { FocusTask } from "../types/ledger";

describe("<TimerStage />", () => {
  const mockTask: FocusTask = {
    id: "task-1",
    name: "Antigravity Dev",
    targetMinutes: 45,
    color: "#ccff00",
  };

  it("renders in standby mode when no task is active", () => {
    render(
      <TimerStage
        onLogSession={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        setNote={vi.fn()}
      />,
    );

    expect(screen.getByText(/CHRONO STANDBY/i)).toBeInTheDocument();
    expect(screen.getByText(/00:00:00/)).toBeInTheDocument();
    expect(screen.getByText(/STATUS: READY/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stamp Log/i })).toBeDisabled();
  });

  it("renders active running task with clock and interactive buttons", () => {
    const handlePause = vi.fn();
    const handleLog = vi.fn();
    const handleCancel = vi.fn();

    render(
      <TimerStage
        activeTask={mockTask}
        activeElapsed={125} // 2m 5s
        activeIsPaused={false}
        note="Initial commit done"
        onLogSession={handleLog}
        onPause={handlePause}
        onResume={vi.fn()}
        onCancel={handleCancel}
        setNote={vi.fn()}
      />,
    );

    expect(screen.getByText(/LANE: Antigravity Dev/i)).toBeInTheDocument();
    expect(screen.getByText(/00:02:05/)).toBeInTheDocument();
    expect(screen.getByText(/STATUS: ENGAGED/i)).toBeInTheDocument();

    const pauseBtn = screen.getByTitle(/Pause active timer/i);
    expect(pauseBtn).not.toBeDisabled();
    fireEvent.click(pauseBtn);
    expect(handlePause).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByTitle(/Discard \/ cancel active timer/i);
    expect(discardBtn).not.toBeDisabled();
    fireEvent.click(discardBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const stampBtn = screen.getByTitle(/Complete and log this focus session/i);
    expect(stampBtn).not.toBeDisabled();
    fireEvent.click(stampBtn);
    expect(handleLog).toHaveBeenCalledTimes(1);
  });

  it("handles paused state correctly", () => {
    const handleResume = vi.fn();

    render(
      <TimerStage
        activeTask={mockTask}
        activeElapsed={60}
        activeIsPaused={true}
        onLogSession={vi.fn()}
        onPause={vi.fn()}
        onResume={handleResume}
        onCancel={vi.fn()}
        setNote={vi.fn()}
      />,
    );

    expect(screen.getByText(/STATUS: PAUSED/i)).toBeInTheDocument();
    const resumeBtn = screen.getByTitle(/Resume paused timer/i);
    expect(resumeBtn).not.toBeDisabled();
    fireEvent.click(resumeBtn);
    expect(handleResume).toHaveBeenCalledTimes(1);

    const pauseBtn = screen.getByTitle(/Pause active timer/i);
    expect(pauseBtn).toBeDisabled();
  });
});
