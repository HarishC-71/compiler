/**
 * historyController.js
 * Controller handling REST APIs for saved code execution history.
 */

import ExecutionHistory from '../models/ExecutionHistory.js';
import mongoose from 'mongoose';

// Helper to check DB connection
const checkDbConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ 
      error: 'Database service is currently unavailable. history storage features are disabled.' 
    });
    return false;
  }
  return true;
};

/**
 * Get recent execution history
 * GET /api/history
 */
export const getHistory = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const history = await ExecutionHistory.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(history);
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all execution history records
 * DELETE /api/history
 */
export const clearHistory = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    await ExecutionHistory.deleteMany({});
    res.json({ message: 'Execution history cleared successfully' });
  } catch (error) {
    next(error);
  }
};
