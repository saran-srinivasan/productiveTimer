import { useMemo } from "react";
import { FocusSession, FocusTask } from "../types/ledger";
import {
  ActionTaskDto,
  ProjectSummaryDto,
  GoalWithMilestonesDto,
  PlannedBlockWithTaskDto,
} from "../types/api";

export type AnalyticsTimeRange = "7d" | "30d" | "all";

export interface AllocationSlice {
  id: string;
  label: string;
  color: string;
  seconds: number;
  percentage: number;
}

export interface EstimationTaskAccuracy {
  taskId: string;
  taskTitle: string;
  estimatedMinutes: number;
  actualMinutes: number;
  ratio: number;
  status: "accurate" | "underestimated" | "overestimated";
}

export interface EstimationAccuracyData {
  totalTasksCalibrated: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  planningBiasFactor: number; // e.g. 1.25x = takes 25% longer
  underestimatedCount: number;
  accurateCount: number;
  overestimatedCount: number;
  tasks: EstimationTaskAccuracy[];
}

export interface SlippageAnalyticsData {
  totalPlannedBlocks: number;
  completedBlocksCount: number;
  rescheduledCount: number;
  skippedCount: number;
  slippageRatePercentage: number;
  overdueTasksCount: number;
  frequentBlockers: Array<{ word: string; count: number }>;
}

export interface AnalyticsData {
  timeRange: AnalyticsTimeRange;
  totalSeconds: number;
  byProject: AllocationSlice[];
  byLane: AllocationSlice[];
  byGoal: AllocationSlice[];
  byTimeOfDay: AllocationSlice[];
  estimation: EstimationAccuracyData;
  slippage: SlippageAnalyticsData;
}

interface UseAnalyticsParams {
  sessions?: FocusSession[];
  lanes?: FocusTask[];
  tasks?: ActionTaskDto[];
  projects?: ProjectSummaryDto[];
  goals?: GoalWithMilestonesDto[];
  plannedBlocks?: PlannedBlockWithTaskDto[];
  timeRange?: AnalyticsTimeRange;
}

