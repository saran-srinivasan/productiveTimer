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
import { useWorkoutForm } from "../hooks/useWorkoutForm";
import { useWorkoutStats } from "../hooks/useStats";
import { workoutPresets, intensityOptions } from "../constants";
import { formatLoad, formatDistance } from "../utils/format";

export default function WorkoutScreen() {
  const { data, setData, syncState, setSyncState } = useLedger();
  const workoutStats = useWorkoutStats(data.workouts);
  const workoutActions = useWorkoutForm({ setData, setSyncState });
  const { workoutForm, addWorkout, deleteWorkout } = workoutActions;

  const isStrength = workoutForm.workoutKind === "strength";
  const recentWorkouts = data.workouts.slice(0, 8);

  const presets = workoutPresets[workoutForm.workoutKind];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GYM LEDGER</Text>
            <Text style={styles.title}>Workout Tracker</Text>
          </View>
        </View>

        {/* Scoreboard Grid */}
        <View style={styles.scoreboard}>
          <View style={[styles.scoreItem, { backgroundColor: "#e7edf0" }]}>
            <Text style={styles.scoreLabel}>TODAY LOAD</Text>
            <Text style={styles.scoreVal}>
              {formatLoad(workoutStats.todayStrengthVolume)}
            </Text>
          </View>
          <View style={[styles.scoreItem, { backgroundColor: "#e7edf0" }]}>
            <Text style={styles.scoreLabel}>CARDIO TODAY</Text>
            <Text style={styles.scoreVal}>
              {workoutStats.todayCardioMinutes}m
            </Text>
          </View>
          <View style={[styles.scoreItem, { backgroundColor: "#e7edf0" }]}>
            <Text style={styles.scoreLabel}>WEEK ENTRIES</Text>
            <Text style={styles.scoreVal}>
              {workoutStats.weekEntries}
            </Text>
          </View>
        </View>

        {/* Form Container Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardShadow} />
          <View style={styles.card}>
            {/* Kind Switcher */}
            <View style={styles.modeSwitch}>
              {["strength", "cardio"].map((kind) => {
                const isActive = workoutForm.workoutKind === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[
                      styles.modeButton,
                      isActive && styles.modeButtonActive,
                    ]}
                    onPress={() => workoutForm.setWorkoutKind(kind)}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        isActive && styles.modeButtonActiveText,
                      ]}
                    >
                      {kind === "strength" ? "Strength" : "Cardio"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Workout Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={workoutForm.workoutDate}
                onChangeText={workoutForm.setWorkoutDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#766e61"
              />
            </View>

            {/* Exercise presets scrollable list of chips */}
            <Text style={styles.fieldLabel}>Pick Exercise Preset</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.presetChipsRow}
            >
              {[...presets, "Custom"].map((ex) => {
                const isSelected = workoutForm.workoutExercise === ex;
                return (
                  <TouchableOpacity
                    key={ex}
                    style={[
                      styles.presetChip,
                      isSelected && styles.presetChipSelected,
                    ]}
                    onPress={() => workoutForm.setWorkoutExercise(ex)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipSelectedText,
                      ]}
                    >
                      {ex}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom Exercise Input if selected */}
            {workoutForm.workoutExercise === "Custom" && (
              <View style={styles.fieldContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter custom exercise name..."
                  placeholderTextColor="#766e61"
                  value={workoutForm.customWorkoutExercise}
                  onChangeText={workoutForm.setCustomWorkoutExercise}
                />
              </View>
            )}

            {/* Field Grid */}
            {isStrength ? (
              <View style={styles.fieldsGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Sets</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={String(workoutForm.workoutSets)}
                    onChangeText={(val) => workoutForm.setWorkoutSets(Number(val) || 0)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={String(workoutForm.workoutReps)}
                    onChangeText={(val) => workoutForm.setWorkoutReps(Number(val) || 0)}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(workoutForm.workoutWeight)}
                    onChangeText={(val) => workoutForm.setWorkoutWeight(Number(val) || 0)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.fieldsGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Minutes</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={String(workoutForm.cardioMinutes)}
                    onChangeText={(val) => workoutForm.setCardioMinutes(Number(val) || 0)}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.fieldLabel}>Distance (km)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(workoutForm.cardioDistance)}
                    onChangeText={(val) => workoutForm.setCardioDistance(Number(val) || 0)}
                  />
                </View>
              </View>
            )}

            {/* Intensity Selector */}
            <Text style={styles.fieldLabel}>Intensity</Text>
            <View style={styles.intensityRow}>
              {intensityOptions.map((opt) => {
                const isSelected = workoutForm.workoutIntensity === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.intensityButton,
                      isSelected && styles.intensityButtonActive,
                    ]}
                    onPress={() => workoutForm.setWorkoutIntensity(opt)}
                  >
                    <Text
                      style={[
                        styles.intensityButtonText,
                        isSelected && styles.intensityButtonActiveText,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="PR, machine, pain notes..."
                placeholderTextColor="#766e61"
                value={workoutForm.workoutNote}
                onChangeText={workoutForm.setWorkoutNote}
              />
            </View>

            {/* Log Button */}
            <View style={styles.buttonWrapper}>
              <View style={styles.buttonShadow} />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={addWorkout}
              >
                <Text style={styles.btnPrimaryText}>Log Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Training Pulse Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Pulse</Text>
        </View>

        <View style={styles.weeklyPulseGrid}>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>STRENGTH TOTAL</Text>
            <Text style={styles.pulseVal}>
              {formatLoad(workoutStats.weekStrengthVolume)}
            </Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>CARDIO TOTAL</Text>
            <Text style={styles.pulseVal}>
              {workoutStats.weekCardioMinutes}m
            </Text>
          </View>
        </View>

        {/* Recent Workouts list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
        </View>

        {recentWorkouts.length ? (
          <View style={styles.recentWorkoutsList}>
            {recentWorkouts.map((workout) => (
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
                  <Text style={styles.workoutExerciseName}>{workout.exercise}</Text>
                  <Text style={styles.workoutMeta}>
                    {workout.kind === "strength"
                      ? `${workout.sets} x ${workout.reps} @ ${workout.weight}kg`
                      : `${workout.durationMinutes}m, ${formatDistance(workout.distance)}`}
                    {workout.note ? ` - ${workout.note}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteWorkout(workout.id)}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyState}>No workouts logged yet.</Text>
        )}
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#191714",
  },
  scoreboard: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  scoreItem: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 12,
    minHeight: 80,
    justifyContent: "center",
  },
  scoreLabel: {
    color: "#766e61",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#191714",
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
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#efe5d2",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  modeButtonActive: {
    backgroundColor: "#6a4f7d",
    shadowColor: "#2f2a20",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  modeButtonText: {
    color: "#191714",
    fontWeight: "900",
    fontSize: 13,
    textTransform: "uppercase",
  },
  modeButtonActiveText: {
    color: "#fffaf0",
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#766e61",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#fffaf0",
    borderWidth: 2,
    borderColor: "#2f2a20",
    color: "#191714",
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    marginBottom: 4,
  },
  presetChipsRow: {
    flexDirection: "row",
    marginBottom: 14,
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
  presetChipSelected: {
    backgroundColor: "#287c6f",
  },
  presetChipText: {
    color: "#191714",
    fontSize: 12,
    fontWeight: "900",
  },
  presetChipSelectedText: {
    color: "#fffaf0",
  },
  fieldsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  intensityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  intensityButton: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
  },
  intensityButtonActive: {
    backgroundColor: "#c8952d",
  },
  intensityButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#191714",
    textTransform: "uppercase",
  },
  intensityButtonActiveText: {
    color: "#191714",
  },
  buttonWrapper: {
    position: "relative",
    height: 46,
    width: "100%",
    marginTop: 10,
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
  sectionHeader: {
    marginVertical: 18,
  },
  sectionTitle: {
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "900",
    color: "#191714",
  },
  weeklyPulseGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  pulseCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#2f2a20",
    backgroundColor: "#fffaf0",
    padding: 14,
  },
  pulseLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#766e61",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  pulseVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#191714",
  },
  recentWorkoutsList: {
    borderTopWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(47, 42, 32, 0.15)",
  },
  workoutIndicator: {
    width: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#2f2a20",
    marginRight: 12,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutExerciseName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#191714",
  },
  workoutMeta: {
    fontSize: 12,
    color: "#766e61",
    marginTop: 2,
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
  emptyState: {
    color: "#766e61",
    fontSize: 13,
    paddingVertical: 16,
    textAlign: "center",
  },
});
