import React, { useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { formatDuration, formatLoad } from "../utils/format";
import { exportLedgerJSON } from "../utils/ledger";
import { useLedgerContext } from "../context/LedgerContext";

export function Header() {
  const {
    stats,
    workoutStats,
    syncState,
    soundEnabled,
    setSoundEnabled,
    data,
    setData,
  } = useLedgerContext();

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

          {workoutStats.todayStrengthVolume > 0 ? (
            <div
              className="stat-pill gym-stat"
              title="Total weight lifted today"
            >
              <span className="pill-label">Iron Load</span>
              <strong>{formatLoad(workoutStats.todayStrengthVolume)}</strong>
            </div>
          ) : null}

          <div className="sync-pill" data-state={syncState}>
            <span className="sync-dot" />
            <span>{syncState}</span>
          </div>

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
          to="/focus"
          className={`tab-button ${currentPath === "/focus" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          [02] Focus & Tasks
        </Link>
        <Link
          to="/gym"
          className={`tab-button ${currentPath === "/gym" ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
          </svg>
          [03] Gym Ledger
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
          [04] Habit Matrix
        </Link>
      </nav>
    </header>
  );
}
