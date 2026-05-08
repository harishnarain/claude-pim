-- Migration 003: Create tasks, task_tags_vocab, and task_tags tables
-- Creates the tasks table for storing task records with priority and status
-- fields, the task_tags_vocab table for task-scoped tag names, and the
-- task_tags join table with composite primary key and cascade deletes.

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT,
  due_date   TEXT,
  priority   TEXT    NOT NULL DEFAULT 'Low'
               CHECK(priority IN ('Low', 'Medium', 'High')),
  status     TEXT    NOT NULL DEFAULT 'Not Started'
               CHECK(status IN ('Not Started', 'Blocked', 'In Progress', 'Completed', 'Cancelled')),
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_tags_vocab (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES task_tags_vocab(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority
  ON tasks(status, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_pinned_due
  ON tasks(is_pinned DESC, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id
  ON task_tags(tag_id);
