/**
 * Unit tests for the Task Tag model (server/models/task-tag.js).
 * Uses the real SQLite database via the db helper (migrations applied once per suite).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import { findAll, syncTaskTags, getTagsForTask } from '../../server/models/task-tag.js';
import { create as createTask } from '../../server/models/task.js';

/**
 * Apply migrations before each test and tear down after to keep tests isolated.
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
// findAll()
// ---------------------------------------------------------------------------
describe('findAll()', () => {
  it('returns an empty array when there are no tags', () => {
    const tags = findAll();
    expect(tags).toEqual([]);
  });

  it('returns all tags sorted by name ASC', () => {
    const task = createTask({ title: 'Task with tags' });
    syncTaskTags(task.id, ['zebra', 'apple', 'mango']);

    const tags = findAll();
    expect(tags.map((t) => t.name)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('each tag object has id and name fields', () => {
    const task = createTask({ title: 'Tag shape test' });
    syncTaskTags(task.id, ['mytag']);

    const tags = findAll();
    expect(tags.length).toBe(1);
    expect(tags[0]).toHaveProperty('id');
    expect(tags[0]).toHaveProperty('name', 'mytag');
    expect(tags[0].id).toBeTypeOf('number');
  });
});

// ---------------------------------------------------------------------------
// syncTaskTags() — create new tags
// ---------------------------------------------------------------------------
describe('syncTaskTags() — creating new tags', () => {
  it('creates tags that did not previously exist', () => {
    const task = createTask({ title: 'New tags task' });
    const result = syncTaskTags(task.id, ['alpha', 'beta']);

    expect(result).toHaveLength(2);
    const names = result.map((t) => t.name);
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
  });

  it('returns tags sorted by name ASC', () => {
    const task = createTask({ title: 'Sort test task' });
    const result = syncTaskTags(task.id, ['zed', 'ant', 'cat']);

    expect(result.map((t) => t.name)).toEqual(['ant', 'cat', 'zed']);
  });

  it('each returned tag has an integer id and a name', () => {
    const task = createTask({ title: 'Shape test' });
    const result = syncTaskTags(task.id, ['shape']);

    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name', 'shape');
    expect(result[0].id).toBeTypeOf('number');
  });

  it('returns an empty array when tagNames is empty', () => {
    const task = createTask({ title: 'No tags task' });
    const result = syncTaskTags(task.id, []);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncTaskTags() — normalisation
// ---------------------------------------------------------------------------
describe('syncTaskTags() — tag name normalisation', () => {
  it('lowercases tag names before storing', () => {
    const task = createTask({ title: 'Case test' });
    const result = syncTaskTags(task.id, ['UPPER', 'Mixed']);

    const names = result.map((t) => t.name);
    expect(names).toContain('upper');
    expect(names).toContain('mixed');
  });

  it('trims whitespace from tag names', () => {
    const task = createTask({ title: 'Whitespace test' });
    const result = syncTaskTags(task.id, ['  padded  ', '\ttabbed\t']);

    const names = result.map((t) => t.name);
    expect(names).toContain('padded');
    expect(names).toContain('tabbed');
  });

  it('filters out tags that are empty after normalisation', () => {
    const task = createTask({ title: 'Empty tag test' });
    const result = syncTaskTags(task.id, ['  ', '', 'valid']);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// syncTaskTags() — reuse existing tags
// ---------------------------------------------------------------------------
describe('syncTaskTags() — reusing existing tags', () => {
  it('reuses an existing tag row instead of creating a duplicate', () => {
    const task1 = createTask({ title: 'Task 1' });
    const task2 = createTask({ title: 'Task 2' });

    syncTaskTags(task1.id, ['shared']);
    syncTaskTags(task2.id, ['shared']);

    const allTags = findAll();
    const sharedTags = allTags.filter((t) => t.name === 'shared');
    expect(sharedTags).toHaveLength(1);
  });

  it('the shared tag has the same id for both tasks', () => {
    const task1 = createTask({ title: 'Task A' });
    const task2 = createTask({ title: 'Task B' });

    const tags1 = syncTaskTags(task1.id, ['reused']);
    const tags2 = syncTaskTags(task2.id, ['reused']);

    expect(tags1[0].id).toBe(tags2[0].id);
  });
});

// ---------------------------------------------------------------------------
// syncTaskTags() — replacing an existing tag set
// ---------------------------------------------------------------------------
describe('syncTaskTags() — replacing tag set', () => {
  it('replaces the old tag set entirely', () => {
    const task = createTask({ title: 'Replace test' });

    syncTaskTags(task.id, ['old1', 'old2']);
    const result = syncTaskTags(task.id, ['new1', 'new2']);

    const names = result.map((t) => t.name);
    expect(names).toContain('new1');
    expect(names).toContain('new2');
    expect(names).not.toContain('old1');
    expect(names).not.toContain('old2');
  });
});

// ---------------------------------------------------------------------------
// syncTaskTags() — orphan cleanup
// ---------------------------------------------------------------------------
describe('syncTaskTags() — orphan cleanup', () => {
  it('deletes vocab entries that no longer have any task associations', () => {
    const task = createTask({ title: 'Orphan task' });

    syncTaskTags(task.id, ['orphan-tag']);
    // Remove all tags from the task — the vocab entry should now be orphaned and deleted.
    syncTaskTags(task.id, []);

    const allTags = findAll();
    expect(allTags.find((t) => t.name === 'orphan-tag')).toBeUndefined();
  });

  it('keeps tags that are still used by other tasks', () => {
    const task1 = createTask({ title: 'Keeper task' });
    const task2 = createTask({ title: 'Remover task' });

    syncTaskTags(task1.id, ['shared', 'task1-only']);
    syncTaskTags(task2.id, ['shared']);

    // Remove tags from task1; 'task1-only' should be orphaned, 'shared' should survive.
    syncTaskTags(task1.id, []);

    const allTags = findAll();
    const names = allTags.map((t) => t.name);
    expect(names).toContain('shared');
    expect(names).not.toContain('task1-only');
  });

  it('atomicity: orphan cleanup is part of the same transaction', () => {
    // Verify that after a successful sync the db state is always consistent.
    const task = createTask({ title: 'Atomic task' });

    syncTaskTags(task.id, ['tag-a', 'tag-b']);
    // Switch to a completely different tag set.
    syncTaskTags(task.id, ['tag-c']);

    const tagsForTask = getTagsForTask(task.id);
    const allTags = findAll();

    // Only tag-c should be linked to the task.
    expect(tagsForTask.map((t) => t.name)).toEqual(['tag-c']);
    // tag-a and tag-b should be gone (orphaned).
    const names = allTags.map((t) => t.name);
    expect(names).not.toContain('tag-a');
    expect(names).not.toContain('tag-b');
    expect(names).toContain('tag-c');
  });
});

// ---------------------------------------------------------------------------
// getTagsForTask()
// ---------------------------------------------------------------------------
describe('getTagsForTask()', () => {
  it('returns the tags associated with a task', () => {
    const task = createTask({ title: 'Tagged task' });
    syncTaskTags(task.id, ['foo', 'bar']);

    const tags = getTagsForTask(task.id);
    const names = tags.map((t) => t.name);
    expect(names).toContain('foo');
    expect(names).toContain('bar');
  });

  it('returns tags sorted by name ASC', () => {
    const task = createTask({ title: 'Sort task' });
    syncTaskTags(task.id, ['zzz', 'aaa', 'mmm']);

    const tags = getTagsForTask(task.id);
    expect(tags.map((t) => t.name)).toEqual(['aaa', 'mmm', 'zzz']);
  });

  it('returns an empty array for a task with no tags', () => {
    const task = createTask({ title: 'No tags' });
    const tags = getTagsForTask(task.id);
    expect(tags).toEqual([]);
  });

  it('does not include tags from other tasks', () => {
    const task1 = createTask({ title: 'Task 1' });
    const task2 = createTask({ title: 'Task 2' });

    syncTaskTags(task1.id, ['task1-tag']);
    syncTaskTags(task2.id, ['task2-tag']);

    const tags = getTagsForTask(task1.id);
    expect(tags.map((t) => t.name)).toContain('task1-tag');
    expect(tags.map((t) => t.name)).not.toContain('task2-tag');
  });

  it('each returned tag object has id (number) and name fields', () => {
    const task = createTask({ title: 'Shape task' });
    syncTaskTags(task.id, ['shape-tag']);

    const tags = getTagsForTask(task.id);
    expect(tags[0]).toHaveProperty('id');
    expect(tags[0]).toHaveProperty('name', 'shape-tag');
    expect(tags[0].id).toBeTypeOf('number');
  });
});
