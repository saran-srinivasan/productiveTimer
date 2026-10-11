-- Migration: 0003_sync_change_log.sql
-- Reliable Change Synchronization Protocol & Client Mutation Deduplication

CREATE TABLE IF NOT EXISTS sync_changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op_type TEXT NOT NULL CHECK (op_type IN ('upsert', 'delete')),
    payload TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_changes_cursor ON sync_changes (change_id);
CREATE INDEX IF NOT EXISTS idx_sync_changes_entity ON sync_changes (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sync_client_operations (
    op_id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL DEFAULT '',
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
