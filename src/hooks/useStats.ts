import { useMemo } from "react";
import { FocusStats, FocusTask, FocusSession, WorkoutEntry, WorkoutStats } from "../types/ledger";
import { todayKey } from "../utils/date";

export const useFocusStats = (
  tasks: FocusTask[],
  sessions: FocusSession[],
): FocusStats =>
  useMemo(() => {
    const today = todayKey();
    const totalsByTask = new Map<string, number>(tasks.map((task) => [task.id, 0]));
    const todayByTask = new Map<string, number>(tasks.map((task) => [task.id, 0]));
    const byDate = new Map<
      string,
      { seconds: number; sessions: number; byTask: Map<string, number> }
    >();
    let todaySeconds = 0;
    let weekSeconds = 0;
    const sevenDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

    for (const session of sessions) {
      const validSeconds = Number(session.seconds) || 0;
      totalsByTask.set(
        session.taskId,
        (totalsByTask.get(session.taskId) ?? 0) + validSeconds,
      );

      if (session.date === today) {
        todayByTask.set(
          session.taskId,
          (todayByTask.get(session.taskId) ?? 0) + validSeconds,
        );
        todaySeconds += validSeconds;
      }

      const endedAtMs = session.endedAt ? new Date(session.endedAt).getTime() : 0;
      if (endedAtMs && endedAtMs >= sevenDaysAgo) {
        weekSeconds += validSeconds;
      } else if (
        !endedAtMs &&
        session.date &&
        new Date(`${session.date}T12:00:00`).getTime() >= sevenDaysAgo
      ) {
        weekSeconds += validSeconds;
      }

      const currentDay = byDate.get(session.date) ?? {
        seconds: 0,
        sessions: 0,
        byTask: new Map<string, number>(),
      };
      currentDay.seconds += validSeconds;
      currentDay.sessions += 1;
      currentDay.byTask.set(
        session.taskId,
        (currentDay.byTask.get(session.taskId) ?? 0) + validSeconds,
      );
      byDate.set(session.date, currentDay);
    }

    const topTask = tasks
      .map((task) => ({ ...task, seconds: totalsByTask.get(task.id) ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds)[0];

    // Calculate Active Day Streak
    const activeDates = new Set(
      sessions
        .filter((s) => (Number(s.seconds) || 0) > 0 && s.date)
        .map((s) => s.date),
    );

    let currentStreak = 0;
    const checkDate = new Date();
    const todayStr = today;
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().slice(0, 10);

    const pointer = new Date();
    if (!activeDates.has(todayStr) && activeDates.has(yesterdayStr)) {
      pointer.setDate(pointer.getDate() - 1);
    }

    while (activeDates.has(pointer.toISOString().slice(0, 10))) {
      currentStreak++;
      pointer.setDate(pointer.getDate() - 1);
    }

    return {
      totalsByTask,
      todayByTask,
      todaySeconds,
      weekSeconds,
      topTask,
      byDate,
      currentStreak,
    };
  }, [sessions, tasks]);

export const useWorkoutStats = (workouts: WorkoutEntry[]): WorkoutStats =>
  useMemo(() => {
    const today = todayKey();
    const byDate = new Map();
    let todayStrengthVolume = 0;
    let todayCardioMinutes = 0;
    let weekEntries = 0;
    let weekCardioMinutes = 0;
    let weekStrengthVolume = 0;
    const sevenDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

    for (const workout of workouts) {
      const volume =
        workout.kind === "strength"
          ? (Number(workout.sets) || 0) *
            (Number(workout.reps) || 0) *
            (Number(workout.weight) || 0)
          : 0;
      const cardioMinutes =
        workout.kind === "cardio" ? Number(workout.durationMinutes) || 0 : 0;
      const distance =
        workout.kind === "cardio" ? Number(workout.distance) || 0 : 0;
      const currentDay = byDate.get(workout.date) ?? {
        entries: [],
        strengthVolume: 0,
        cardioMinutes: 0,
        distance: 0,
        hardSets: 0,
      };

      currentDay.entries.push(workout);
      currentDay.strengthVolume += volume;
      currentDay.cardioMinutes += cardioMinutes;
      currentDay.distance += distance;
      currentDay.hardSets +=
        workout.kind === "strength" ? Number(workout.sets) || 0 : 0;
      byDate.set(workout.date, currentDay);

      if (workout.date === today) {
        todayStrengthVolume += volume;
        todayCardioMinutes += cardioMinutes;
      }

      if (workout.date && new Date(`${workout.date}T12:00:00`).getTime() >= sevenDaysAgo) {
        weekEntries += 1;
        weekCardioMinutes += cardioMinutes;
        weekStrengthVolume += volume;
      }
    }

    return {
      byDate,
      todayStrengthVolume,
      todayCardioMinutes,
      weekEntries,
      weekCardioMinutes,
      weekStrengthVolume,
    };
  }, [workouts]);
