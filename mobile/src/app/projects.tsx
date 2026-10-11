import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  fetchProjectsApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
} from "../apiClient";
import { ProjectSummaryDto } from "../types/api";

const COLOR_PRESETS = [
  "#287c6f", // teal green
  "#346fa3", // blue
  "#c8952d", // amber
  "#d84b35", // red
  "#6a4f7d", // purple
];

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjectsApi();
      setProjects(data);
    } catch (err: any) {
      console.warn("Error loading projects:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a project name.");
      return;
    }
    try {
      setSubmitting(true);
      await createProjectApi({
        name: name.trim(),
        description: description.trim(),
        color,
        status: "active",
      });
      setName("");
      setDescription("");
      setShowAddForm(false);
      await loadProjects();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (project: ProjectSummaryDto) => {
    const nextStatus =
      project.status === "active"
        ? "paused"
        : project.status === "paused"
        ? "active"
        : "active";
    try {
      await updateProjectApi(project.id, { status: nextStatus });
      await loadProjects();
    } catch {
      Alert.alert("Error", "Failed to update project status");
    }
  };

  const handleArchive = async (id: string) => {
    Alert.alert("Archive Initiative", "Are you sure you want to archive this project?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProjectApi(id);
            await loadProjects();
          } catch {
            Alert.alert("Error", "Failed to archive project");
          }
        },
      },
    ]);
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "all") return p.status !== "archived";
    return p.status === statusFilter;
  });

  const totalFocusSec = projects.reduce(
    (acc, p) => acc + (p.total_focus_seconds || 0),
    0
  );
  const activeCount = projects.filter((p) => p.status === "active").length;

  const formatHours = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>OPERATING SYSTEM</Text>
            <Text style={styles.title}>Projects</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Text style={styles.addBtnText}>{showAddForm ? "CLOSE" : "+ NEW"}</Text>
          </TouchableOpacity>
        </View>

        {/* Telemetry Strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Initiatives</Text>
            <Text style={styles.statValue}>{activeCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Focus Time</Text>
            <Text style={styles.statValue}>{formatHours(totalFocusSec)}</Text>
          </View>
        </View>

        {/* Add Project Card */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Initiative</Text>
            <TextInput
              style={styles.input}
              placeholder="Project Name"
              placeholderTextColor="#766e61"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Description (optional)"
              placeholderTextColor="#766e61"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            {/* Color Swatches */}
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreate}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? "SAVING..." : "CREATE PROJECT"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          {["all", "active", "paused", "completed", "archived"].map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === st && styles.filterTextActive,
                ]}
              >
                {st.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Projects List */}
        {loading ? (
          <ActivityIndicator size="large" color="#287c6f" style={{ marginTop: 24 }} />
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No initiatives in this category. Tap + NEW to add one.
            </Text>
          </View>
        ) : (
          filteredProjects.map((p) => (
            <View
              key={p.id}
              style={[styles.projectCard, { borderLeftColor: p.color || "#3b82f6" }]}
            >
              <View style={styles.projectHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{p.name}</Text>
                  {p.description ? (
                    <Text style={styles.projectDesc}>{p.description}</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    p.status === "active"
                      ? styles.statusActive
                      : p.status === "paused"
                      ? styles.statusPaused
                      : styles.statusCompleted,
                  ]}
                >
                  <Text style={styles.statusText}>{p.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricItem}>
                  ⏱ {formatHours(p.total_focus_seconds || 0)}
                </Text>
                <Text style={styles.metricItem}>
                  📋 {p.task_count || 0} tasks
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleToggleStatus(p)}
                >
                  <Text style={styles.actionBtnText}>
                    {p.status === "active" ? "Pause" : "Resume"}
                  </Text>
                </TouchableOpacity>
                {p.status !== "archived" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.archiveBtn]}
                    onPress={() => handleArchive(p.id)}
                  >
                    <Text style={styles.archiveBtnText}>Archive</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#766e61",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2f2a20",
  },
  addBtn: {
    backgroundColor: "#287c6f",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  addBtnText: {
    color: "#fffdfa",
    fontWeight: "900",
    fontSize: 11,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fffdfa",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 8,
    padding: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#766e61",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#287c6f",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fffdfa",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2f2a20",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f5f0e6",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    color: "#2f2a20",
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  colorCircleSelected: {
    borderColor: "#287c6f",
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  submitBtn: {
    backgroundColor: "#287c6f",
    borderWidth: 2,
    borderColor: "#2f2a20",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fffdfa",
    fontWeight: "900",
    fontSize: 12,
  },
  filtersScroll: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fffdfa",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 6,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#287c6f",
  },
  filterText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#2f2a20",
  },
  filterTextActive: {
    color: "#fffdfa",
  },
  emptyCard: {
    backgroundColor: "#fffdfa",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#766e61",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  projectCard: {
    backgroundColor: "#fffdfa",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderLeftWidth: 6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#2f2a20",
  },
  projectDesc: {
    fontSize: 12,
    color: "#766e61",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2f2a20",
  },
  statusActive: {
    backgroundColor: "#d1fae5",
  },
  statusPaused: {
    backgroundColor: "#fef3c7",
  },
  statusCompleted: {
    backgroundColor: "#dbeafe",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#2f2a20",
  },
  metricRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  metricItem: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2f2a20",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5ded3",
    paddingTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#2f2a20",
    borderRadius: 4,
    backgroundColor: "#f5f0e6",
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2f2a20",
  },
  archiveBtn: {
    backgroundColor: "#fee2e2",
  },
  archiveBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#b91c1c",
  },
});
