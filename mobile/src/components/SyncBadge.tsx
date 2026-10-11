import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SyncBadgeProps {
  syncState: string;
  pendingCount?: number;
  onSyncNow?: () => void;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  syncState,
  pendingCount = 0,
  onSyncNow,
}) => {
  const isSyncing = syncState === "Syncing" || syncState === "Saving";
  const isOffline = syncState === "Offline";
  const isError = syncState === "Cloud error";

  const getLabel = () => {
    if (pendingCount > 0 && !isSyncing) return `Pending (${pendingCount})`;
    if (syncState === "Cloud synced") return "Synced";
    if (syncState === "Saving") return "Syncing...";
    return syncState;
  };

  const getDotColor = () => {
    if (isSyncing) return "#c8952d";
    if (isOffline) return "#766e61";
    if (isError) return "#d84b35";
    return "#287c6f";
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: getDotColor() }]} />
        <Text style={styles.text}>{getLabel()}</Text>
      </View>
      {onSyncNow && (
        <TouchableOpacity style={styles.syncButton} onPress={onSyncNow}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8dfce",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2f2a20",
    textTransform: "uppercase",
  },
  syncButton: {
    backgroundColor: "#287c6f",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
    textTransform: "uppercase",
  },
});
