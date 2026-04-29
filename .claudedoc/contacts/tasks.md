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