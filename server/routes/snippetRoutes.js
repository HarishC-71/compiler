/**
 * snippetRoutes.js
 * Routing for Saved Snippets REST endpoints.
 */

import { Router } from 'express';
import {
  saveSnippet,
  getSnippets,
  getSnippetById,
  updateSnippet,
  deleteSnippet,
} from '../controllers/snippetController.js';

const router = Router();

router.route('/')
  .post(saveSnippet)
  .get(getSnippets);

router.route('/:id')
  .get(getSnippetById)
  .put(updateSnippet)
  .delete(deleteSnippet);

export default router;
