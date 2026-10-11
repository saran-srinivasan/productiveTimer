import { ActionTaskDto, PlannedBlockWithTaskDto } from "../types/api";

export interface AdaptivePlanConfig {
  date: string;
  workStart?: string; // "09:00"
  workEnd?: string; // "17:30"
  breakStart?: string; // "12:30"
  breakDurationMinutes?: number; // 60
  dailyCapacityMaxMinutes?: number; // 420 (7h)
  estimationBiasFactor?: number; // e.g. 1.25
  existingBlocks?: PlannedBlockWithTaskDto[];
}

export interface ProposedBlock {
  action_task_id: string;
  task_title: string;
  plan_date: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  original_estimate_minutes: number;
  priority: string;
  notes: string;
}

export interface AdaptivePlanProposal {
  date: string;
  proposedBlocks: ProposedBlock[];
  totalPlannedMinutes: number;
  availableCapacityMinutes: number;
  unfitTasksCount: number;
  estimationBiasApplied: number;
}

// Utility: convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Utility: convert minutes from midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateAdaptiveDailyPlan(
  tasks: ActionTaskDto[],
  config: AdaptivePlanConfig,
): AdaptivePlanProposal {
  const {
    date,
    workStart = "09:00",
    workEnd = "17:30",
    breakStart = "12:30",
    breakDurationMinutes = 60,
    dailyCapacityMaxMinutes = 420,
    estimationBiasFactor = 1.0,
    existingBlocks = [],
  } = config;

  const workStartMin = timeToMinutes(workStart);
  const workEndMin = timeToMinutes(workEnd);
  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin = breakStartMin + breakDurationMinutes;

  // 1. Filter actionable candidate tasks (not completed, not archived)
  const candidateTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "archived",
  );

  // 2. Priority scoring: urgent=4, high=3, medium=2, low=1
  const priorityWeight = (p: string) => {
    switch (p) {
      case "urgent":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      default:
        return 1;
    }
  };

  const sortedTasks = [...candidateTasks].sort((a, b) => {
    const pwDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pwDiff !== 0) return pwDiff;

    // earlier due date comes first
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
    if (a.due_at) return -1;
    if (b.due_at) return 1;

    // smaller estimate first
    return (a.estimate_minutes || 30) - (b.estimate_minutes || 30);
  });

  // 3. Mark occupied time slots from existing blocks and break
  interface TimeSlot {
    start: number;
    end: number;
  }

  const occupiedSlots: TimeSlot[] = [];

  // Add lunch break
  if (breakEndMin > breakStartMin) {
    occupiedSlots.push({ start: breakStartMin, end: breakEndMin });
  }

  // Add existing blocks on this date
  for (const eb of existingBlocks) {
    if (eb.plan_date === date) {
      occupiedSlots.push({
        start: timeToMinutes(eb.start_at),
        end: timeToMinutes(eb.end_at),
      });
    }
  }

  occupiedSlots.sort((a, b) => a.start - b.start);

  // 4. Build available free intervals between workStart and workEnd
  const freeIntervals: TimeSlot[] = [];
  let currentPointer = workStartMin;

  for (const occ of occupiedSlots) {
    if (occ.start > currentPointer && occ.start <= workEndMin) {
      freeIntervals.push({
        start: currentPointer,
        end: Math.min(occ.start, workEndMin),
      });
    }
    currentPointer = Math.max(currentPointer, occ.end);
  }

  if (currentPointer < workEndMin) {
    freeIntervals.push({
      start: currentPointer,
      end: workEndMin,
    });
  }

  // 5. Fit tasks into available intervals while respecting dailyCapacityMaxMinutes
  const proposedBlocks: ProposedBlock[] = [];
  let totalPlannedMinutes = 0;
  let intervalIdx = 0;
  let cursorMin = freeIntervals[0]?.start ?? workStartMin;
  let unfitTasksCount = 0;

  for (const task of sortedTasks) {
    if (intervalIdx >= freeIntervals.length) {
      unfitTasksCount++;
      continue;
    }

    const rawEstimate = task.estimate_minutes && task.estimate_minutes > 0 ? task.estimate_minutes : 45;
    const adjustedDuration = Math.max(
      15,
      Math.min(180, Math.round(rawEstimate * Math.max(0.5, estimationBiasFactor))),
    );

    // Check capacity limit
    if (totalPlannedMinutes + adjustedDuration > dailyCapacityMaxMinutes) {
      unfitTasksCount++;
      continue;
    }

    // Try to fit in current or subsequent free intervals
    let scheduled = false;
    while (intervalIdx < freeIntervals.length) {
      const currentInterval = freeIntervals[intervalIdx];
      cursorMin = Math.max(cursorMin, currentInterval.start);

      if (cursorMin + adjustedDuration <= currentInterval.end) {
        // Fits!
        const blockStart = minutesToTime(cursorMin);
        const blockEnd = minutesToTime(cursorMin + adjustedDuration);

        proposedBlocks.push({
          action_task_id: task.id,
          task_title: task.title,
          plan_date: date,
          start_at: blockStart,
          end_at: blockEnd,
          duration_minutes: adjustedDuration,
          original_estimate_minutes: rawEstimate,
          priority: task.priority,
          notes: `Calibrated with ${estimationBiasFactor.toFixed(2)}x bias multiplier`,
        });

        totalPlannedMinutes += adjustedDuration;
        cursorMin += adjustedDuration;
        scheduled = true;
        break;
      } else {
        // Does not fit in this interval, advance to next interval
        intervalIdx++;
        if (intervalIdx < freeIntervals.length) {
          cursorMin = freeIntervals[intervalIdx].start;
        }
      }
    }

    if (!scheduled) {
      unfitTasksCount++;
    }
  }

  return {
    date,
    proposedBlocks,
    totalPlannedMinutes,
    availableCapacityMinutes: dailyCapacityMaxMinutes,
    unfitTasksCount,
    estimationBiasApplied: estimationBiasFactor,
  };
}