export function useAnalytics({
  sessions = [],
  lanes = [],
  tasks = [],
  projects = [],
  goals = [],
  plannedBlocks = [],
  timeRange = "7d",
}: UseAnalyticsParams): AnalyticsData {
  return useMemo(() => {
    // 1. Filter sessions by date range
    const now = new Date();
    const cutoffDate = new Date();
    if (timeRange === "7d") {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeRange === "30d") {
      cutoffDate.setDate(now.getDate() - 30);
    } else {
      cutoffDate.setFullYear(2000); // all
    }
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const filteredSessions = sessions.filter(
      (s) => !s.date || s.date >= cutoffStr,
    );
    const totalSeconds = filteredSessions.reduce((acc, s) => acc + s.seconds, 0);

    // Maps for rapid lookup
    const laneMap = new Map(lanes.map((l) => [l.id, l]));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const goalMap = new Map(goals.map((g) => [g.id, g]));

    // --- A. Allocation by Focus Lane ---
    const laneSeconds = new Map<string, number>();
    for (const s of filteredSessions) {
      const prev = laneSeconds.get(s.taskId) || 0;
      laneSeconds.set(s.taskId, prev + s.seconds);
    }
    const byLane: AllocationSlice[] = Array.from(laneSeconds.entries())
      .map(([laneId, secs]) => {
        const lane = laneMap.get(laneId);
        return {
          id: laneId,
          label: lane?.name || "Unknown Lane",
          color: lane?.color || "#ccff00",
          seconds: secs,
          percentage: totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    // --- B. Allocation by Project ---
    const projectSeconds = new Map<string, number>();
    for (const s of filteredSessions) {
      let projId = "no_project";
      if (s.actionTaskId) {
        const actionTask = taskMap.get(s.actionTaskId);
        if (actionTask?.project_id) {
          projId = actionTask.project_id;
        }
      }
      const prev = projectSeconds.get(projId) || 0;
      projectSeconds.set(projId, prev + s.seconds);
    }
    const byProject: AllocationSlice[] = Array.from(projectSeconds.entries())
      .map(([pId, secs]) => {
        const proj = projectMap.get(pId);
        return {
          id: pId,
          label: proj ? proj.name : "(General / No Project)",
          color: proj ? proj.color : "#4b5563",
          seconds: secs,
          percentage: totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    // --- C. Allocation by Goal ---
    const goalSeconds = new Map<string, number>();
    for (const s of filteredSessions) {
      let gId = "no_goal";
      if (s.actionTaskId) {
        const actionTask = taskMap.get(s.actionTaskId);
        if (actionTask?.goal_id) {
          gId = actionTask.goal_id;
        }
      }
      const prev = goalSeconds.get(gId) || 0;
      goalSeconds.set(gId, prev + s.seconds);
    }
    const goalColors = ["#00e5ff", "#ccff00", "#ffab00", "#a855f7", "#ec4899", "#3b82f6"];
    let goalColorIdx = 0;
    const byGoal: AllocationSlice[] = Array.from(goalSeconds.entries())
      .map(([gId, secs]) => {
        const goal = goalMap.get(gId);
        return {
          id: gId,
          label: goal ? goal.title : "(Unassigned to Goal)",
          color: goal ? goalColors[goalColorIdx++ % goalColors.length] : "#4b5563",
          seconds: secs,
          percentage: totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);

    // --- D. Allocation by Time of Day ---
    // Morning: 05:00 - 12:00, Afternoon: 12:00 - 17:00, Evening: 17:00 - 22:00, Night: 22:00 - 05:00
    const todSeconds = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };

    for (const s of filteredSessions) {
      let hour = 10; // default morning
      const ts = s.startedAt || s.endedAt;
      if (ts) {
        try {
          hour = new Date(ts).getHours();
        } catch {
          // ignore parsing error
        }
      }
      if (hour >= 5 && hour < 12) {
        todSeconds.morning += s.seconds;
      } else if (hour >= 12 && hour < 17) {
        todSeconds.afternoon += s.seconds;
      } else if (hour >= 17 && hour < 22) {
        todSeconds.evening += s.seconds;
      } else {
        todSeconds.night += s.seconds;
      }
    }

    const byTimeOfDay: AllocationSlice[] = [
      {
        id: "morning",
        label: "Morning (05:00 - 12:00)",
        color: "#ffab00",
        seconds: todSeconds.morning,
        percentage: totalSeconds > 0 ? Math.round((todSeconds.morning / totalSeconds) * 100) : 0,
      },
      {
        id: "afternoon",
        label: "Afternoon (12:00 - 17:00)",
        color: "#00e5ff",
        seconds: todSeconds.afternoon,
        percentage: totalSeconds > 0 ? Math.round((todSeconds.afternoon / totalSeconds) * 100) : 0,
      },
      {
        id: "evening",
        label: "Evening (17:00 - 22:00)",
        color: "#a855f7",
        seconds: todSeconds.evening,
        percentage: totalSeconds > 0 ? Math.round((todSeconds.evening / totalSeconds) * 100) : 0,
      },
      {
        id: "night",
        label: "Night (22:00 - 05:00)",
        color: "#3b82f6",
        seconds: todSeconds.night,
        percentage: totalSeconds > 0 ? Math.round((todSeconds.night / totalSeconds) * 100) : 0,
      },
    ].filter((s) => s.seconds > 0);

    // --- 2. Task Estimation Accuracy Analytics ---
    // Compare task estimate_minutes with actual session seconds
    const taskActualSeconds = new Map<string, number>();
    for (const s of sessions) {
      if (s.actionTaskId) {
        const prev = taskActualSeconds.get(s.actionTaskId) || 0;
        taskActualSeconds.set(s.actionTaskId, prev + s.seconds);
      }
    }

    const completedWithEstimates = tasks.filter(
      (t) => t.status === "completed" && t.estimate_minutes && t.estimate_minutes > 0,
    );

    let sumEstimatedMin = 0;
    let sumActualMin = 0;
    let underCount = 0;
    let accurateCount = 0;
    let overCount = 0;

    const taskAccuracyList: EstimationTaskAccuracy[] = completedWithEstimates.map((t) => {
      const actSec = taskActualSeconds.get(t.id) || 0;
      const actMin = Math.round(actSec / 60);
      const estMin = t.estimate_minutes || 1;
      sumEstimatedMin += estMin;
      sumActualMin += actMin;

      const ratio = Number((actMin / estMin).toFixed(2));
      let status: "accurate" | "underestimated" | "overestimated" = "accurate";
      if (ratio > 1.2) {
        status = "underestimated"; // took longer than estimated
        underCount++;
      } else if (ratio < 0.8) {
        status = "overestimated"; // finished faster than estimated
        overCount++;
      } else {
        accurateCount++;
      }

      return {
        taskId: t.id,
        taskTitle: t.title,
        estimatedMinutes: estMin,
        actualMinutes: actMin,
        ratio,
        status,
      };
    });

    const planningBiasFactor =
      sumEstimatedMin > 0
        ? Number((sumActualMin / sumEstimatedMin).toFixed(2))
        : 1.0;

    const estimation: EstimationAccuracyData = {
      totalTasksCalibrated: completedWithEstimates.length,
      totalEstimatedMinutes: sumEstimatedMin,
      totalActualMinutes: sumActualMin,
      planningBiasFactor,
      underestimatedCount: underCount,
      accurateCount,
      overestimatedCount: overCount,
      tasks: taskAccuracyList,
    };

    // --- 3. Task Slippage & Carry-Forward Tracking ---
    const totalBlocks = plannedBlocks.length;
    let rescheduled = 0;
    let skipped = 0;
    let completedBlocks = 0;
    const blockerWordCounts = new Map<string, number>();

    for (const pb of plannedBlocks) {
      if (pb.status === "rescheduled") rescheduled++;
      else if (pb.status === "skipped") skipped++;
      else if (pb.status === "completed") completedBlocks++;

      if (pb.notes && (pb.status === "rescheduled" || pb.status === "skipped")) {
        const words = pb.notes
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3 && !["this", "that", "with", "have", "from"].includes(w));
        for (const w of words) {
          blockerWordCounts.set(w, (blockerWordCounts.get(w) || 0) + 1);
        }
      }
    }

    const slippageRate =
      totalBlocks > 0
        ? Math.round(((rescheduled + skipped) / totalBlocks) * 100)
        : 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const overdueCount = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "archived" && t.due_at && t.due_at < todayStr,
    ).length;

    const frequentBlockers = Array.from(blockerWordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    const slippage: SlippageAnalyticsData = {
      totalPlannedBlocks: totalBlocks,
      completedBlocksCount: completedBlocks,
      rescheduledCount: rescheduled,
      skippedCount: skipped,
      slippageRatePercentage: slippageRate,
      overdueTasksCount: overdueCount,
      frequentBlockers,
    };

    return {
      timeRange,
      totalSeconds,
      byProject,
      byLane,
      byGoal,
      byTimeOfDay,
      estimation,
      slippage,
    };
  }, [sessions, lanes, tasks, projects, goals, plannedBlocks, timeRange]);
}
