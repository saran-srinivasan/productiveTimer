import React, { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    login,
    setup,
    enterGuestMode,
    isSetup,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalMode === "setup") {
      if (password.length < 4) {
        setError("Password must be at least 4 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify.");
        return;
      }

      setIsSubmitting(true);
      const res = await setup(password);
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || "Failed to set master password.");
      }
    } else {
      if (!password) {
        setError("Please enter your master password.");
        return;
      }

      setIsSubmitting(true);
      const res = await login(password);
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || "Invalid master password.");
      }
    }
  };

  const isSetupMode = authModalMode === "setup";

  return (
    <div
      className="completion-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && (!isSetupMode || isSetup)) {
          closeAuthModal();
        }
      }}
    >
      <div className="auth-dialog-card" role="dialog" aria-modal="true">
        <div className="auth-dialog-header">
          <div className="auth-badge-row">
            <span className={`auth-mode-badge ${isSetupMode ? "badge-setup" : "badge-login"}`}>
              {isSetupMode ? "INITIAL CONFIG" : "SECURITY GATE"}
            </span>
            {isSetup && (
              <button
                type="button"
                className="activity-dialog-close-btn"
                onClick={closeAuthModal}
                title="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
          <h2 className="auth-dialog-title">
            {isSetupMode ? "CHASSIS INITIALIZATION" : "OWNER AUTHORIZATION"}
          </h2>
          <p className="auth-dialog-subtitle">
            {isSetupMode
              ? "Configure master key to secure your cloud database. Visitors will use a local sandbox."
              : "Verify your credentials to unlock cloud ledger synchronization and private records."}
          </p>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-password">
              {isSetupMode ? "New Master Password" : "Master Password"}
            </label>
            <input
              id="auth-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password..."
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {isSetupMode && (
            <div className="auth-field-group">
              <label className="auth-field-label" htmlFor="auth-confirm-password">
                Confirm Master Password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm master password..."
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="auth-dialog-actions">
            <button
              type="submit"
              className="action-button primary auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Verifying..."
              ) : isSetupMode ? (
                "⚡ Initialize Owner Access"
              ) : (
                "🔓 Verify & Enter"
              )}
            </button>

            <button
              type="button"
              className="action-button secondary auth-guest-btn"
              onClick={enterGuestMode}
              disabled={isSubmitting}
            >
              🧪 Continue as Guest (Sandbox)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
