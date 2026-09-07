/**
 * executionService.js
 * Manages logging code execution details into MongoDB history asynchronously.
 */

import ExecutionHistory from '../models/ExecutionHistory.js';
import mongoose from 'mongoose';

/**
 * Log a code execution to MongoDB
 * Runs in the background (non-blocking) and catches its own errors.
 * 
 * @param {Object} data
 * @param {string} data.language - 'java' or 'python'
 * @param {string} data.code - Source code executed
 * @param {string} data.output - Captured terminal output
 * @param {number} data.executionTime - Execution time in milliseconds
 * @param {string} data.status - 'completed', 'error', 'timeout', or 'stopped'
 * @param {number} [data.exitCode] - System exit code
 */
export function logExecution(data) {
  // If MongoDB is not connected, fail silently without throwing error
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  // Truncate code to avoid bloat in execution history database
  const truncatedCode = data.code ? data.code.substring(0, 5000) : '';
  const truncatedOutput = data.output ? data.output.substring(0, 10000) : '';

  const historyEntry = new ExecutionHistory({
    language: data.language,
    code: truncatedCode,
    output: truncatedOutput,
    executionTime: data.executionTime,
    status: data.status,
    exitCode: data.exitCode ?? null,
  });

  // Save asynchronously, catching any potential errors
  historyEntry.save()
    .then((doc) => {
      // Successfully saved
    })
    .catch((err) => {
      console.warn('[ExecutionService] Failed to log execution history to MongoDB:', err.message);
    });
}
