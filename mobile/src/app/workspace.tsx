import React from "react";
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
import { useTaskActions } from "../hooks/useTaskActions";
import { useFocusStats } from "../hooks/useStats";
import { formatDuration } from "../utils/format";

const COLOR_PRESETS = [
  "#287c6f", // green
  "#d84b35", // red
  "#c8952d", // gold
  "#346fa3", // blue
  "#6a4f7d", // violet
  "#d97706", // amber
];

export default function WorkspaceScreen() {
  const { data, setData, syncState, setSyncState } = useLedger();
  const stats = useFocusStats(data.tasks, data.sessions);
  const taskActions = useTaskActions({ setData, setSyncState });

  const activeTask = data.tasks.find((task) => task.id === data.active?.taskId);

  const maxSeconds = Math.max(
    ...data.tasks.map((task) => stats.totalsByTask.get(task.id) ?? 0),
    1,
  );

  const recentSessions = {
    items: data.sessions.slice(0, 8),
    totalCount: data.sessions.length,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>WORKSPACE</Text>
            <Text style={styles.title}>Tasks & Stats</Text>
          </View>
          <View style={[styles.syncPill, getSyncStyle(syncState)]}>
            <Text style={[styles.syncText, getSyncTextStyle(syncState)]}>
              {syncState}
            </Text>
          </View>
        </View>

        {/* Picks list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pick current work</Text>
        </View>

        <View style={styles.taskList}>
          {data.tasks.map((task) => {
            const todaySeconds = stats.todayByTask.get(task.id) ?? 0;
            const progress = Math.min(
              100,
              (todaySeconds / (task.targetMinutes * 60)) * 100,
            );
            const isCurrentActive = data.active?.taskId === task.id;

            return (
              <View style={styles.cardContainer} key={task.id}>
                <View style={styles.cardShadow} />
                <View style={styles.card}>
                  <View style={styles.taskTop}>
                    <View style={styles.taskHeaderLeft}>
                      <View style={[styles.taskDot, { backgroundColor: task.color }]} />
                      <Text style={styles.taskTitle}>{task.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => taskActions.deleteTask(task.id)}
                    >
                      <Text style={styles.deleteBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Progress track */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${progress}%` as any, backgroundColor: task.color }]} />
                  </View>

                  <View style={styles.taskMeta}>
                    <Text style={styles.metaText}>{formatDuration(todaySeconds)} today</Text>
                    <Text style={styles.metaText}>{task.targetMinutes}m goal</Text>
                  </View>

                  <View style={styles.buttonWrapper}>
                    <View style={styles.buttonShadow} />
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        isCurrentActive ? styles.btnActive : styles.btnStart,
                        Boolean(data.active && !isCurrentActive) && styles.btnDisabled,
                      ]}
                      onPress={() => taskActions.startTask(task.id)}
                      disabled={Boolean(data.active && !isCurrentActive)}
                    >
                      <Text style={isCurrentActive ? styles.btnActiveText : styles.btnStartText}>
                        {isCurrentActive
                          ? "Running"
                          : data.active
                            ? "Finish current"
                            : "Start focus"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* New Task Form */}
        <View style={styles.cardContainer}>
          <View style={styles.cardShadow} />
          <View style={styles.card}>
            <Text style={styles.formTitle}>Add New Task</Text>

            <TextInput
              style={styles.input}
              placeholder="Task name..."
              placeholderTextColor="#766e61"
              value={taskActions.taskForm.taskName}
              onChangeText={taskActions.taskForm.setTaskName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Daily Target (mins)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={String(taskActions.taskForm.taskTarget)}
                  onChangeText={(val) => taskActions.taskForm.setTaskTarget(Number(val) || 0)}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Pick Color Preset</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    taskActions.taskForm.taskColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => taskActions.taskForm.setTaskColor(color)}
                />
              ))}
            </View>

            <View style={[styles.buttonWrapper, { marginTop: 12 }]}>
              <View style={styles.buttonShadow} />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={taskActions.createTask}
              >
                <Text style={styles.btnPrimaryText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dashboard Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What got done</Text>
        </View>

        {/* Dashboard Metrics grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>WEEK</Text>
            <Text style={styles.metricVal}>{formatDuration(stats.weekSeconds)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SESSIONS</Text>
            <Text style={styles.metricVal}>{recentSessions.totalCount}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>BEST LANE</Text>
            <Text style={styles.metricVal} numberOfLines={1}>
              {stats.topTask?.seconds ? stats.topTask.name : "None"}
            </Text>
          </View>
        </View>

        {/* Bar Stack charts */}
        <View style={styles.barStack}>
          {data.tasks.map((task) => {
            const seconds = stats.totalsByTask.get(task.id) ?? 0;
            const barWidth = `${Math.max(5, (seconds / maxSeconds) * 100)}%`;

            return (
              <View style={styles.barLine} key={task.id}>
                <Text style={styles.barLabel} numberOfLines={1}>{task.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: barWidth as any, backgroundColor: task.color }]} />
                </View>
                <Text style={styles.barVal}>{formatDuration(seconds)}</Text>
              </View>
            );
          })}
        </View>

        {/* Recent logs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent logs</Text>
        </View>

        {recentSessions.items.length ? (
          <View style={styles.recentLogsList}>
            {recentSessions.items.map((session) => {
              const task = data.tasks.find((item) => item.id === session.taskId);
              return (
                <View style={styles.logRow} key={session.id}>
                  <View style={[styles.logIndicator, { backgroundColor: task?.color ?? "#222" }]} />
                  <View style={styles.logDetails}>
                    <Text style={styles.logTaskName}>{task?.name ?? "Deleted task"}</Text>
                    <Text style={styles.logNote}>{session.note || "Focused work logged"}</Text>
                  </View>
                  <Text style={styles.logDuration}>{formatDuration(session.seconds)}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyState}>No sessions logged yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getSyncStyle(state) {
  switch (state) {
    case "Cloud synced":
      return { backgroundColor: "#d9eadf" };
    case "Saving":
    case "Syncing":
    case "Connecting":
      return { backgroundColor: "#fff2d3" };
    case "Cloud error":
      return { backgroundColor: "#d84b35" };
    default:
      return { backgroundColor: "#efe5d2" };
  }
}

function getSyncTextStyle(state) {
  if (state === "Cloud error") {
    return { color: "#fffaf0" };
  }
  return { color: "#191714" };
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#191714",
  },
  syncPill: {
    borderWidth: 2,
    borderColor: "#2f2a20",
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  syncText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sectionHeader: {
    marginVertical: 18,
  },
  sectionTitle: {
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "900",
    color: "#191714",
  },
  taskList: {
    gap: 16,
    marginBottom: 20,
  },
  cardContainer: {
    position: "relative",
    width: "100%",
    marginBottom: 16,
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
  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskDot: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 7,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#191714",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#191714",
    marginTop: -2,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#e6ddcd",
    borderWidth: 2,
    borderColor: "#2f2a20",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
  },
  taskMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metaText: {
    color: "#766e61",
    fontSize: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#191714",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    color: "#191714",
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#766e61",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  colorOptionSelected: {
    borderWidth: 4,
    borderColor: "#191714",
  },
  buttonWrapper: {
    position: "relative",
    height: 46,
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
  btnStart: {
    backgroundColor: "#287c6f",
  },
  btnStartText: {
    color: "#fffaf0",
    fontWeight: "900",
    fontSize: 13,
    textTransform: "uppercase",
  },
  btnActive: {
    backgroundColor: "#c8952d",
  },
  btnActiveText: {
    color: "#191714",
    fontWeight: "900",
    fontSize: 13,
    textTransform: "uppercase",
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
  btnDisabled: {
    opacity: 0.45,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    backgroundColor: "#efe5d2",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 12,
    height: 80,
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#766e61",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#191714",
  },
  barStack: {
    gap: 8,
    marginBottom: 20,
  },
  barLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 68,
    fontSize: 12,
    fontWeight: "900",
    color: "#766e61",
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#e6ddcd",
    borderWidth: 2,
    borderColor: "#2f2a20",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
  barVal: {
    width: 58,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
    color: "#191714",
  },
  recentLogsList: {
    borderTopWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  logIndicator: {
    width: 12,
    height: 38,
    borderWidth: 1,
    borderColor: "#2f2a20",
    marginRight: 12,
  },
  logDetails: {
    flex: 1,
  },
  logTaskName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#191714",
  },
  logNote: {
    fontSize: 12,
    color: "#766e61",
    marginTop: 2,
  },
  logDuration: {
    fontSize: 12,
    fontWeight: "900",
    color: "#191714",
  },
  emptyState: {
    color: "#766e61",
    fontSize: 13,
    paddingVertical: 16,
    textAlign: "center",
  },
});
