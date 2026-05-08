/**
 * Express router for the /api/task-tags resource.
 * Exposes a single read-only endpoint to list all task tags.
 * @module routes/task-tags
 */

import { Router } from 'express';
import * as TaskTag from '../models/task-tag.js';
import logger from '../logger.js';

const router = Router();

/**
 * GET /api/task-tags
 * Return every task tag in the task_tags_vocab table sorted by name ascending.
 */
router.get('/', (_req, res) => {
  const tags = TaskTag.findAll();
  logger.info(`GET /api/task-tags — returned ${tags.length} record(s)`);
  res.status(200).json({ data: tags, error: null, meta: { count: tags.length } });
});

export default router;
