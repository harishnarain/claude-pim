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
