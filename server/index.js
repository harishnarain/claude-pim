/**
 * PIM Express server entry point.
 * Starts the HTTP server on PORT (default 3001).
 * @module server/index
 */

import express from 'express';
import { getDb, runMigrations } from './db.js';
import logger from './logger.js';
import contactsRouter from './routes/contacts.js';
import notesRouter from './routes/notes.js';
import tagsRouter from './routes/tags.js';
import tasksRouter from './routes/tasks.js';

const PORT = process.env.PORT ?? 3001;

const app = express();

app.use(express.json());

// Contacts REST API routes.
app.use('/api/contacts', contactsRouter);

// Notes REST API routes.
app.use('/api/notes', notesRouter);

// Tags REST API routes.
app.use('/api/tags', tagsRouter);

// Tasks REST API routes.
app.use('/api/tasks', tasksRouter);

// Health-check endpoint — verifies server and DB are reachable.
app.get('/api/health', (_req, res) => {
  // Touch the DB to confirm the connection is open.
  const db = getDb();
  const row = db.prepare('SELECT 1 AS ok').get();
  res.json({ data: { status: 'ok', db: row.ok === 1 }, error: null, meta: {} });
});

/**
 * Start listening on the configured port.
 * @returns {import('http').Server} The running HTTP server instance.
 */
function start() {
  // Initialise DB connection eagerly on startup and apply pending migrations.
  const db = getDb();
  runMigrations(db);

  const server = app.listen(PORT, () => {
    logger.info(`PIM server listening on port ${PORT}`);
  });

  return server;
}

start();

export { app };
