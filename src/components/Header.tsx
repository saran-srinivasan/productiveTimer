import React, { useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { formatDuration, formatLoad } from "../utils/format";
import { exportLedgerJSON } from "../utils/ledger";
import { useLedgerContext } from "../context/LedgerContext";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  onOpenQuickCapture?: () => void;
}

export function Header({ onOpenQuickCapture }: HeaderProps = {}) {
  const {
    stats,
    workoutStats,
    syncState,
    pendingCount,
    syncNow,
    soundEnabled,
    setSoundEnabled,
    data,
    setData,
    activeTask,
    activeElapsed,
    activeIsPaused,
    taskActions,
  } = useLedgerContext();

  const [selectedQuickTaskId, setSelectedQuickTaskId] = React.useState<string>("");

  React.useEffect(() => {
    if (!selectedQuickTaskId && data?.tasks?.length > 0) {
      setSelectedQuickTaskId(data.tasks[0].id);
    }
  }, [data?.tasks, selectedQuickTaskId]);

  const {
    role,
    openAuthModal,
    logout,
    resetGuestSandbox,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleExport = () => {
    if (data) exportLedgerJSON(data);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && Array.isArray(parsed.tasks)) {
          setData(parsed);
          alert("Backup data restored successfully!");
        } else {
          alert("Invalid backup file structure.");
        }
      } catch {
        alert("Failed to parse backup JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <header className="command-strip">
      {role === "guest" && (
        <div className="guest-notice-banner">
          <div className="guest-notice-left">
            <span className="guest-notice-pulse">🧪</span>
            <span>
              <strong>GUEST SANDBOX:</strong> Exploring with demo data. Changes stay local to your browser.
            </span>
          </div>
          <button
            type="button"
            className="guest-notice-login-link"
            onClick={() => openAuthModal("login")}
          >
            🔐 Owner Sign In →
          </button>
        </div>
      )}

      <div className="header-top">
        <div className="brand-block">
          <div className="brand-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          </div>
          <div className="brand-text">
            <p className="eyebrow">CHASSIS.01 // TANSTACK CONSOLE</p>
            <h1>FOCUS LEDGER</h1>
          </div>
        </div>

        <div className="header-metrics">
          {stats.currentStreak > 0 ? (
            <div
              className="stat-pill"
              style={{ borderLeft: "3px solid var(--phosphor-amber)" }}
              title="Consecutive active focus streak"
            >
              <span className="pill-label">Streak</span>
              <strong style={{ color: "var(--phosphor-amber)" }}>
                🔥 {stats.currentStreak}D
              </strong>
            </div>
          ) : null}

          <div className="stat-pill focus-stat" title="Total focused time today">
            <span className="pill-label">Focus</span>
            <strong>{formatDuration(stats.todaySeconds)}</strong>
          </div>

          {/* TASK-3.1.2: Instant 1-Click Timer Launcher & Active State Widget */}
          {activeTask ? (
            <div
              className="header-timer-active"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: activeIsPaused ? "rgba(255, 171, 0, 0.12)" : "rgba(204, 255, 0, 0.12)",
                border: `1px solid ${activeIsPaused ? "var(--phosphor-amber)" : "var(--volt-lime)"}`,
                borderRadius: "var(--radius-sm)",
                boxShadow: activeIsPaused ? "none" : "0 0 10px rgba(204, 255, 0, 0.2)",
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: activeIsPaused ? "var(--phosphor-amber)" : "var(--volt-lime)",
                  boxShadow: activeIsPaused ? "none" : "0 0 6px var(--volt-lime)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: activeTask.color || "var(--volt-lime)",
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={activeTask.name}
              >
                {activeTask.name}
              </span>
              <strong
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.84rem",
                  color: activeIsPaused ? "var(--phosphor-amber)" : "var(--ink-pure)",
                }}
              >
                {formatDuration(activeElapsed)}
              </strong>
              <button
                type="button"
                onClick={activeIsPaused ? taskActions.resumeTimer : taskActions.pauseTimer}
                title={activeIsPaused ? "Resume Timer" : "Pause Timer"}
                style={{
                  background: "none",
                  border: "none",
                  color: activeIsPaused ? "var(--volt-lime)" : "var(--phosphor-amber)",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: "0.85rem",
                }}
              >
                {activeIsPaused ? "▶" : "⏸"}
              </button>
              <button
                type="button"
                onClick={() => taskActions.logSession()}
                title="Complete & Log Session"
                style={{
                  background: "var(--signal-green)",
                  color: "#0a0d13",
                  border: "none",
                  borderRadius: "3px",
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-mono)",
                  padding: "2px 6px",
                  cursor: "pointer",
                }}
              >
                ✓ LOG
              </button>
              <button
                type="button"
                onClick={taskActions.cancelTimer}
                title="Cancel Session"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--stamp-crimson)",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                ✕
              </button>
            </div>
          ) : data?.tasks?.length > 0 ? (
            <div
              className="header-timer-launcher"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "var(--panel-recessed)",
                border: "1px solid var(--milled-border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 6px",
              }}
            >
              <select
                value={selectedQuickTaskId || data.tasks[0]?.id || ""}
                onChange={(e) => setSelectedQuickTaskId(e.target.value)}
                aria-label="Quick focus lane selector"
                style={{
                  background: "transparent",
                  color: "var(--ink-primary)",
                  border: "none",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  maxWidth: "95px",
                  cursor: "pointer",
                }}
              >
                {data.tasks.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: "#151a22", color: "#e6edf3" }}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="header-instant-timer-btn"
                onClick={() => {
                  const targetId = selectedQuickTaskId || data.tasks[0]?.id;
                  if (targetId) taskActions.startTask(targetId);
                }}
                title="1-Click Start Focus Timer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  background: "var(--volt-lime)",
                  color: "#0a0d13",
                  fontWeight: "800",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "3px",
                  cursor: "pointer",
                  boxShadow: "0 0 6px var(--volt-glow)",
                }}
              >
                ▶ START
              </button>
            </div>
          ) : null}

          {workoutStats.todayStrengthVolume > 0 ? (
            <div
              className="stat-pill gym-stat"
              title={`Total cumulative tonnage: sets × reps × weight (Top load: ${workoutStats.todayMaxWeight} kg)`}
            >
              <span className="pill-label">Tonnage</span>
              <strong>{formatLoad(workoutStats.todayStrengthVolume)}</strong>
            </div>
          ) : null}

          <div
            className="sync-pill"
            data-state={syncState}
            onClick={() => role === "owner" && syncNow()}
            style={{ cursor: role === "owner" ? "pointer" : "default" }}
            title={role === "owner" ? "Click to Sync Now" : undefined}
          >
            <span className="sync-dot" />
            <span>
              {pendingCount > 0 && syncState !== "Syncing"
                ? `Pending changes (${pendingCount})`
                : syncState === "Cloud synced"
                ? "Synced"
                : syncState === "Saving"
                ? "Syncing..."
                : syncState}
            </span>
          </div>

          {role === "owner" && (
            <button
              type="button"
              className="sync-now-button"
              onClick={syncNow}
              title="Manual Sync to Rust Backend"
              style={{
                fontSize: "11px",
                fontWeight: "800",
                padding: "4px 8px",
                border: "2px solid #2f2a20",
                background: "#f5f0e6",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              🔄 Sync Now
            </button>
          )}

          {onOpenQuickCapture && (
            <button
              type="button"
              className="quick-add-button"
              onClick={onOpenQuickCapture}
              title="Global Quick-Capture Task (Ctrl+K)"
              style={{
                fontSize: "11px",
                fontWeight: "800",
                padding: "4px 8px",
                border: "2px solid var(--volt-lime)",
                background: "var(--panel-module)",
                color: "var(--volt-lime)",
                cursor: "pointer",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
              }}
            >
              ⚡ + TASK (Ctrl+K)
            </button>
          )}

          {/* Role Status Badge */}
          {role === "owner" ? (
            <div
              className="role-pill owner-role"
              title="Authenticated as Owner — Cloud synchronization active"
            >
              <span className="role-dot" />
              <span>OWNER</span>
            </div>
          ) : (
            <div
              className="role-pill guest-role"
              title="Guest Sandbox — Testing locally with sample data"
            >
              <span className="role-dot" />
              <span>GUEST</span>
            </div>
          )}

          {/* Audio toggle */}
          <button
            type="button"
            className="icon-button"
            onClick={() => setSoundEnabled((s) => !s)}
            title={
              soundEnabled
                ? "Tactical Audio: ON (Click to mute)"
                : "Tactical Audio: MUTED (Click to unmute)"
            }
            style={{ width: "34px", height: "34px" }}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>

          {/* Export JSON */}
          <button
            type="button"
            className="icon-button"
            onClick={handleExport}
            title="Download JSON Backup"
            style={{ width: "34px", height: "34px" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Import JSON */}
          <button
            type="button"
            className="icon-button"
            onClick={() => fileInputRef.current?.click()}
            title="Restore Backup from JSON"
            style={{ width: "34px", height: "34px" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: "none" }}
          />

          {/* Guest Reset Demo Data button */}
          {role === "guest" && (
            <button
              type="button"
              className="icon-button"
              onClick={resetGuestSandbox}
              title="Reset Sandbox to Fresh Sample Data"
              style={{ width: "34px", height: "34px" }}
            >
              🔄
            </button>
          )}

          {/* Auth Login / Logout actions */}
          {role === "owner" ? (
            <button
              type="button"
              className="icon-button logout-button"
              onClick={logout}
              title="Sign Out of Owner Mode"
              style={{ width: "34px", height: "34px" }}
            >
              🚪
            </button>
          ) : (
            <button
              type="button"
              className="guest-login-header-btn"
              onClick={() => openAuthModal("login")}
              title="Sign in as Owner to access personal cloud ledger"
            >
              🔐 Sign In
            </button>
          )}
        </div>
      </div>

      <nav className="view-tabs" aria-label="TanStack Router Navigation">
        <Link
          to="/"
          className={`tab-button ${currentPath === "/" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          [01] Command All
        </Link>
        <Link
          to="/tasks"
          className={`tab-button ${currentPath === "/tasks" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          [02] Action Tasks
        </Link>
        <Link
          to="/planner"
          className={`tab-button ${currentPath === "/planner" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <polyline points="12 14 12 17 15 17" />
          </svg>
          [03] Day Planner
        </Link>
        <Link
          to="/focus"
          className={`tab-button ${currentPath === "/focus" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          [04] Focus Lanes
        </Link>
        <Link
          to="/gym"
          className={`tab-button ${currentPath === "/gym" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
          </svg>
          [05] Gym Ledger
        </Link>
        <Link
          to="/calendar"
          className={`tab-button ${currentPath === "/calendar" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          [06] Habit Matrix
        </Link>
        <Link
          to="/projects"
          className={`tab-button ${currentPath === "/projects" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          [07] Projects
        </Link>
        <Link
          to="/goals"
          className={`tab-button ${currentPath === "/goals" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          [08] Goals
        </Link>
        <Link
          to="/telemetry"
          className={`tab-button ${currentPath === "/telemetry" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          [09] Telemetry
        </Link>
      </nav>
    </header>
  );
}
