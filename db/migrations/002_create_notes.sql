-- Migration 002: Create notes, tags, and note_tags tables
-- Creates the notes table for storing note content, the tags table for
-- categorisation labels, and the note_tags join table with cascade deletes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT    NOT NULL DEFAULT '',
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at
  ON notes(is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id
  ON note_tags(tag_id);
