# Phase 1 — Contacts Module · Complete Spec
# .claudedoc/contacts/

> This file contains all three spec documents for the Contacts feature.
> In your project, split these into three separate files as shown.

---

# FILE 1: `.claudedoc/contacts/requirements.md`

---

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

---

# FILE 2: `.claudedoc/contacts/design.md`

---

# Contacts — Technical Design

**Feature:** Contact Management  
**Phase:** 1  
**Status:** ✅ Approved  
**Date:** 2026-04-28

## Architecture Overview

```
Browser (React)
    │
    │  HTTP/JSON
    ▼
Express Server  (/api/contacts)
    │
    │  better-sqlite3
    ▼
SQLite Database  (pim.db)
```

The Contacts module is a standard CRUD feature with a React frontend
communicating to an Express REST API backed by SQLite.

## Data Model

### Table: `contacts`

| Column       | Type    | Constraints               | Notes                     |
|--------------|---------|---------------------------|---------------------------|
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT |                           |
| first_name   | TEXT    | NOT NULL                  |                           |
| last_name    | TEXT    | NOT NULL                  |                           |
| email        | TEXT    |                           | NULL if not provided      |
| phone        | TEXT    |                           | NULL if not provided      |
| company      | TEXT    |                           | NULL if not provided      |
| notes        | TEXT    |                           | NULL if not provided      |
| created_at   | TEXT    | NOT NULL                  | ISO8601 datetime string   |
| updated_at   | TEXT    | NOT NULL                  | ISO8601 datetime string   |

### Migration SQL

```sql
-- db/migrations/001_create_contacts.sql
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_last_name
  ON contacts(last_name, first_name);
```

## API Contract

### Endpoints

| Method | Path                  | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| GET    | /api/contacts         | List all contacts        | JWT  |
| POST   | /api/contacts         | Create a contact         | JWT  |
| GET    | /api/contacts/:id     | Get one contact          | JWT  |
| PATCH  | /api/contacts/:id     | Update a contact         | JWT  |
| DELETE | /api/contacts/:id     | Delete a contact         | JWT  |

> Note: Auth middleware is a stub in Phase 1 (token check only, no user accounts yet)

### GET /api/contacts

**Query params:** `?search=` (optional, filters by name/email)

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Ada",
      "last_name": "Lovelace",
      "email": "ada@example.com",
      "phone": null,
      "company": "Analytical Engine Co.",
      "notes": null,
      "created_at": "2026-04-28T10:00:00Z",
      "updated_at": "2026-04-28T10:00:00Z"
    }
  ],
  "error": null,
  "meta": { "count": 1 }
}
```

### POST /api/contacts

**Request body:**
```json
{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "email": "ada@example.com",
  "phone": null,
  "company": "Analytical Engine Co.",
  "notes": "Pioneer of computing"
}
```

**Response 201:** Full contact object in `data` field.

**Response 422 (validation error):**
```json
{
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "fields": { "last_name": "required" } },
  "meta": null
}
```

### PATCH /api/contacts/:id

**Request body:** Any subset of contact fields (partial update).

**Response 200:** Updated contact object.

**Response 404:**
```json
{ "data": null, "error": { "code": "NOT_FOUND" }, "meta": null }
```

### DELETE /api/contacts/:id

**Response 200:**
```json
{ "data": { "deleted": true }, "error": null, "meta": null }
```

## Component Design (Frontend)

```
Pages/
  ContactsPage.jsx          ← list view + search bar
  ContactDetailPage.jsx     ← full detail + edit/delete actions

Components/
  ContactList.jsx           ← renders sorted list of ContactListItem
  ContactListItem.jsx       ← one row: name, email, company
  ContactForm.jsx           ← shared form for create + edit
  ContactSearch.jsx         ← controlled search input
  EmptyState.jsx            ← reusable empty state (used by other modules too)
  ConfirmDialog.jsx         ← reusable delete confirmation modal
```

### Component Props

```jsx
// ContactListItem
{ contact: { id, first_name, last_name, email, company }, onClick }

// ContactForm
{ initialValues?, onSubmit, onCancel, isLoading }

