/**
 * Unit tests for the Note model (server/models/note.js).
 * Uses the real SQLite database via the db helper (migrations applied once per test).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import { create, findAll, findById, update, destroy } from '../../server/models/note.js';

/**
 * Apply migrations before each test and tear down after to keep tests isolated.
 */
beforeEach(() => {
  const db = getDb();
  runMigrations(db);
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM notes').run();
  closeDb();
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------
describe('create()', () => {
  it('inserts a note and returns the full row', () => {
    const note = create({ content: 'Hello world', is_pinned: 0 });

    expect(note).toBeDefined();
    expect(note.id).toBeTypeOf('number');
    expect(note.content).toBe('Hello world');
    expect(note.is_pinned).toBe(0);
    expect(note.created_at).toBeDefined();
    expect(note.updated_at).toBeDefined();
  });

  it('defaults content to empty string when omitted', () => {
    const note = create({});
    expect(note.content).toBe('');
  });

  it('defaults is_pinned to 0 when omitted', () => {
    const note = create({ content: 'Test' });
    expect(note.is_pinned).toBe(0);
  });

  it('stores is_pinned as 1 when truthy value provided', () => {
    const note = create({ content: 'Pinned note', is_pinned: 1 });
    expect(note.is_pinned).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findAll() — basic
// ---------------------------------------------------------------------------
describe('findAll() — basic', () => {
  beforeEach(() => {
    create({ content: 'First note\nSome preview text' });
    create({ content: 'Second note\nMore preview text' });
    create({ content: 'Third note\nEven more preview' });
  });

  it('returns all notes', () => {
    const notes = findAll();
    expect(notes.length).toBe(3);
  });

  it('each row carries a title computed column', () => {
    const notes = findAll();
    const titles = notes.map((n) => n.title);
    expect(titles).toContain('First note');
    expect(titles).toContain('Second note');
    expect(titles).toContain('Third note');
  });

  it('each row carries a preview computed column', () => {
    const notes = findAll();
    const previews = notes.map((n) => n.preview);
    expect(previews).toContain('Some preview text');
    expect(previews).toContain('More preview text');
    expect(previews).toContain('Even more preview');
  });

  it('preview strips leading and trailing whitespace', () => {
    create({ content: 'Whitespace note\n   trimmed   ' });
    const notes = findAll();
    const ws = notes.find((n) => n.title === 'Whitespace note');
    expect(ws.preview).toBe('trimmed');
  });

  it('title is the first line only (no newline characters)', () => {
    const notes = findAll();
    for (const note of notes) {
      expect(note.title).not.toContain('\n');
    }
  });

  it('preview is capped at 140 characters', () => {
    const longText = 'x'.repeat(200);
    create({ content: `Long note\n${longText}` });
    const notes = findAll();
    const long = notes.find((n) => n.title === 'Long note');
    expect(long.preview.length).toBeLessThanOrEqual(140);
  });
});

// ---------------------------------------------------------------------------
// findAll() — sort orders
// ---------------------------------------------------------------------------
describe('findAll() — sort: updated_desc (default)', () => {
  it('returns notes sorted by updated_at DESC among unpinned notes', () => {
    // Insert with slight ordering: SQLite datetime('now') has 1-second granularity,
    // so we manipulate updated_at directly.
    const db = getDb();
    const a = create({ content: 'Note A' });
    const b = create({ content: 'Note B' });
    // Manually push A's updated_at into the past so B is newer.
    db.prepare("UPDATE notes SET updated_at = datetime('now', '-10 seconds') WHERE id = ?").run(a.id);

    const notes = findAll({ sort: 'updated_desc' });
    const ids = notes.map((n) => n.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });
});

describe('findAll() — sort: updated_asc', () => {
  it('returns notes sorted by updated_at ASC among unpinned notes', () => {
    const db = getDb();
    const a = create({ content: 'Note A' });
    const b = create({ content: 'Note B' });
    db.prepare("UPDATE notes SET updated_at = datetime('now', '-10 seconds') WHERE id = ?").run(a.id);

    const notes = findAll({ sort: 'updated_asc' });
    const ids = notes.map((n) => n.id);
    expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
  });
});

describe('findAll() — sort: title_asc', () => {
  it('returns unpinned notes sorted by first line ASC', () => {
    create({ content: 'Zebra note\npreview' });
    create({ content: 'Apple note\npreview' });
    create({ content: 'Mango note\npreview' });

    const notes = findAll({ sort: 'title_asc' });
    const titles = notes.map((n) => n.title);
    expect(titles[0]).toBe('Apple note');
    expect(titles[1]).toBe('Mango note');
    expect(titles[2]).toBe('Zebra note');
  });
});

// ---------------------------------------------------------------------------
// findAll() — pin-first behaviour
// ---------------------------------------------------------------------------
describe('findAll() — pinned notes always sort first', () => {
  it('pinned notes come before unpinned with updated_desc', () => {
    const db = getDb();
    const unpinned = create({ content: 'Unpinned\npreview', is_pinned: 0 });
    const pinned = create({ content: 'Pinned\npreview', is_pinned: 1 });
    // Make unpinned more recently updated than pinned — pin should still win.
    db.prepare("UPDATE notes SET updated_at = datetime('now', '+5 seconds') WHERE id = ?").run(unpinned.id);

    const notes = findAll({ sort: 'updated_desc' });
    expect(notes[0].id).toBe(pinned.id);
    expect(notes[1].id).toBe(unpinned.id);
  });

  it('pinned notes come before unpinned with updated_asc', () => {
    const db = getDb();
    const pinned = create({ content: 'Pinned\npreview', is_pinned: 1 });
    const unpinned = create({ content: 'Unpinned\npreview', is_pinned: 0 });
    db.prepare("UPDATE notes SET updated_at = datetime('now', '-10 seconds') WHERE id = ?").run(pinned.id);

    const notes = findAll({ sort: 'updated_asc' });
    expect(notes[0].id).toBe(pinned.id);
  });

  it('pinned notes come before unpinned with title_asc', () => {
    create({ content: 'Aardvark note\npreview', is_pinned: 0 });
    create({ content: 'Zebra note\npreview', is_pinned: 1 });

    const notes = findAll({ sort: 'title_asc' });
    // Zebra is pinned, so it must come before Aardvark despite alphabetical order.
    expect(notes[0].title).toBe('Zebra note');
    expect(notes[1].title).toBe('Aardvark note');
  });

  it('multiple pinned notes are sorted by secondary order among themselves', () => {
    const db = getDb();
    const p1 = create({ content: 'Pinned 1\npreview', is_pinned: 1 });
    const p2 = create({ content: 'Pinned 2\npreview', is_pinned: 1 });
    // Make p2 more recently updated.
    db.prepare("UPDATE notes SET updated_at = datetime('now', '+5 seconds') WHERE id = ?").run(p2.id);

    const notes = findAll({ sort: 'updated_desc' });
    const pinnedNotes = notes.filter((n) => n.is_pinned === 1);
    expect(pinnedNotes[0].id).toBe(p2.id);
    expect(pinnedNotes[1].id).toBe(p1.id);
  });
});

// ---------------------------------------------------------------------------
// findAll() — unknown sort falls back to updated_desc
// ---------------------------------------------------------------------------
describe('findAll() — unknown sort value', () => {
  it('falls back to updated_desc for unknown sort values', () => {
    const db = getDb();
    const a = create({ content: 'Note A' });
    const b = create({ content: 'Note B' });
    db.prepare("UPDATE notes SET updated_at = datetime('now', '-10 seconds') WHERE id = ?").run(a.id);

    const notes = findAll({ sort: 'bogus_sort' });
    const ids = notes.map((n) => n.id);
    // B is more recent, should come first.
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });
});

// ---------------------------------------------------------------------------
// findById()
// ---------------------------------------------------------------------------
describe('findById()', () => {
  it('returns the correct note when found', () => {
    const created = create({ content: 'Find me\npreview', is_pinned: 0 });
    const found = findById(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.content).toBe('Find me\npreview');
  });

  it('includes the title computed column', () => {
    const created = create({ content: 'My title\nmy preview' });
    const found = findById(created.id);
    expect(found.title).toBe('My title');
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
  it('updates content and returns the updated row', () => {
    const note = create({ content: 'Original content' });
    const updated = update(note.id, { content: 'Updated content' });
    expect(updated.content).toBe('Updated content');
    expect(updated.id).toBe(note.id);
  });

  it('updates is_pinned and returns the updated row', () => {
    const note = create({ content: 'Unpinned note', is_pinned: 0 });
    const updated = update(note.id, { is_pinned: 1 });
    expect(updated.is_pinned).toBe(1);
  });

  it('updates both content and is_pinned together', () => {
    const note = create({ content: 'Old', is_pinned: 0 });
    const updated = update(note.id, { content: 'New', is_pinned: 1 });
    expect(updated.content).toBe('New');
    expect(updated.is_pinned).toBe(1);
  });

  it('always sets updated_at to datetime now', () => {
    const db = getDb();
    const note = create({ content: 'Time test' });
    // Push updated_at into the past.
    db.prepare("UPDATE notes SET updated_at = datetime('now', '-1 hour') WHERE id = ?").run(note.id);
    const before = findById(note.id).updated_at;

    const updated = update(note.id, { content: 'Time test updated' });
    expect(updated.updated_at).not.toBe(before);
  });

  it('returns the unchanged note when no valid fields are provided', () => {
    const note = create({ content: 'Unchanged' });
    const result = update(note.id, {});
    expect(result.id).toBe(note.id);
    expect(result.content).toBe('Unchanged');
  });

  it('returns undefined when id does not exist', () => {
    const result = update(999999, { content: 'Ghost' });
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------
describe('destroy()', () => {
  it('deletes the note and returns { deleted: true }', () => {
    const note = create({ content: 'To be deleted' });
    const result = destroy(note.id);
    expect(result).toEqual({ deleted: true });
    expect(findById(note.id)).toBeUndefined();
  });

  it('returns { deleted: false } when id does not exist', () => {
    const result = destroy(999999);
    expect(result).toEqual({ deleted: false });
  });
});
