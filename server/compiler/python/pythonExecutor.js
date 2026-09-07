/**
 * pythonExecutor.js
 * Handles execution of Python code locally.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Execute Python code
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} code - The Python code to execute
 * @param {string} tempDir - Dedicated job temp directory
 * @param {number} timeout - Maximum runtime in ms
 * @param {Function} onProcessStarted - Callback passed the spawned process handle
 * @param {Function} onProcessEnd - Callback triggered when execution completes
 */
export function executePython(socket, code, tempDir, timeout, onProcessStarted, onProcessEnd) {
  const fileName = 'main.py';
  const filePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(filePath, code);
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `System Error: Failed to write Python file: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `System Error: ${err.message}`);
    return;
  }

  // Determine Python binary based on operating system
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  socket.emit('output', { type: 'info', data: `Launching Python script...\r\n\r\n` });

  let child;
  let timeoutTimer;

  try {
    // -u flag is critical for unbuffered binary stdout/stderr
    child = spawn(pythonCmd, ['-u', fileName], { cwd: tempDir });
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `Execution failed to start: ${err.message}\r\nMake sure Python is installed and available in server PATH.\r\n` });
    onProcessEnd(1, 'error', `Failed to start Python: ${err.message}`);
    return;
  }

  // Pass execution handle back for interaction
  onProcessStarted(child);

  // Set timeout timer
  timeoutTimer = setTimeout(() => {
    if (child && !child.killed) {
      socket.emit('output', { type: 'stderr', data: `\r\nExecution Timed Out (Limit: ${timeout / 1000}s)\r\n` });
      child.kill('SIGKILL');
      onProcessEnd(null, 'timeout', 'Execution timed out');
    }
  }, timeout);

  let runtimeOutput = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    runtimeOutput += text;
    socket.emit('output', { type: 'stdout', data: text });
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    runtimeOutput += text;
    // Replace raw temp paths in stack traces
    const cleanText = text.replace(new RegExp(tempDir.replace(/\\/g, '\\\\'), 'g'), '');
    socket.emit('output', { type: 'stderr', data: cleanText });
  });

  child.on('error', (err) => {
    clearTimeout(timeoutTimer);
    socket.emit('output', { type: 'stderr', data: `Runtime error: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `Runtime error: ${err.message}`);
  });

  child.on('close', (exitCode, signal) => {
    clearTimeout(timeoutTimer);
    const isStopped = signal === 'SIGKILL' || signal === 'SIGTERM';
    const status = isStopped
      ? (runtimeOutput.includes('Timed Out') ? 'timeout' : 'stopped')
      : (exitCode === 0 ? 'completed' : 'error');

    onProcessEnd(exitCode, status, runtimeOutput);
  });
}
