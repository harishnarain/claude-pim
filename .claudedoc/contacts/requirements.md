# Contacts — Requirements

**Feature:** Contact Management  
**Phase:** 1  
**Status:** ✅ Approved  
**Date:** 2026-04-28

## Problem Statement

Users currently manage contacts across email apps, phone contacts, and spreadsheets with no unified place to store people they know — colleagues, clients, friends, service providers. The PIM needs a Contacts module that acts as a personal address book: fast to search, easy to add to, and rich enough to store everything relevant about a person.

## User Stories

- As a user, I want to add a new contact with a name, email, phone, and notes so that I have their information in one place.
- As a user, I want to view a list of all my contacts so that I can browse who I've added.
- As a user, I want to search contacts by name or email so that I can find someone quickly without scrolling.
- As a user, I want to view a contact's full details so that I can see everything I've stored about them.
- As a user, I want to edit a contact's information so that I can keep it up to date.
- As a user, I want to delete a contact so that I can remove people I no longer need.
- As a user, I want contacts sorted alphabetically by last name so that the list is predictable.

## Acceptance Criteria

- [ ] A contact can be created with: first name (required), last name (required), email (optional), phone (optional), company (optional), notes (optional)
- [ ] The contacts list shows: full name, email, company (truncated if long)
- [ ] Contacts are sorted alphabetically by last name, then first name
- [ ] A search box filters the list in real time (no page reload) by name or email
- [ ] Clicking a contact opens a detail view with all fields displayed
- [ ] A contact can be edited from the detail view; changes persist after page refresh
- [ ] A contact can be deleted with a confirmation prompt
- [ ] Empty state: when no contacts exist, show a friendly prompt to add one
- [ ] Validation: first name and last name are required; email must be valid format if provided
- [ ] All changes are persisted to the database (survive browser refresh)

## Out of Scope (Phase 1)

- Photo/avatar upload
- Contact groups or tags
- Import from CSV / Google Contacts
- Duplicate detection
- Linking contacts to notes or tasks (Phase 3)
- Sharing contacts

## Open Questions

- ~~Should phone numbers be validated by format?~~ **Decision: No format validation in Phase 1 — store as plain text**
- ~~Single email per contact or multiple?~~ **Decision: Single email and single phone for Phase 1**
