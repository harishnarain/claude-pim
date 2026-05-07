/**
 * Express router for the /api/tags resource.
 * Exposes a single read-only endpoint to list all tags.
 * @module routes/tags
 */

import { Router } from 'express';
import * as Tag from '../models/tag.js';
import logger from '../logger.js';

const router = Router();

/**
 * GET /api/tags
 * Return every tag in the database sorted by name ascending.
 */
router.get('/', (_req, res) => {
  const tags = Tag.findAll();
  logger.info(`GET /api/tags — returned ${tags.length} record(s)`);
  res.status(200).json({ data: tags, error: null, meta: { count: tags.length } });
});

export default router;
