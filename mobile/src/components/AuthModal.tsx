import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  visible: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { isSetup, login, setup, error: authError } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!isSetup) {
      if (password.length < 12) {
        setError("Password must be at least 12 characters long.");
        return;
      }
      if (password.length > 128) {
        setError("Password cannot exceed 128 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        await setup(password);
        setPassword("");
        setConfirmPassword("");
        if (onClose) onClose();
      } catch (err: any) {
        setError(err?.message || "Setup failed.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!password) {
        setError("Please enter your master password.");
        return;
      }
      setLoading(true);
      try {
        await login(password);
        setPassword("");
        if (onClose) onClose();
      } catch (err: any) {
        setError(err?.message || "Invalid master password.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {isSetup ? "Unlock ProductiveTimer" : "Setup Master Password"}
          </Text>
          <Text style={styles.subtitle}>
            {isSetup
              ? "Enter your master password to authenticate with the Rust backend."
              : "Create a master password (minimum 12 characters) for your data."}
          </Text>

          {(error || authError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error || authError}</Text>
            </View>
          )}

          <Text style={styles.label}>
            {isSetup ? "Master Password" : "New Master Password"}
          </Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••••••"
            placeholderTextColor="#a0988c"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          {!isSetup && (
            <>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="••••••••••••"
                placeholderTextColor="#a0988c"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
            </>
          )}

          <View style={styles.buttonRow}>
            {onClose && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSetup ? "Log In" : "Set Password"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#f5f0e6",
    borderWidth: 3,
    borderColor: "#2f2a20",
    padding: 24,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2f2a20",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#766e61",
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#fde8e4",
    borderColor: "#d84b35",
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#d84b35",
    fontSize: 12,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2f2a20",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2f2a20",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#2f2a20",
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2f2a20",
  },
  cancelButton: {
    backgroundColor: "#e8dfce",
  },
  cancelButtonText: {
    color: "#2f2a20",
    fontWeight: "800",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#287c6f",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
