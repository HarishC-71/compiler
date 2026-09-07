/**
 * executor.js
 * Main router for code execution requests.
 * Orchestrates job creation, decides whether to run locally or in Docker,
 * triggers execution, runs timeout watchdogs, and logs results.
 */

import { executeJava } from './java/javaExecutor.js';
import { executePython } from './python/pythonExecutor.js';
import { executeInDocker } from './docker/dockerExecutor.js';
import { logExecution } from '../services/executionService.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TIMEOUT = parseInt(process.env.EXECUTION_TIMEOUT || '30000', 10);
const EXECUTION_MODE = process.env.EXECUTION_MODE || 'local'; // 'local' or 'docker'

/**
 * Route and execute the code snippet
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} language - 'java' or 'python'
 * @param {string} code - Code string to execute
 * @param {Function} onProcessStarted - Callback invoked with child process reference
 * @param {Function} onFinished - Callback invoked when execution finishes
 */
export function executeCode(socket, language, code, onProcessStarted, onFinished) {
  const jobId = uuidv4();
  const tempDir = path.join(os.tmpdir(), 'online-compiler', jobId);

  // Ensure temp directory exists
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `System Error: Failed to create temp directory: ${err.message}\r\n` });
    onFinished(null);
    return;
  }

  const startTime = Date.now();
  let stdoutDataBuffer = '';

  // Intercept socket emits to capture stdout/stderr for logging database entry
  const originalEmit = socket.emit;
  const socketProxy = {
    ...socket,
    emit: (event, payload) => {
      if (event === 'output' && (payload.type === 'stdout' || payload.type === 'stderr')) {
        stdoutDataBuffer += payload.data;
      }
      return originalEmit.call(socket, event, payload);
    }
  };

  /**
   * Handle cleanup and completion logging
   * @param {number|null} exitCode 
   * @param {string} status - 'completed', 'error', 'timeout', or 'stopped'
   * @param {string} fullOutput - Collected runtime buffer
   */
  const handleProcessEnd = (exitCode, status, fullOutput) => {
    const elapsed = Date.now() - startTime;
    
    // Clean up temporary workspace directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[Executor] Failed to clean up temp directory ${tempDir}:`, err.message);
    }

    // Call callback to alert parent handler to remove from active list
    onFinished({ exitCode, status, executionTime: elapsed });

    // Stream final execution summary details to client
    socket.emit('execution-end', {
      exitCode: exitCode ?? (status === 'timeout' ? 124 : 1),
      status,
      executionTime: elapsed,
    });

    // Log the snippet run asynchronously into MongoDB (graceful if db is down)
    logExecution({
      language,
      code,
      output: stdoutDataBuffer,
      executionTime: elapsed,
      status,
      exitCode,
    });
  };

  // Dispatch execution based on mode
  if (EXECUTION_MODE === 'docker') {
    executeInDocker(
      socketProxy,
      language,
      code,
      jobId,
      tempDir,
      TIMEOUT,
      onProcessStarted,
      handleProcessEnd
    );
  } else {
    // Local execution fallback
    if (language === 'java') {
      executeJava(
        socketProxy,
        code,
        tempDir,
        TIMEOUT,
        onProcessStarted,
        handleProcessEnd
      );
    } else if (language === 'python') {
      executePython(
        socketProxy,
        code,
        tempDir,
        TIMEOUT,
        onProcessStarted,
        handleProcessEnd
      );
    } else {
      socket.emit('output', { type: 'stderr', data: `Error: Language '${language}' is not supported.\r\n` });
      handleProcessEnd(1, 'error', `Unsupported language: ${language}`);
    }
  }
}
