import { useMemo } from "react";
import { todayKey } from "../utils/date";

export const useFocusStats = (tasks, sessions) =>
  useMemo(() => {
    const today = todayKey();
    const totalsByTask = new Map(tasks.map((task) => [task.id, 0]));
    const todayByTask = new Map(tasks.map((task) => [task.id, 0]));
    const byDate = new Map();
    let todaySeconds = 0;
    let weekSeconds = 0;
    const sevenDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

    for (const session of sessions) {
      totalsByTask.set(
        session.taskId,
        (totalsByTask.get(session.taskId) ?? 0) + session.seconds,
      );

      if (session.date === today) {
        todayByTask.set(
          session.taskId,
          (todayByTask.get(session.taskId) ?? 0) + session.seconds,
        );
        todaySeconds += session.seconds;
      }

      if (new Date(session.endedAt).getTime() >= sevenDaysAgo) {
        weekSeconds += session.seconds;
      }

      const currentDay = byDate.get(session.date) ?? {
        seconds: 0,
        sessions: 0,
        byTask: new Map(),
      };
      currentDay.seconds += session.seconds;
      currentDay.sessions += 1;
      currentDay.byTask.set(
        session.taskId,
        (currentDay.byTask.get(session.taskId) ?? 0) + session.seconds,
      );
      byDate.set(session.date, currentDay);
    }

    const topTask = tasks
      .map((task) => ({ ...task, seconds: totalsByTask.get(task.id) ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds)[0];

    return {
      totalsByTask,
      todayByTask,
      todaySeconds,
      weekSeconds,
      topTask,
      byDate,
    };
  }, [sessions, tasks]);

export const useWorkoutStats = (workouts) =>
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

      if (new Date(`${workout.date}T12:00:00`).getTime() >= sevenDaysAgo) {
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
