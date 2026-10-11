import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RestTimer } from "./RestTimer";
import { ExerciseProgressionCard } from "./ExerciseProgressionCard";
import { LiveWorkoutStage } from "./LiveWorkoutStage";
import { PersonalRecordItemDto, WorkoutSessionDetailDto } from "../../types/api";

// Mock the LedgerContext
vi.mock("../../context/LedgerContext", () => ({
  useLedgerContext: () => ({
    soundEnabled: true,
  }),
}));

// Mock the apiClient
vi.mock("../../apiClient", () => ({
  fetchActiveWorkoutSessionApi: vi.fn(),
  startWorkoutSessionApi: vi.fn(),
  completeWorkoutSessionApi: vi.fn(),
  addWorkoutExerciseApi: vi.fn(),
  logWorkoutSetApi: vi.fn(),
  deleteWorkoutSetApi: vi.fn(),
  deleteWorkoutExerciseApi: vi.fn(),
  fetchAllPrsApi: vi.fn(),
  fetchExerciseProgressionApi: vi.fn(),
}));

import * as apiClient from "../../apiClient";

describe("<RestTimer />", () => {
  it("renders countdown interval and handles adjustments & skip", () => {
    const handleStop = vi.fn();
    const handleAdjust = vi.fn();

    render(
      <RestTimer
        secondsLeft={45}
        totalSeconds={90}
        onStop={handleStop}
        onAdjust={handleAdjust}
      />,
    );

    expect(screen.getByText("00:00:45")).toBeInTheDocument();
    expect(screen.getByText(/00:01:30/)).toBeInTheDocument();

    const add15Btn = screen.getByTitle("Add 15 seconds");
    fireEvent.click(add15Btn);
    expect(handleAdjust).toHaveBeenCalledWith(15);

    const skipBtn = screen.getByText("Skip Rest");
    fireEvent.click(skipBtn);
    expect(handleStop).toHaveBeenCalled();
  });

  it("returns null when secondsLeft is null or 0", () => {
    const { container } = render(
      <RestTimer secondsLeft={null} totalSeconds={90} onStop={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("<ExerciseProgressionCard />", () => {
  const mockPr: PersonalRecordItemDto = {
    exercise_name: "Barbell Bench Press",
    heaviest_weight: 100,
    max_reps: 8,
    estimated_1rm: 112.5,
    max_volume_set: 800,
  };

  it("renders personal records and triggers onOpenHistory", () => {
    const handleOpenHistory = vi.fn();

    render(<ExerciseProgressionCard pr={mockPr} onOpenHistory={handleOpenHistory} />);

    expect(screen.getByText("Barbell Bench Press")).toBeInTheDocument();
    expect(screen.getByText("100 kg")).toBeInTheDocument();
    expect(screen.getByText("112.5 kg")).toBeInTheDocument();
    expect(screen.getByText("8 reps")).toBeInTheDocument();

    const trendBtn = screen.getByText("Trend 📈");
    fireEvent.click(trendBtn);
    expect(handleOpenHistory).toHaveBeenCalledWith("Barbell Bench Press");
  });
});

describe("<LiveWorkoutStage />", () => {
  it("renders start session launcher when no active workout exists", async () => {
    vi.mocked(apiClient.fetchActiveWorkoutSessionApi).mockResolvedValueOnce(null);

    render(<LiveWorkoutStage />);

    await waitFor(() => {
      expect(
        screen.getByText("Structured Real-Time Workout Logger"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Start Ad-Hoc Session/)).toBeInTheDocument();
  });

  it("renders active session with exercise and checks off completed set", async () => {
    const mockSession: WorkoutSessionDetailDto = {
      id: "wsess-1",
      work_date: "2026-10-11",
      started_at: "2026-10-11T10:00:00Z",
      ended_at: null,
      notes: "",
      energy_rating: null,
      created_at: "2026-10-11T10:00:00Z",
      total_volume: 0,
      total_completed_sets: 0,
      exercises: [
        {
          id: "we-1",
          session_id: "wsess-1",
          exercise_name: "Incline Dumbbell Press",
          order_index: 1,
          sets: [
            {
              id: "ws-1",
              workout_exercise_id: "we-1",
              set_number: 1,
              weight: 30,
              reps: 10,
              rpe: 8.0,
              is_warmup: false,
              completed: false,
            },
          ],
        },
      ],
    };

    vi.mocked(apiClient.fetchActiveWorkoutSessionApi).mockResolvedValueOnce(mockSession);
    vi.mocked(apiClient.logWorkoutSetApi).mockResolvedValueOnce({
      ...mockSession.exercises[0].sets[0],
      completed: true,
    });

    render(<LiveWorkoutStage />);

    await waitFor(() => {
      expect(screen.getByText("Incline Dumbbell Press")).toBeInTheDocument();
    });

    expect(screen.getByText("#1")).toBeInTheDocument();
    const markSetBtn = screen.getByText("Mark Set");
    fireEvent.click(markSetBtn);

    await waitFor(() => {
      expect(apiClient.logWorkoutSetApi).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ws-1",
          completed: true,
        }),
      );
    });
  });
});
