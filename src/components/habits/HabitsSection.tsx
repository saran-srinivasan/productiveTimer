import React, { useState, useEffect, useMemo } from "react";
import {
  fetchHabitsApi,
  createHabitApi,
  updateHabitApi,
  deleteHabitApi,
  toggleHabitApi,
} from "../../apiClient";
import { HabitWithHistoryDto, CreateHabitRequestDto } from "../../types/api";
import { HabitRow } from "./HabitRow";
import { DailyReviewModal } from "../reviews/DailyReviewModal";
import { WeeklyReviewView } from "../reviews/WeeklyReviewView";

const HABIT_COLORS = [
  "#10b981", // Emerald
  "#ccff00", // Volt Lime
  "#00e5ff", // Chrono Cyan
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ff5722", // Hazard Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export const HabitsSection: React.FC = () => {
  const [habits, setHabits] = useState<HabitWithHistoryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review Modals State
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState<boolean>(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState<boolean>(false);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithHistoryDto | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formSchedule, setFormSchedule] = useState<string>("daily");
  const [formColor, setFormColor] = useState<string>(HABIT_COLORS[0]);
  const [formFrequency, setFormFrequency] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  // Generate rolling 7 days ending today
  const last7Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHabitsApi();
      setHabits(data);
    } catch (err: any) {
      setError(err.message || "Failed to load habits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const openCreateModal = () => {
    setEditingHabit(null);
    setFormName("");
    setFormSchedule("daily");
    setFormColor(HABIT_COLORS[0]);
    setFormFrequency(1);
    setIsModalOpen(true);
  };

  const openEditModal = (habit: HabitWithHistoryDto) => {
    setEditingHabit(habit);
    setFormName(habit.name);
    setFormSchedule(habit.schedule_rule);
    setFormColor(habit.color || HABIT_COLORS[0]);
    setFormFrequency(habit.target_frequency || 1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setSaving(true);
      if (editingHabit) {
        await updateHabitApi(editingHabit.id, {
          name: formName.trim(),
          schedule_rule: formSchedule,
          color: formColor,
          target_frequency: Number(formFrequency),
        });
      } else {
        const payload: CreateHabitRequestDto = {
          name: formName.trim(),
          schedule_rule: formSchedule,
          color: formColor,
          target_frequency: Number(formFrequency),
        };
        await createHabitApi(payload);
      }
      closeModal();
      await loadHabits();
    } catch (err: any) {
      alert("Error saving habit: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive / Delete this habit?")) return;
    try {
      await deleteHabitApi(id);
      await loadHabits();
    } catch (err: any) {
      alert("Error deleting habit: " + err.message);
    }
  };

  const handleToggleDate = async (habitId: string, date: string) => {
    try {
      await toggleHabitApi(habitId, { date });
      await loadHabits();
    } catch (err: any) {
      alert("Error toggling habit completion: " + err.message);
    }
  };

  // KPI Calculations
  const activeHabits = habits.filter((h) => h.active);
  const totalHabitsCount = activeHabits.length;
  const todayCompletedCount = activeHabits.filter((h) =>
    h.recent_dates.includes(todayStr)
  ).length;
  const bestStreak = activeHabits.reduce(
    (max, h) => Math.max(max, h.current_streak),
    0
  );

  // Overall 7-day adherence rate
  const totalExpectedChecks = totalHabitsCount * 7;
  const totalActualChecks = activeHabits.reduce((acc, h) => {
    const hitsIn7 = last7Days.filter((d) => h.recent_dates.includes(d)).length;
    return acc + hitsIn7;
  }, 0);
  const adherencePercent =
    totalExpectedChecks > 0
      ? Math.round((totalActualChecks / totalExpectedChecks) * 100)
      : 0;

  return (
    <section className="section-panel" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid var(--milled-border)",
          paddingBottom: "16px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                background: "var(--signal-green)",
                color: "#000",
                fontSize: "10px",
                fontWeight: "900",
                padding: "2px 6px",
                borderRadius: "3px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              MODULE.05
            </span>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "800",
                margin: 0,
                letterSpacing: "0.04em",
                color: "var(--fore-primary)",
              }}
            >
              HABIT MATRIX & REVIEWS
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fore-muted)" }}>
            Daily consistency tracker, streak preservation, end-of-day guided review, and weekly synthesis.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIsDailyReviewOpen(true)}
            style={{
              background: "var(--panel-module)",
              color: "var(--chrono-cyan)",
              border: "1px solid var(--chrono-cyan)",
              borderRadius: "4px",
              padding: "8px 14px",
              fontWeight: "700",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            📝 DAILY REVIEW
          </button>

          <button
            type="button"
            onClick={() => setIsWeeklyReviewOpen(true)}
            style={{
              background: "var(--panel-module)",
              color: "var(--phosphor-amber)",
              border: "1px solid var(--phosphor-amber)",
              borderRadius: "4px",
              padding: "8px 14px",
              fontWeight: "700",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            📊 WEEKLY SYNTHESIS
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              background: "var(--volt-lime)",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              fontWeight: "800",
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 12px rgba(204, 255, 0, 0.25)",
            }}
          >
            <span>⚡</span> + NEW HABIT
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            ACTIVE HABITS
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--fore-primary)", marginTop: "4px" }}>
            {totalHabitsCount}
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Tracked disciplines
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            TODAY'S PROGRESS
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--signal-green)", marginTop: "4px" }}>
            {todayCompletedCount}/{totalHabitsCount}
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            {totalHabitsCount > 0 ? Math.round((todayCompletedCount / totalHabitsCount) * 100) : 0}% done today
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            BEST ACTIVE STREAK
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--hazard-orange)", marginTop: "4px" }}>
            🔥 {bestStreak} DAYS
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Longest unbroken streak
          </div>
        </div>

        <div
          style={{
            background: "var(--panel-module)",
            border: "1px solid var(--milled-border)",
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
            7-DAY ADHERENCE
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--volt-lime)", marginTop: "4px" }}>
            {adherencePercent}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--fore-muted)", marginTop: "4px" }}>
            Rolling weekly consistency
          </div>
        </div>
      </div>

      {/* 7-Day Header Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 120px 80px",
          padding: "10px 16px",
          background: "var(--panel-module)",
          border: "1px solid var(--milled-border)",
          borderRadius: "6px 6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--fore-muted)",
          fontWeight: "700",
          gap: "16px",
        }}
      >
        <div>HABIT IDENTITY</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${last7Days.length}, 1fr)`, gap: "8px", textAlign: "center" }}>
          {last7Days.map((d) => {
            const dateObj = new Date(d);
            const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
            const dayNum = dateObj.getDate();
            const isToday = d === todayStr;

            return (
              <div key={d} style={{ color: isToday ? "var(--volt-lime)" : "inherit", fontWeight: isToday ? "900" : "700" }}>
                {weekday} {dayNum}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "right" }}>7D STATS</div>
        <div style={{ textAlign: "right" }}>ACTIONS</div>
      </div>

      {/* Habit Rows List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)" }}>
          [ SYNCHRONIZING HABIT MATRIX... ]
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--hazard-orange)", fontFamily: "var(--font-mono)" }}>
          FAILED TO LOAD HABITS: {error}
        </div>
      ) : habits.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--panel-module)",
            borderRadius: "0 0 6px 6px",
            border: "1px dashed var(--milled-border)",
            borderTop: "none",
            color: "var(--fore-muted)",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌿</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--fore-primary)", marginBottom: "4px" }}>
            NO HABITS DEFINED YET
          </div>
          <p style={{ fontSize: "13px", maxWidth: "440px", margin: "0 auto 16px auto" }}>
            Create repeatable routines (e.g. morning workout, reading 20m, zero sugar) to build atomic discipline.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              background: "var(--volt-lime)",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              padding: "6px 14px",
              fontWeight: "700",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            CREATE FIRST HABIT
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              days={last7Days}
              onToggleDate={handleToggleDate}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal: Define / Edit Habit */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "var(--panel-module)",
              border: "2px solid var(--volt-lime)",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--milled-border)",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--volt-lime)", fontFamily: "var(--font-mono)" }}>
                {editingHabit ? "[ EDIT HABIT DEFINITION ]" : "[ DEFINE NEW HABIT ]"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--fore-muted)",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  HABIT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Read 20 mins, Cold shower, Zero social media"
                  style={{
                    width: "100%",
                    background: "var(--chassis-bg)",
                    border: "1px solid var(--milled-border)",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    color: "var(--fore-primary)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Schedule Rule & Frequency */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    SCHEDULE RULE
                  </label>
                  <select
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <option value="daily">Daily (Every Day)</option>
                    <option value="weekdays">Weekdays Only</option>
                    <option value="weekly">Weekly Target</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                    FREQUENCY / DAY
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: "100%",
                      background: "var(--chassis-bg)",
                      border: "1px solid var(--milled-border)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      color: "var(--fore-primary)",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--fore-muted)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                  COLOR INDICATOR
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: c,
                        border: formColor === c ? "2px solid #fff" : "1px solid rgba(0,0,0,0.5)",
                        cursor: "pointer",
                        boxShadow: formColor === c ? `0 0 8px ${c}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent",
                    color: "var(--fore-muted)",
                    border: "1px solid var(--milled-border)",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "var(--volt-lime)",
                    color: "#000",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 18px",
                    fontWeight: "800",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(204, 255, 0, 0.3)",
                  }}
                >
                  {saving ? "COMMITTING..." : editingHabit ? "UPDATE HABIT" : "CONFIRM HABIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guided Daily Review Modal */}
      <DailyReviewModal
        isOpen={isDailyReviewOpen}
        onClose={() => setIsDailyReviewOpen(false)}
        initialDate={todayStr}
      />

      {/* Weekly Review Synthesis View */}
      {isWeeklyReviewOpen && (
        <WeeklyReviewView
          isOpen={isWeeklyReviewOpen}
          onClose={() => setIsWeeklyReviewOpen(false)}
        />
      )}
    </section>
  );
};
