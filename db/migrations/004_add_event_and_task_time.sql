-- Migration 004: Add due_time to tasks and create events table
-- Adds an optional due_time column to the tasks table and creates the
-- events table for calendar appointments with indexes for date-range queries.

-- Add due_time to tasks table.
ALTER TABLE tasks ADD COLUMN due_time TEXT;

-- Create the events table.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  location    TEXT,
  all_day     INTEGER NOT NULL DEFAULT 0,
  start_at    TEXT    NOT NULL,
  end_at      TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT 'blue',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for date-range window queries (the primary read pattern).
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at ASC);
CREATE INDEX IF NOT EXISTS idx_events_end_at   ON events(end_at   ASC);

-- Composite index for range overlap queries.
CREATE INDEX IF NOT EXISTS idx_events_range
  ON events(start_at ASC, end_at ASC);
