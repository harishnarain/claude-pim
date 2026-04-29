# PIM Agent Skills

## Skill: Add a New Data Entity

When adding a new entity (contacts, notes, tasks, etc.):

1. Write a migration in `db/migrations/` following existing naming convention
2. Create a model in `server/models/{entity}.js` with: create, findAll,
   findById, update, delete
3. Create routes in `server/routes/{entity}.js` following REST conventions
4. Register routes in `server/index.js`
5. Create a Zustand store in `client/src/store/{entity}Store.js`
6. Create an API client in `client/src/api/{entity}.js`
7. Write unit tests in `tests/unit/{entity}.test.js`
8. Write E2E test in `tests/e2e/{entity}.spec.js`

## Skill: Add a New React Page

1. Create `client/src/pages/{PageName}.jsx`
2. Add route in `client/src/App.jsx`
3. Add nav link in `client/src/components/Sidebar.jsx`
4. Connect to Zustand store with `useStore`
5. Write component test

## Skill: Add an API Endpoint

Always follow the response envelope:
```js
res.json({ data: result, error: null, meta: { count } })
```

Always validate input before touching the database.
Always use parameterised queries.
