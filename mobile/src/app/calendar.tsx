import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useLedger } from "../context/LedgerContext";
import { useManualSession } from "../hooks/useManualSession";
import { useFocusStats, useWorkoutStats } from "../hooks/useStats";
import { weekDays } from "../constants";
import { buildMonthDays, monthKey, todayKey, monthTitle } from "../utils/date";
import { formatDuration, formatDistance } from "../utils/format";

export default function CalendarScreen() {
  const { data, setData, syncState, setSyncState } = useLedger();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const stats = useFocusStats(data.tasks, data.sessions);
  const workoutStats = useWorkoutStats(data.workouts);

  const manualSession = useManualSession({
    tasks: data.tasks,
    selectedDate,
    setData,
  });

  const changeMonth = (offset) => {
    setMonthDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const calendar = useMemo(() => {
    const visibleMonth = monthKey(monthDate);
    const monthSessions = data.sessions.filter((session) =>
      session.date?.startsWith(visibleMonth),
    );
    const monthWorkouts = data.workouts.filter((workout) =>
      workout.date?.startsWith(visibleMonth),
    );

    return {
      monthDays: buildMonthDays(monthDate),
      monthSeconds: monthSessions.reduce(
        (total, session) => total + session.seconds,
        0,
      ),
      activeDays: new Set(monthSessions.map((session) => session.date)).size,
      workoutDays: new Set(monthWorkouts.map((workout) => workout.date)).size,
      monthCardioMinutes: monthWorkouts.reduce(
        (total, workout) =>
          total +
          (workout.kind === "cardio"
            ? Number(workout.durationMinutes) || 0
            : 0),
        0,
      ),
    };
  }, [data.sessions, data.workouts, monthDate]);

  const selectedSessions = useMemo(
    () => data.sessions.filter((session) => session.date === selectedDate),
    [data.sessions, selectedDate],
  );

  const selectedWorkouts = workoutStats.byDate.get(selectedDate)?.entries ?? [];

  const selectedTaskTotals = useMemo(
    () =>
      data.tasks
        .map((task) => ({
          task,
          seconds: stats.byDate.get(selectedDate)?.byTask.get(task.id) ?? 0,
        }))
        .filter((item) => item.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds),
    [data.tasks, selectedDate, stats.byDate],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CALENDAR</Text>
            <Text style={styles.title}>{monthTitle(monthDate)}</Text>
          </View>
          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => changeMonth(-1)}
            >
              <Text style={styles.controlBtnText}>Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setMonthDate(new Date())}
            >
              <Text style={styles.controlBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => changeMonth(1)}
            >
              <Text style={styles.controlBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Summary Metrics */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>MONTH TOTAL</Text>
            <Text style={styles.summaryVal}>
              {formatDuration(calendar.monthSeconds)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>ACTIVE DAYS</Text>
            <Text style={styles.summaryVal}>{calendar.activeDays}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>WORKOUTS</Text>
            <Text style={styles.summaryVal}>{calendar.workoutDays}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>CARDIO</Text>
            <Text style={styles.summaryVal}>{calendar.monthCardioMinutes}m</Text>
          </View>
        </View>

        {/* Calendar Grid Container */}
        <View style={styles.gridContainer}>
          <View style={styles.weekdayRow}>
            {weekDays.map((day) => (
              <Text style={styles.weekdayText} key={day}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendar.monthDays.map((day, index) => {
              if (!day) {
                return (
                  <View style={styles.emptyDay} key={`empty-${index}`} />
                );
              }

              const dayStats = stats.byDate.get(day.dateKey);
              const workoutDayStats = workoutStats.byDate.get(day.dateKey);
              const isSelected = selectedDate === day.dateKey;

              const taskSegments = data.tasks
                .map((task) => ({
                  id: task.id,
                  color: task.color,
                  seconds: dayStats?.byTask.get(task.id) ?? 0,
                }))
                .filter((t) => t.seconds > 0)
                .sort((a, b) => b.seconds - a.seconds);

              return (
                <TouchableOpacity
                  key={day.dateKey}
                  style={[
                    styles.dayCell,
                    day.isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                    workoutDayStats && styles.workoutDayCell,
                  ]}
                  onPress={() => setSelectedDate(day.dateKey)}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.selectedDayNumber,
                    ]}
                  >
                    {day.day}
                  </Text>
                  {dayStats && (
                    <Text style={styles.dayFocusTime}>
                      {formatDuration(dayStats.seconds)}
                    </Text>
                  )}
                  {workoutDayStats && (
                    <Text style={styles.dayWorkoutInfo}>
                      {workoutDayStats.cardioMinutes
                        ? `${workoutDayStats.cardioMinutes}m`
                        : `${workoutDayStats.hardSets}s`}
                    </Text>
                  )}
                  {/* Task visual segment marks */}
                  {dayStats && (
                    <View style={styles.dayTaskMarks}>
                      {taskSegments.slice(0, 3).map((task) => (
                        <View
                          key={task.id}
                          style={[
                            styles.taskMarkSegment,
                            {
                              backgroundColor: task.color,
                              flex: Math.max(1, task.seconds),
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Day Detail Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardShadow} />
          <View style={styles.card}>
            <Text style={styles.detailTitle}>Selected Date: {selectedDate}</Text>

            {/* Manual Session Log Form */}
            {data.tasks.length > 0 ? (
              <View style={styles.manualForm}>
                <Text style={styles.formSectionTitle}>Add Manual Focus Log</Text>

                {/* Preset Chips for Task selection */}
                <Text style={styles.fieldLabel}>Pick Task</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.presetChipsRow}
                >
                  {data.tasks.map((task) => {
                    const isSelected = manualSession.manualTaskId === task.id;
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[
                          styles.presetChip,
                          isSelected && { backgroundColor: task.color },
                        ]}
                        onPress={() => manualSession.setManualTaskId(task.id)}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && { color: "#fff" },
                          ]}
                        >
                          {task.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Duration minutes input */}
                <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={String(manualSession.manualMinutes)}
                  onChangeText={(val) => manualSession.setManualMinutes(Number(val) || 0)}
                />

                {/* Manual Note */}
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What got done?"
                  placeholderTextColor="#766e61"
                  value={manualSession.manualNote}
                  onChangeText={manualSession.setManualNote}
                />

                {/* Submit button */}
                <View style={[styles.buttonWrapper, { marginTop: 12 }]}>
                  <View style={styles.buttonShadow} />
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={manualSession.addManualSession}
                  >
                    <Text style={styles.btnPrimaryText}>Add Focus Log</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyState}>Create a task first to log focus times.</Text>
            )}

            {/* Selected Task Totals */}
            <Text style={styles.detailSubTitle}>Focus Summary</Text>
            {selectedTaskTotals.length ? (
              <View style={styles.totalsList}>
                {selectedTaskTotals.map(({ task, seconds }) => (
                  <View style={styles.totalRow} key={task.id}>
                    <View
                      style={[styles.logIndicator, { backgroundColor: task.color }]}
                    />
                    <Text style={styles.totalTaskName}>{task.name}</Text>
                    <Text style={styles.totalDuration}>
                      {formatDuration(seconds)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyState}>No focus records on this day.</Text>
            )}

            {/* Focus Log List */}
            <Text style={styles.detailSubTitle}>Focus Logs</Text>
            {selectedSessions.length ? (
              <View style={styles.sessionList}>
                {selectedSessions.map((session) => {
                  const task = data.tasks.find((t) => t.id === session.taskId);
                  return (
                    <View style={styles.logRow} key={session.id}>
                      <View
                        style={[
                          styles.logIndicator,
                          { backgroundColor: task?.color ?? "#222" },
                        ]}
                      />
                      <View style={styles.logDetails}>
                        <Text style={styles.logTaskName}>
                          {task?.name ?? "Deleted task"}
                        </Text>
                        <Text style={styles.logNote}>
                          {session.note || "Focused work logged"}
                        </Text>
                      </View>
                      <Text style={styles.logDuration}>
                        {formatDuration(session.seconds)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyState}>No work sessions recorded.</Text>
            )}

            {/* Workout Log List */}
            <Text style={styles.detailSubTitle}>Workout Log</Text>
            {selectedWorkouts.length ? (
              <View style={styles.workoutList}>
                {selectedWorkouts.map((workout) => (
                  <View style={styles.workoutRow} key={workout.id}>
                    <View
                      style={[
                        styles.workoutIndicator,
                        {
                          backgroundColor:
                            workout.kind === "cardio" ? "#346fa3" : "#6a4f7d",
                        },
                      ]}
                    />
                    <View style={styles.workoutDetails}>
                      <Text style={styles.workoutName}>{workout.exercise}</Text>
                      <Text style={styles.workoutMeta}>
                        {workout.kind === "strength"
                          ? `${workout.sets} x ${workout.reps} @ ${workout.weight}kg`
                          : `${workout.durationMinutes}m, ${formatDistance(workout.distance)}`}
                        {workout.note ? ` - ${workout.note}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyState}>No workouts logged on this day.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f0e6",
  },
  container: {
    padding: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderColor: "#2f2a20",
    marginBottom: 20,
  },
  eyebrow: {
    color: "#d84b35",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Georgia",
    fontSize: 24,
    fontWeight: "bold",
    color: "#191714",
    flex: 1,
    marginRight: 8,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 6,
  },
  controlBtn: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  controlBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#191714",
    textTransform: "uppercase",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#efe5d2",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 8,
    minHeight: 64,
    justifyContent: "center",
  },
  summaryLabel: {
    color: "#766e61",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#191714",
  },
  gridContainer: {
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
    padding: 10,
    marginBottom: 20,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
    color: "#766e61",
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyDay: {
    width: "14.28%",
    height: 72,
    borderWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.1)",
    backgroundColor: "rgba(47, 42, 32, 0.05)",
  },
  dayCell: {
    width: "14.28%",
    height: 72,
    borderWidth: 1,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
    padding: 4,
    justifyContent: "space-between",
    position: "relative",
  },
  todayCell: {
    backgroundColor: "#fff2d3",
  },
  selectedCell: {
    borderWidth: 3,
    borderColor: "#287c6f",
  },
  workoutDayCell: {
    borderStyle: "dashed",
  },
  dayNumber: {
    fontWeight: "900",
    fontSize: 11,
    color: "#191714",
  },
  selectedDayNumber: {
    color: "#287c6f",
  },
  dayFocusTime: {
    fontSize: 9,
    fontWeight: "900",
    color: "#191714",
    alignSelf: "flex-end",
  },
  dayWorkoutInfo: {
    fontSize: 8,
    color: "#766e61",
    alignSelf: "flex-end",
  },
  dayTaskMarks: {
    flexDirection: "row",
    height: 4,
    gap: 1,
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
  },
  taskMarkSegment: {
    height: "100%",
    borderWidth: 0.5,
    borderColor: "#2f2a20",
  },
  cardContainer: {
    position: "relative",
    width: "100%",
    marginBottom: 20,
  },
  cardShadow: {
    position: "absolute",
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: "#2f2a20",
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  card: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 16,
  },
  detailTitle: {
    fontFamily: "Georgia",
    fontSize: 20,
    fontWeight: "900",
    color: "#191714",
    marginBottom: 16,
  },
  detailSubTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#191714",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  manualForm: {
    backgroundColor: "#efe5d2",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 12,
    marginBottom: 12,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#191714",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  presetChipsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    height: 32,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
    marginRight: 8,
  },
  presetChipText: {
    color: "#191714",
    fontSize: 12,
    fontWeight: "900",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#766e61",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    color: "#191714",
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    marginBottom: 12,
  },
  buttonWrapper: {
    position: "relative",
    height: 44,
    width: "100%",
  },
  buttonShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: "#2f2a20",
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  btn: {
    borderWidth: 2,
    borderColor: "#2f2a20",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  btnPrimary: {
    backgroundColor: "#287c6f",
  },
  btnPrimaryText: {
    color: "#fffaf0",
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
  },
  totalsList: {
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#efe5d2",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 10,
  },
  totalTaskName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    color: "#191714",
  },
  totalDuration: {
    fontSize: 14,
    fontWeight: "900",
    color: "#191714",
  },
  sessionList: {
    gap: 2,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  logIndicator: {
    width: 12,
    height: 32,
    borderWidth: 1,
    borderColor: "#2f2a20",
    marginRight: 12,
  },
  logDetails: {
    flex: 1,
  },
  logTaskName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#191714",
  },
  logNote: {
    fontSize: 11,
    color: "#766e61",
    marginTop: 1,
  },
  logDuration: {
    fontSize: 12,
    fontWeight: "900",
    color: "#191714",
  },
  workoutList: {
    gap: 2,
  },
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  workoutIndicator: {
    width: 12,
    height: 32,
    borderWidth: 1,
    borderColor: "#2f2a20",
    marginRight: 12,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#191714",
  },
  workoutMeta: {
    fontSize: 11,
    color: "#766e61",
    marginTop: 1,
  },
  emptyState: {
    color: "#766e61",
    fontSize: 12,
    paddingVertical: 8,
  },
});
