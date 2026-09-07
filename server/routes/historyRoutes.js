/**
 * historyRoutes.js
 * Routing for Code Execution History REST endpoints.
 */

import { Router } from 'express';
import { getHistory, clearHistory } from '../controllers/historyController.js';

const router = Router();

router.route('/')
  .get(getHistory)
  .delete(clearHistory);

export default router;
