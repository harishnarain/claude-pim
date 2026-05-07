/**
 * Unit tests for the Tag model (server/models/tag.js).
 * Uses the real SQLite database via the db helper (migrations applied once per suite).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import { findAll, syncNoteTags, getTagsForNote } from '../../server/models/tag.js';
import { create as createNote } from '../../server/models/note.js';

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
  db.prepare('DELETE FROM tags').run();
  db.prepare('DELETE FROM notes').run();
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
    const note = createNote({ content: 'Note with tags' });
    syncNoteTags(note.id, ['zebra', 'apple', 'mango']);

    const tags = findAll();
    expect(tags.map((t) => t.name)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('each tag object has id and name fields', () => {
    const note = createNote({ content: 'Tag shape test' });
    syncNoteTags(note.id, ['mytag']);

    const tags = findAll();
    expect(tags.length).toBe(1);
    expect(tags[0]).toHaveProperty('id');
    expect(tags[0]).toHaveProperty('name', 'mytag');
    expect(tags[0].id).toBeTypeOf('number');
  });
});

// ---------------------------------------------------------------------------
// syncNoteTags() — create new tags
// ---------------------------------------------------------------------------
describe('syncNoteTags() — creating new tags', () => {
  it('creates tags that did not previously exist', () => {
    const note = createNote({ content: 'New tags note' });
    const result = syncNoteTags(note.id, ['alpha', 'beta']);

    expect(result).toHaveLength(2);
    const names = result.map((t) => t.name);
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
  });

  it('returns tags sorted by name ASC', () => {
    const note = createNote({ content: 'Sort test note' });
    const result = syncNoteTags(note.id, ['zed', 'ant', 'cat']);

    expect(result.map((t) => t.name)).toEqual(['ant', 'cat', 'zed']);
  });

  it('each returned tag has an integer id and a name', () => {
    const note = createNote({ content: 'Shape test' });
    const result = syncNoteTags(note.id, ['shape']);

    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name', 'shape');
    expect(result[0].id).toBeTypeOf('number');
  });

  it('returns an empty array when tagNames is empty', () => {
    const note = createNote({ content: 'No tags note' });
    const result = syncNoteTags(note.id, []);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncNoteTags() — normalisation
// ---------------------------------------------------------------------------
describe('syncNoteTags() — tag name normalisation', () => {
  it('lowercases tag names before storing', () => {
    const note = createNote({ content: 'Case test' });
    const result = syncNoteTags(note.id, ['UPPER', 'Mixed']);

    const names = result.map((t) => t.name);
    expect(names).toContain('upper');
    expect(names).toContain('mixed');
  });

  it('trims whitespace from tag names', () => {
    const note = createNote({ content: 'Whitespace test' });
    const result = syncNoteTags(note.id, ['  padded  ', '\ttabbed\t']);

    const names = result.map((t) => t.name);
    expect(names).toContain('padded');
    expect(names).toContain('tabbed');
  });

  it('filters out tags that are empty after normalisation', () => {
    const note = createNote({ content: 'Empty tag test' });
    const result = syncNoteTags(note.id, ['  ', '', 'valid']);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// syncNoteTags() — reuse existing tags
// ---------------------------------------------------------------------------
describe('syncNoteTags() — reusing existing tags', () => {
  it('reuses an existing tag row instead of creating a duplicate', () => {
    const note1 = createNote({ content: 'Note 1' });
    const note2 = createNote({ content: 'Note 2' });

    syncNoteTags(note1.id, ['shared']);
    syncNoteTags(note2.id, ['shared']);

    const allTags = findAll();
    const sharedTags = allTags.filter((t) => t.name === 'shared');
    expect(sharedTags).toHaveLength(1);
  });

  it('the shared tag has the same id for both notes', () => {
    const note1 = createNote({ content: 'Note A' });
    const note2 = createNote({ content: 'Note B' });

    const tags1 = syncNoteTags(note1.id, ['reused']);
    const tags2 = syncNoteTags(note2.id, ['reused']);

    expect(tags1[0].id).toBe(tags2[0].id);
  });
});

// ---------------------------------------------------------------------------
// syncNoteTags() — replacing an existing tag set
// ---------------------------------------------------------------------------
describe('syncNoteTags() — replacing tag set', () => {
  it('replaces the old tag set entirely', () => {
    const note = createNote({ content: 'Replace test' });

    syncNoteTags(note.id, ['old1', 'old2']);
    const result = syncNoteTags(note.id, ['new1', 'new2']);

    const names = result.map((t) => t.name);
    expect(names).toContain('new1');
    expect(names).toContain('new2');
    expect(names).not.toContain('old1');
    expect(names).not.toContain('old2');
  });
});

// ---------------------------------------------------------------------------
// syncNoteTags() — orphan cleanup
// ---------------------------------------------------------------------------
describe('syncNoteTags() — orphan cleanup', () => {
  it('deletes tags that no longer have any note associations', () => {
    const note = createNote({ content: 'Orphan note' });

    syncNoteTags(note.id, ['orphan-tag']);
    // Remove all tags from the note — the tag should now be orphaned and deleted.
    syncNoteTags(note.id, []);

    const allTags = findAll();
    expect(allTags.find((t) => t.name === 'orphan-tag')).toBeUndefined();
  });

  it('keeps tags that are still used by other notes', () => {
    const note1 = createNote({ content: 'Keeper note' });
    const note2 = createNote({ content: 'Remover note' });

    syncNoteTags(note1.id, ['shared', 'note1-only']);
    syncNoteTags(note2.id, ['shared']);

    // Remove tags from note1; 'note1-only' should be orphaned, 'shared' should survive.
    syncNoteTags(note1.id, []);

    const allTags = findAll();
    const names = allTags.map((t) => t.name);
    expect(names).toContain('shared');
    expect(names).not.toContain('note1-only');
  });

  it('atomicity: orphan cleanup is part of the same transaction', () => {
    // Verify that after a successful sync the db state is always consistent.
    const note = createNote({ content: 'Atomic note' });

    syncNoteTags(note.id, ['tag-a', 'tag-b']);
    // Switch to a completely different tag set.
    syncNoteTags(note.id, ['tag-c']);

    const tagsForNote = getTagsForNote(note.id);
    const allTags = findAll();

    // Only tag-c should be linked to the note.
    expect(tagsForNote.map((t) => t.name)).toEqual(['tag-c']);
    // tag-a and tag-b should be gone (orphaned).
    const names = allTags.map((t) => t.name);
    expect(names).not.toContain('tag-a');
    expect(names).not.toContain('tag-b');
    expect(names).toContain('tag-c');
  });
});

// ---------------------------------------------------------------------------
// getTagsForNote()
// ---------------------------------------------------------------------------
describe('getTagsForNote()', () => {
  it('returns the tags associated with a note', () => {
    const note = createNote({ content: 'Tagged note' });
    syncNoteTags(note.id, ['foo', 'bar']);

    const tags = getTagsForNote(note.id);
    const names = tags.map((t) => t.name);
    expect(names).toContain('foo');
    expect(names).toContain('bar');
  });

  it('returns tags sorted by name ASC', () => {
    const note = createNote({ content: 'Sort note' });
    syncNoteTags(note.id, ['zzz', 'aaa', 'mmm']);

    const tags = getTagsForNote(note.id);
    expect(tags.map((t) => t.name)).toEqual(['aaa', 'mmm', 'zzz']);
  });

  it('returns an empty array for a note with no tags', () => {
    const note = createNote({ content: 'No tags' });
    const tags = getTagsForNote(note.id);
    expect(tags).toEqual([]);
  });

  it('does not include tags from other notes', () => {
    const note1 = createNote({ content: 'Note 1' });
    const note2 = createNote({ content: 'Note 2' });

    syncNoteTags(note1.id, ['note1-tag']);
    syncNoteTags(note2.id, ['note2-tag']);

    const tags = getTagsForNote(note1.id);
    expect(tags.map((t) => t.name)).toContain('note1-tag');
    expect(tags.map((t) => t.name)).not.toContain('note2-tag');
  });

  it('each returned tag object has id (number) and name fields', () => {
    const note = createNote({ content: 'Shape note' });
    syncNoteTags(note.id, ['shape-tag']);

    const tags = getTagsForNote(note.id);
    expect(tags[0]).toHaveProperty('id');
    expect(tags[0]).toHaveProperty('name', 'shape-tag');
    expect(tags[0].id).toBeTypeOf('number');
  });
});
