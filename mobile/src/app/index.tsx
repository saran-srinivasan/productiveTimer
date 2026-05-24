import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useLedger } from "../context/LedgerContext";
import { useNow } from "../hooks/useNow";
import { useTaskActions } from "../hooks/useTaskActions";
import { useFocusStats } from "../hooks/useStats";
import { formatClock, formatDuration } from "../utils/format";

export default function TimerScreen() {
  const { data, setData, syncState, setSyncState, isLoading } = useLedger();
  const now = useNow();
  const stats = useFocusStats(data.tasks, data.sessions);
  const taskActions = useTaskActions({ setData, setSyncState });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#287c6f" />
        <Text style={styles.loadingText}>Loading ledger...</Text>
      </View>
    );
  }

  const activeTask = data.tasks.find((task) => task.id === data.active?.taskId);
  const activeElapsed = data.active
    ? data.active.elapsedSeconds +
      (data.active.paused
        ? 0
        : Math.floor((now - data.active.startedAt) / 1000))
    : 0;
  const activeIsPaused = Boolean(data.active?.paused);
  const hasActiveTask = Boolean(activeTask);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header command-strip */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PRODUCTIVE TIMER</Text>
            <Text style={styles.title}>Timer</Text>
          </View>
          {/* Today Stamp */}
          <View style={styles.todayStamp}>
            <Text style={styles.stampLabel}>TODAY</Text>
            <Text style={styles.stampValue}>
              {formatDuration(stats.todaySeconds)}
            </Text>
          </View>
        </View>

        {/* Dial Component */}
        <View style={styles.dialShadowContainer}>
          <View style={styles.dialShadow} />
          <View
            style={[
              styles.dial,
              {
                borderColor: "#2f2a20",
                borderWidth: 3,
              },
            ]}
          >
            {/* Color Accent Indicator */}
            <View
              style={[
                styles.dialAccent,
                { backgroundColor: activeTask?.color ?? "#2f2a20" },
              ]}
            />
            <Text style={styles.dialLabel}>
              {activeTask ? activeTask.name : "No active task"}
            </Text>
            <Text style={styles.dialClock}>
              {formatClock(activeElapsed)}
            </Text>
            <Text style={styles.dialSublabel}>
              {activeTask ? "focused time in current session" : "choose a task in workspace to begin"}
            </Text>
          </View>
        </View>

        {/* Timer Controls Form */}
        <View style={styles.controlsContainer}>
          <View style={styles.noteInputContainer}>
            <TextInput
              style={[
                styles.noteInput,
                { opacity: hasActiveTask ? 1 : 0.5 },
              ]}
              value={taskActions.timerForm.note}
              onChangeText={taskActions.timerForm.setNote}
              placeholder={
                hasActiveTask
                  ? "Add a short note before logging this session..."
                  : "Start a task in Workspace to enable notes..."
              }
              placeholderTextColor="#766e61"
              multiline
              numberOfLines={4}
              editable={hasActiveTask}
            />
          </View>

          {/* Button Row */}
          <View style={styles.buttonRow}>
            {/* Pause Button */}
            <View style={styles.buttonWrapper}>
              <View style={styles.buttonShadow} />
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnSecondary,
                  (!hasActiveTask || activeIsPaused) && styles.btnDisabled,
                ]}
                onPress={taskActions.pauseTimer}
                disabled={!hasActiveTask || activeIsPaused}
              >
                <Text style={styles.btnSecondaryText}>Pause</Text>
              </TouchableOpacity>
            </View>

            {/* Resume Button */}
            <View style={styles.buttonWrapper}>
              <View style={styles.buttonShadow} />
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnSecondary,
                  (!hasActiveTask || !activeIsPaused) && styles.btnDisabled,
                ]}
                onPress={taskActions.resumeTimer}
                disabled={!hasActiveTask || !activeIsPaused}
              >
                <Text style={styles.btnSecondaryText}>Resume</Text>
              </TouchableOpacity>
            </View>

            {/* Log work Button */}
            <View style={styles.buttonWrapper}>
              <View style={styles.buttonShadow} />
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  !hasActiveTask && styles.btnDisabled,
                ]}
                onPress={taskActions.logSession}
                disabled={!hasActiveTask}
              >
                <Text style={styles.btnPrimaryText}>Log work</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f0e6",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#766e61",
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
  todayStamp: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#2f2a20",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  stampLabel: {
    color: "#766e61",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  stampValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#191714",
  },
  dialShadowContainer: {
    position: "relative",
    width: "100%",
    height: 260,
    marginBottom: 24,
  },
  dialShadow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    backgroundColor: "#2f2a20",
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  dial: {
    flex: 1,
    backgroundColor: "#191714",
    padding: 24,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  dialAccent: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.85,
  },
  dialLabel: {
    color: "#d9d1c2",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    zIndex: 2,
  },
  dialClock: {
    color: "#fffaf0",
    fontSize: 56,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginVertical: 12,
    zIndex: 2,
  },
  dialSublabel: {
    color: "#766e61",
    fontSize: 12,
    zIndex: 2,
  },
  controlsContainer: {
    gap: 16,
  },
  noteInputContainer: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  noteInput: {
    backgroundColor: "#fffaf0",
    color: "#191714",
    padding: 16,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
    position: "relative",
    height: 48,
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
    flex: 1,
    borderWidth: 2,
    borderColor: "#2f2a20",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
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
  btnSecondary: {
    backgroundColor: "#fffaf0",
  },
  btnSecondaryText: {
    color: "#191714",
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