// ConfirmDialog
{ isOpen, message, onConfirm, onCancel }
```

## State Management (Zustand)

```js
// client/src/store/contactsStore.js
{
  contacts: [],           // full list
  selected: null,         // currently viewed contact
  searchQuery: '',        // live search string
  isLoading: false,
  error: null,

  // Actions
  fetchContacts: async () => {},
  createContact: async (data) => {},
  updateContact: async (id, data) => {},
  deleteContact: async (id) => {},
  setSearchQuery: (query) => {},
  setSelected: (contact) => {},
}
```

Search filtering happens client-side using `searchQuery` against the
already-fetched `contacts` array. No extra API call needed.

## Error Handling Strategy

- Network errors: Toast notification ("Something went wrong. Try again.")
- Validation errors: Inline field errors below the input
- 404 on detail page: Redirect to `/contacts` with a toast
- Delete success: Redirect to `/contacts` with success toast

## Security Considerations

- All inputs sanitised server-side before DB insertion
- Parameterised queries only — no string interpolation in SQL
- Email validated with regex on server: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Auth middleware validates JWT on every `/api/*` route (stub in Phase 1)

---

# FILE 3: `.claudedoc/contacts/tasks.md`

---

# Contacts — Implementation Tasks

**Feature:** Contact Management  
**Phase:** 1  
**Status:** ✅ Approved — Ready to implement  
**Date:** 2026-04-28

> Implement tasks in order. One commit per task. Run tests before committing.
> Use `/spec-implement contacts` to have Claude Code execute these with sub-agents.

---

## Task 1 — Project scaffolding

**Files:** `package.json`, `server/index.js`, `client/` (Vite init), `db/`  
**What:** Initialise the monorepo: Express server + React/Vite client + SQLite connection  
**Done when:**
- `npm run dev:server` starts Express on port 3001
- `npm run dev:client` starts Vite on port 5173
- SQLite connection helper in `server/db.js` opens `db/pim.db`

**Commit:** `chore: initial project scaffold with Express, Vite, SQLite`

---

## Task 2 — Database migration runner

**Files:** `server/db.js`, `db/migrations/001_create_contacts.sql`  
**What:** Write a migration runner that reads SQL files from `db/migrations/` in
order and applies them to `pim.db` on server startup.  
**Done when:**
- Server startup applies migrations idempotently
- `contacts` table exists after first run
- Running again doesn't fail or duplicate tables

**Commit:** `chore(db): migration runner and contacts table schema`

---

## Task 3 — Contact model (server)

**Files:** `server/models/contact.js`  
**What:** Export five functions: `create`, `findAll`, `findById`, `update`, `destroy`  
using parameterised better-sqlite3 queries.  
**Done when:**
- All five functions work correctly against the live DB
- `findAll` accepts optional `search` string (LIKE on name/email)
- `findAll` returns results sorted by `last_name ASC, first_name ASC`
- Unit test in `tests/unit/contact-model.test.js` covers all functions

**Commit:** `feat(contacts): contact model with CRUD and search`

---

## Task 4 — Contacts API routes (server)

**Files:** `server/routes/contacts.js`, `server/index.js`  
**What:** Implement all five REST endpoints from design.md. Register on the Express app.  
**Done when:**
- All endpoints respond correctly to valid requests
- Validation returns 422 with field errors for missing first/last name
- Invalid email format returns 422
- 404 returned for non-existent IDs
- Response envelope `{ data, error, meta }` used consistently
- Integration test in `tests/unit/contacts-api.test.js` covers all endpoints

**Commit:** `feat(contacts): REST API endpoints with validation`

---

## Task 5 — API client (frontend)

**Files:** `client/src/api/contacts.js`  
**What:** Thin wrapper around `fetch` for each endpoint. Throws on non-2xx.  
**Done when:**
- Five functions exported: `getContacts`, `getContact`, `createContact`,
  `updateContact`, `deleteContact`
- All functions accept/return camelCased objects (convert snake_case from API)
- Unit test verifies request shapes with mocked fetch

**Commit:** `feat(contacts): frontend API client`

---

## Task 6 — Zustand contacts store

**Files:** `client/src/store/contactsStore.js`  
**What:** Zustand store with state and actions from design.md.  
**Done when:**
- All actions call the API client and update state correctly
- `searchQuery` filters `contacts` array in a derived `filteredContacts` selector
- Store is exported as `useContactsStore`

**Commit:** `feat(contacts): Zustand store with actions and search`

---

## Task 7 — ContactForm component

**Files:** `client/src/components/ContactForm.jsx`  
**What:** Controlled form component for create and edit. Validates required fields.  
**Done when:**
- Renders fields: first name, last name, email, phone, company, notes
- Shows inline validation errors for empty required fields
- Calls `onSubmit` with form data on valid submit
- Shows loading state while `isLoading` is true
- Unit test covers validation and submit behaviour

**Commit:** `feat(contacts): ContactForm component with validation`

---

## Task 8 — ContactsPage (list view)

**Files:** `client/src/pages/ContactsPage.jsx`, `client/src/components/ContactList.jsx`,
`client/src/components/ContactListItem.jsx`, `client/src/components/ContactSearch.jsx`,
`client/src/components/EmptyState.jsx`  
**What:** List page showing all contacts with live search and empty state.  
**Done when:**
- Fetches contacts on mount via store
- Search input filters list in real time (no API call)
- Clicking a contact row navigates to `/contacts/:id`
- Empty state shown when no contacts match
- "Add Contact" button navigates to `/contacts/new`

**Commit:** `feat(contacts): contacts list page with search`

---

## Task 9 — ContactDetailPage (detail + edit + delete)

**Files:** `client/src/pages/ContactDetailPage.jsx`,
`client/src/components/ConfirmDialog.jsx`  
**What:** Detail page showing one contact with edit mode toggle and delete.  
**Done when:**
- Loads contact by ID from store (or fetches if not cached)
- Shows all fields in read mode
- "Edit" button switches to inline edit using `ContactForm`
- Save updates via store; cancel restores previous values
- "Delete" shows `ConfirmDialog`; on confirm, deletes and redirects to `/contacts`
- 404 redirects to `/contacts` with a toast message

**Commit:** `feat(contacts): contact detail page with edit and delete`

---

## Task 10 — Routing and navigation

**Files:** `client/src/App.jsx`, `client/src/components/Sidebar.jsx`  
**What:** Wire up React Router routes and add Contacts to the sidebar nav.  
**Done when:**
- `/contacts` → `ContactsPage`
- `/contacts/new` → `ContactDetailPage` in create mode
- `/contacts/:id` → `ContactDetailPage`
- Sidebar shows "Contacts" link with active state

**Commit:** `feat(contacts): routing and sidebar navigation`

---

## Task 11 — E2E test: contacts happy path

**Files:** `tests/e2e/contacts.spec.js`  
**What:** Playwright test covering the full user journey.  
**Done when:** Test passes for this sequence:
1. Navigate to `/contacts`
2. See empty state
3. Click "Add Contact", fill form, submit
4. See new contact in list
5. Click contact, see detail view
6. Edit a field, save, see updated value
7. Delete contact, confirm, see empty state again

**Commit:** `test(contacts): E2E happy path with Playwright`

---

## Implementation Complete

After Task 11, run:
```bash
npm test
npm run test:e2e
```

Then run `/spec-review contacts` to invoke the Reviewer Agent.