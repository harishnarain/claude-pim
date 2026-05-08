/**
 * Unit tests for the Task model (server/models/task.js).
 * Uses the real SQLite database via the db helper (migrations applied once per test run).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import { create, findAll, findById, update, destroy } from '../../server/models/task.js';

/**
 * Apply migrations before each test and tear down the task rows after
 * to keep tests isolated from one another.
 */
beforeEach(() => {
  const db = getDb();
  runMigrations(db);
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
  db.prepare('DELETE FROM tasks').run();
  closeDb();
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------
describe('create()', () => {
  it('inserts a task and returns the full row', () => {
    const task = create({ title: 'Buy milk', body: 'From the corner shop.' });

    expect(task).toBeDefined();
    expect(task.id).toBeTypeOf('number');
    expect(task.title).toBe('Buy milk');
    expect(task.body).toBe('From the corner shop.');
    expect(task.created_at).toBeDefined();
    expect(task.updated_at).toBeDefined();
  });

  it('defaults priority to Low when omitted', () => {
    const task = create({ title: 'Default priority' });
    expect(task.priority).toBe('Low');
  });

  it('defaults status to Not Started when omitted', () => {
    const task = create({ title: 'Default status' });
    expect(task.status).toBe('Not Started');
  });

  it('defaults is_pinned to 0 when omitted', () => {
    const task = create({ title: 'Unpinned task' });
    expect(task.is_pinned).toBe(0);
  });

  it('defaults body to null when omitted', () => {
    const task = create({ title: 'No body task' });
    expect(task.body).toBeNull();
  });

  it('defaults due_date to null when omitted', () => {
    const task = create({ title: 'No due date' });
    expect(task.due_date).toBeNull();
  });

  it('stores is_pinned as 1 when truthy value provided', () => {
    const task = create({ title: 'Pinned task', is_pinned: 1 });
    expect(task.is_pinned).toBe(1);
  });

  it('stores the supplied priority and status', () => {
    const task = create({ title: 'High priority', priority: 'High', status: 'In Progress' });
    expect(task.priority).toBe('High');
    expect(task.status).toBe('In Progress');
  });

  it('stores a due_date when supplied', () => {
    const task = create({ title: 'Dated task', due_date: '2026-06-01' });
    expect(task.due_date).toBe('2026-06-01');
  });
});

// ---------------------------------------------------------------------------
// findAll() — basic
// ---------------------------------------------------------------------------
describe('findAll() — basic', () => {
  beforeEach(() => {
    create({ title: 'Task A', body: 'Body A' });
    create({ title: 'Task B', body: 'Body B' });
    create({ title: 'Task C', body: 'Body C' });
  });

  it('returns all tasks', () => {
    const tasks = findAll();
    expect(tasks.length).toBe(3);
  });

  it('each row carries a body_preview column (not the full body field)', () => {
    const tasks = findAll();
    for (const task of tasks) {
      expect(task).toHaveProperty('body_preview');
      expect(task).not.toHaveProperty('body');
    }
  });

  it('body_preview is capped at 140 characters', () => {
    const longBody = 'x'.repeat(200);
    create({ title: 'Long body task', body: longBody });
    const tasks = findAll();
    const long = tasks.find((t) => t.title === 'Long body task');
    expect(long.body_preview.length).toBeLessThanOrEqual(140);
  });

  it('body_preview is null when body is null', () => {
    create({ title: 'No body' });
    const tasks = findAll();
    const noBody = tasks.find((t) => t.title === 'No body');
    expect(noBody.body_preview).toBeNull();
  });

  it('unknown sort key falls back to due_asc ordering', () => {
    // Simply confirms no error is thrown and all tasks are returned.
    const tasks = findAll({ sort: 'bogus_sort' });
    expect(tasks.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// findAll() — sort: due_asc (default)
// ---------------------------------------------------------------------------
describe('findAll() — sort: due_asc', () => {
  it('tasks sort by due_date ASC; null due_dates sort last', () => {
    create({ title: 'Later', due_date: '2026-12-31' });
    create({ title: 'Sooner', due_date: '2026-01-01' });
    create({ title: 'No date' }); // null due_date → should be last

    const tasks = findAll({ sort: 'due_asc' });
    // Strip Completed/Cancelled (none here) — just check relative ordering.
    const active = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled');
    const titles = active.map((t) => t.title);

    expect(titles.indexOf('Sooner')).toBeLessThan(titles.indexOf('Later'));
    expect(titles.indexOf('Later')).toBeLessThan(titles.indexOf('No date'));
  });
});

// ---------------------------------------------------------------------------
// findAll() — sort: due_desc
// ---------------------------------------------------------------------------
describe('findAll() — sort: due_desc', () => {
  it('tasks sort by due_date DESC; null due_dates (COALESCE 0000-01-01) sort last', () => {
    create({ title: 'Earlier', due_date: '2026-01-01' });
    create({ title: 'Latest', due_date: '2026-12-31' });
    create({ title: 'No date' }); // null → COALESCE '0000-01-01' → smallest → sorts LAST in DESC

    const tasks = findAll({ sort: 'due_desc' });
    const active = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled');
    const titles = active.map((t) => t.title);

    // Latest date (2026-12-31) first, then Earlier (2026-01-01), then No date (null/0000-01-01) last.
    expect(titles.indexOf('Latest')).toBeLessThan(titles.indexOf('Earlier'));
    expect(titles.indexOf('Earlier')).toBeLessThan(titles.indexOf('No date'));
  });
});

// ---------------------------------------------------------------------------
// findAll() — sort: priority_desc
// ---------------------------------------------------------------------------
describe('findAll() — sort: priority_desc', () => {
  it('orders High before Medium before Low', () => {
    create({ title: 'Low task', priority: 'Low' });
    create({ title: 'High task', priority: 'High' });
    create({ title: 'Medium task', priority: 'Medium' });

    const tasks = findAll({ sort: 'priority_desc' });
    const active = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled');
    const titles = active.map((t) => t.title);

    expect(titles.indexOf('High task')).toBeLessThan(titles.indexOf('Medium task'));
    expect(titles.indexOf('Medium task')).toBeLessThan(titles.indexOf('Low task'));
  });
});

// ---------------------------------------------------------------------------
// findAll() — sort: updated_desc
// ---------------------------------------------------------------------------
describe('findAll() — sort: updated_desc', () => {
  it('returns tasks ordered by updated_at DESC among active unpinned tasks', () => {
    const db = getDb();
    const a = create({ title: 'Task A' });
    const b = create({ title: 'Task B' });
    // Push A into the past so B is more recent.
    db.prepare("UPDATE tasks SET updated_at = datetime('now', '-10 seconds') WHERE id = ?").run(a.id);

    const tasks = findAll({ sort: 'updated_desc' });
    const ids = tasks.map((t) => t.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });
});

// ---------------------------------------------------------------------------
// findAll() — pin-first behaviour
// ---------------------------------------------------------------------------
describe('findAll() — pinned tasks always sort first', () => {
  it('pinned task appears before unpinned regardless of sort', () => {
    const db = getDb();
    const unpinned = create({ title: 'Unpinned', is_pinned: 0 });
    const pinned = create({ title: 'Pinned', is_pinned: 1 });
    // Make unpinned more recently updated — pin should still win.
    db.prepare("UPDATE tasks SET updated_at = datetime('now', '+5 seconds') WHERE id = ?").run(unpinned.id);

    const tasks = findAll({ sort: 'updated_desc' });
    const ids = tasks.map((t) => t.id);
    expect(ids.indexOf(pinned.id)).toBeLessThan(ids.indexOf(unpinned.id));
  });

  it('multiple pinned tasks are ordered among themselves by the secondary sort', () => {
    const db = getDb();
    const p1 = create({ title: 'Pinned 1', is_pinned: 1 });
    const p2 = create({ title: 'Pinned 2', is_pinned: 1 });
    // Make p2 more recently updated.
    db.prepare("UPDATE tasks SET updated_at = datetime('now', '+5 seconds') WHERE id = ?").run(p2.id);

    const tasks = findAll({ sort: 'updated_desc' });
    const pinned = tasks.filter((t) => t.is_pinned === 1);
    expect(pinned[0].id).toBe(p2.id);
    expect(pinned[1].id).toBe(p1.id);
  });
});

// ---------------------------------------------------------------------------
// findAll() — Completed/Cancelled after active tasks (tier-2 sort)
// ---------------------------------------------------------------------------
describe('findAll() — Completed and Cancelled tasks appear after active tasks', () => {
  it('active tasks appear before Completed tasks', () => {
    create({ title: 'Done task', status: 'Completed' });
    create({ title: 'Active task', status: 'Not Started' });

    const tasks = findAll({ sort: 'due_asc' });
    const titles = tasks.map((t) => t.title);
    expect(titles.indexOf('Active task')).toBeLessThan(titles.indexOf('Done task'));
  });

  it('active tasks appear before Cancelled tasks', () => {
    create({ title: 'Cancelled task', status: 'Cancelled' });
    create({ title: 'In progress task', status: 'In Progress' });

    const tasks = findAll({ sort: 'due_asc' });
    const titles = tasks.map((t) => t.title);
    expect(titles.indexOf('In progress task')).toBeLessThan(titles.indexOf('Cancelled task'));
  });

  it('pinned Completed task still sorts before unpinned active tasks', () => {
    create({ title: 'Unpinned active', status: 'Not Started', is_pinned: 0 });
    create({ title: 'Pinned done', status: 'Completed', is_pinned: 1 });

    const tasks = findAll({ sort: 'due_asc' });
    const titles = tasks.map((t) => t.title);
    expect(titles.indexOf('Pinned done')).toBeLessThan(titles.indexOf('Unpinned active'));
  });
});

// ---------------------------------------------------------------------------
// findAll() — status filter
// ---------------------------------------------------------------------------
describe('findAll() — status filter', () => {
  beforeEach(() => {
    create({ title: 'Not Started task', status: 'Not Started' });
    create({ title: 'In Progress task', status: 'In Progress' });
    create({ title: 'Completed task', status: 'Completed' });
    create({ title: 'Blocked task', status: 'Blocked' });
  });

  it('returns only tasks matching the given status filter', () => {
    const tasks = findAll({ status: ['Not Started'] });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Not Started task');
  });

  it('supports multiple status values in the filter array', () => {
    const tasks = findAll({ status: ['Not Started', 'In Progress'] });
    expect(tasks.length).toBe(2);
    const titles = tasks.map((t) => t.title);
    expect(titles).toContain('Not Started task');
    expect(titles).toContain('In Progress task');
  });

  it('returns all tasks when status filter is empty', () => {
    const tasks = findAll({ status: [] });
    expect(tasks.length).toBe(4);
  });

  it('ignores unknown status values', () => {
    const tasks = findAll({ status: ['Not Started', 'INVALID_STATUS'] });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Not Started task');
  });
});

// ---------------------------------------------------------------------------
// findAll() — priority filter
// ---------------------------------------------------------------------------
describe('findAll() — priority filter', () => {
  beforeEach(() => {
    create({ title: 'Low task', priority: 'Low' });
    create({ title: 'Medium task', priority: 'Medium' });
    create({ title: 'High task', priority: 'High' });
  });

  it('returns only tasks matching the given priority filter', () => {
    const tasks = findAll({ priority: ['High'] });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('High task');
  });

  it('supports multiple priority values in the filter array', () => {
    const tasks = findAll({ priority: ['High', 'Medium'] });
    expect(tasks.length).toBe(2);
    const titles = tasks.map((t) => t.title);
    expect(titles).toContain('High task');
    expect(titles).toContain('Medium task');
  });

  it('returns all tasks when priority filter is empty', () => {
    const tasks = findAll({ priority: [] });
    expect(tasks.length).toBe(3);
  });

  it('ignores unknown priority values', () => {
    const tasks = findAll({ priority: ['High', 'BOGUS'] });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('High task');
  });
});

// ---------------------------------------------------------------------------
// findAll() — combined status and priority filter
// ---------------------------------------------------------------------------
describe('findAll() — combined status and priority filter', () => {
  it('applies both status and priority filters together', () => {
    create({ title: 'High Not Started', priority: 'High', status: 'Not Started' });
    create({ title: 'High In Progress', priority: 'High', status: 'In Progress' });
    create({ title: 'Low Not Started', priority: 'Low', status: 'Not Started' });

    const tasks = findAll({ status: ['Not Started'], priority: ['High'] });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('High Not Started');
  });
});

// ---------------------------------------------------------------------------
// findById()
// ---------------------------------------------------------------------------
describe('findById()', () => {
  it('returns the correct task when found', () => {
    const created = create({ title: 'Find me', body: 'Here I am.', priority: 'Medium' });
    const found = findById(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.title).toBe('Find me');
    expect(found.body).toBe('Here I am.');
    expect(found.priority).toBe('Medium');
  });

  it('returns the full body (not a preview)', () => {
    const longBody = 'y'.repeat(200);
    const created = create({ title: 'Full body', body: longBody });
    const found = findById(created.id);
    expect(found.body.length).toBe(200);
  });

  it('returns undefined for a non-existent id', () => {
    const found = findById(999999);
    expect(found).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------
describe('update()', () => {
  it('updates title and returns the updated row', () => {
    const task = create({ title: 'Original title' });
    const updated = update(task.id, { title: 'Updated title' });
    expect(updated.title).toBe('Updated title');
    expect(updated.id).toBe(task.id);
  });

  it('updates body and returns the updated row', () => {
    const task = create({ title: 'With body', body: 'Old body' });
    const updated = update(task.id, { body: 'New body' });
    expect(updated.body).toBe('New body');
  });

  it('updates priority', () => {
    const task = create({ title: 'Low priority' });
    const updated = update(task.id, { priority: 'High' });
    expect(updated.priority).toBe('High');
  });

  it('updates status', () => {
    const task = create({ title: 'Not Started' });
    const updated = update(task.id, { status: 'Completed' });
    expect(updated.status).toBe('Completed');
  });

  it('updates is_pinned and normalises to integer', () => {
    const task = create({ title: 'Unpinned', is_pinned: 0 });
    const updated = update(task.id, { is_pinned: true });
    expect(updated.is_pinned).toBe(1);
  });

  it('updates due_date', () => {
    const task = create({ title: 'No date' });
    const updated = update(task.id, { due_date: '2026-09-01' });
    expect(updated.due_date).toBe('2026-09-01');
  });

  it('always refreshes updated_at', () => {
    const db = getDb();
    const task = create({ title: 'Time test' });
    db.prepare("UPDATE tasks SET updated_at = datetime('now', '-1 hour') WHERE id = ?").run(task.id);
    const before = findById(task.id).updated_at;

    const updated = update(task.id, { title: 'Time test updated' });
    expect(updated.updated_at).not.toBe(before);
  });

  it('returns the unchanged task when no valid fields are provided', () => {
    const task = create({ title: 'Unchanged' });
    const result = update(task.id, {});
    expect(result.id).toBe(task.id);
    expect(result.title).toBe('Unchanged');
  });

  it('returns undefined when id does not exist', () => {
    const result = update(999999, { title: 'Ghost' });
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------
describe('destroy()', () => {
  it('deletes the task and returns { deleted: true }', () => {
    const task = create({ title: 'To be deleted' });
    const result = destroy(task.id);
    expect(result).toEqual({ deleted: true });
    expect(findById(task.id)).toBeUndefined();
  });

  it('returns { deleted: false } when id does not exist', () => {
    const result = destroy(999999);
    expect(result).toEqual({ deleted: false });
  });
});
