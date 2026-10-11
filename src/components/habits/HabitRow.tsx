import React from "react";
import { HabitWithHistoryDto } from "../../types/api";

interface HabitRowProps {
  habit: HabitWithHistoryDto;
  days: string[]; // 7 dates: ["2026-10-05", ..., "2026-10-11"]
  onToggleDate: (habitId: string, date: string) => Promise<void>;
  onEdit: (habit: HabitWithHistoryDto) => void;
  onDelete: (id: string) => void;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  habit,
  days,
  onToggleDate,
  onEdit,
  onDelete,
}) => {
  const completedSet = new Set(habit.recent_dates);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 120px 80px",
        alignItems: "center",
        padding: "12px 16px",
        background: "var(--panel-module)",
        border: "1px solid var(--milled-border)",
        borderRadius: "6px",
        gap: "16px",
        transition: "all 0.2s ease",
      }}
    >
      {/* Habit Info & Streak */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: habit.color || "var(--signal-green)",
            boxShadow: `0 0 6px ${habit.color || "var(--signal-green)"}`,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--fore-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {habit.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--fore-muted)",
                textTransform: "uppercase",
              }}
            >
              {habit.schedule_rule}
            </span>
            {habit.current_streak > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "var(--hazard-orange)",
                  background: "rgba(255, 87, 34, 0.15)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                🔥 {habit.current_streak}D STREAK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Matrix Toggles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${days.length}, 1fr)`,
          gap: "8px",
          alignItems: "center",
        }}
      >
        {days.map((date) => {
          const isDone = completedSet.has(date);
          const isToday = date === new Date().toISOString().split("T")[0];

          return (
            <button
              key={date}
              type="button"
              onClick={() => onToggleDate(habit.id, date)}
              title={`${habit.name} on ${date}: ${isDone ? "Completed" : "Not completed"}`}
              style={{
                height: "32px",
                borderRadius: "4px",
                border: isToday
                  ? `2px solid ${isDone ? habit.color || "var(--signal-green)" : "var(--volt-lime)"}`
                  : `1px solid ${isDone ? habit.color || "var(--signal-green)" : "var(--milled-border)"}`,
                background: isDone
                  ? habit.color || "var(--signal-green)"
                  : "rgba(0, 0, 0, 0.3)",
                color: isDone ? "#000" : "var(--fore-muted)",
                fontWeight: "900",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
            >
              {isDone ? "✓" : "·"}
            </button>
          );
        })}
      </div>

      {/* Completion Stat */}
      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <span style={{ color: "var(--fore-primary)", fontWeight: "800" }}>
          {days.filter((d) => completedSet.has(d)).length}/{days.length}
        </span>
        <span style={{ color: "var(--fore-muted)", fontSize: "10px", marginLeft: "4px" }}>
          (
          {days.length > 0
            ? Math.round((days.filter((d) => completedSet.has(d)).length / days.length) * 100)
            : 0}
          %)
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
        <button
          type="button"
          onClick={() => onEdit(habit)}
          title="Edit Habit"
          style={{
            background: "transparent",
            color: "var(--fore-muted)",
            border: "1px solid var(--milled-border)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          EDIT
        </button>
        <button
          type="button"
          onClick={() => onDelete(habit.id)}
          title="Delete Habit"
          style={{
            background: "transparent",
            color: "var(--stamp-crimson)",
            border: "none",
            fontSize: "14px",
            cursor: "pointer",
            padding: "4px 6px",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
