# Notes — Requirements

**Feature:** Notes
**Phase:** 2
**Status:** Draft
**Date:** 2026-04-30

---

## Problem Statement

The user needs a personal scratchpad inside the PIM — a place to jot down freeform ideas, reminders, and reference material, the digital equivalent of sticky notes or scrap paper. Notes are entirely standalone and independent of Contacts. The feature should feel lightweight and immediate, with Markdown support for structure and tags for loose organisation.

---

## User Stories

- As a user, I want to create a new note by typing freely so that I can capture ideas quickly without friction.
- As a user, I want the first line of my note to automatically become its title so that I don't have to maintain a separate title field.
- As a user, I want to write in Markdown and see it render as I type so that I can format my notes without leaving the editor.
- As a user, I want to tag notes with up to 5 labels so that I can loosely group related notes.
- As a user, I want to create new tags on the fly while editing a note so that I'm not interrupted by a separate tag management screen.
- As a user, I want to pin important notes so that they always appear at the top of my list.
- As a user, I want to sort my notes (beyond pinned-first) so that I can find what I need quickly.
- As a user, I want to edit and delete notes so that I can keep my scratchpad up to date.
- As a user, I want tags to be cleaned up automatically when no notes use them so that my tag list stays tidy.

---

## Acceptance Criteria

### Create & Edit
- [ ] A new empty note can be created (blank content is valid).
- [ ] The first line of the note body is used as the display title; if the note is empty, a placeholder title (e.g. "Untitled") is shown.
- [ ] Note content is limited to 25,000 characters; the UI shows a character count and prevents saving beyond the limit.
- [ ] Notes are saved automatically (on blur or debounced keypress) or via an explicit Save button — design decision deferred to Design Agent.

### Markdown Editor
- [ ] The editor is a plain textarea with hybrid inline Markdown rendering (Typora-style): Markdown syntax renders as the user types (e.g. after pressing Enter or leaving a token) and reverts to raw syntax when the cursor moves back to that element.
- [ ] The following Markdown elements are supported in the initial release: headings (H1–H3), bold, italic, inline code, code blocks, unordered lists, ordered lists, blockquotes, and hyperlinks.
- [ ] The Markdown rendering layer is architected to be extensible — adding new element types requires only a new renderer rule, not structural changes.

### Tags
- [ ] A note can have 0–5 tags.
- [ ] Tags are managed via a dropdown/combobox on the note editor: the user can select from existing tags or type a new tag name to create it on the fly.
- [ ] A tag is automatically deleted from the system when no notes reference it.
- [ ] Tags are displayed on the note in the list view and on the note detail/edit view.

### Pinning & Sorting
- [ ] A note can be pinned or unpinned via a toggle on the note card or detail view.
- [ ] Pinned notes always appear before unpinned notes in the list.
- [ ] Within each group (pinned / unpinned), the user can choose a sort order: Last Modified (default), Oldest First, or Title A–Z.
- [ ] The chosen sort order persists for the session (and ideally across sessions).

### Delete
- [ ] A note can be deleted from the detail view.
- [ ] Deleting a note requires confirmation (ConfirmDialog, same pattern as Contacts).
- [ ] After deletion the user is redirected to the Notes list.
- [ ] Deleting a note removes any tags that are no longer referenced by any other note.

### List View
- [ ] The notes list shows each note's derived title, a short content preview, its tags, and a pin indicator.
- [ ] The list is sorted pinned-first, then by the user's chosen sort order.

---

## Out of Scope

- Full-text or title search (deferred to Phase 5 — Search module)
- Folders or nested organisation
- Rich-text toolbar (bold/italic buttons) — plain textarea + Markdown only
- Note sharing or export
- Attachments or image embedding
- Revision history / undo beyond standard browser behaviour
- Multi-user or collaboration features
- Note templates

---

## Open Questions

- **Auto-save vs explicit Save:** Should notes save automatically (debounced) or require the user to click Save? (Recommend auto-save for a scratchpad feel — decision for Design Agent.)
- **Tag character limits:** Should individual tag names have a maximum length? (Suggest 30 characters — confirm at design time.)
- **Sort order persistence:** Session-only (Zustand state) or persisted to `localStorage`/DB?
