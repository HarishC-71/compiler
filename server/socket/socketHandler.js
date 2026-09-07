/**
 * socketHandler.js
 * Manages all Socket.IO connections, code execution lifecycle,
 * interactive stdin, and process cleanup on disconnect.
 */

import { executeCode } from '../compiler/executor.js';

/**
 * Setup all Socket.IO event handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
export function setupSocketHandler(io) {
  // Map: socket.id -> active child process handle
  const activeProcesses = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    /**
     * Event: execute-code
     * Triggered when the client wants to run code.
     * Payload: { language: 'java'|'python', code: string }
     */
    socket.on('execute-code', ({ language, code }) => {
      // Prevent concurrent executions per socket
      if (activeProcesses.has(socket.id)) {
        socket.emit('output', {
          type: 'info',
          data: '\r\n[Already running a process. Click Stop first.]\r\n',
        });
        return;
      }

      if (!language || !code) {
        socket.emit('output', { type: 'stderr', data: 'Error: Language and code are required.\r\n' });
        socket.emit('execution-end', { exitCode: 1, status: 'error', executionTime: 0 });
        return;
      }

      // Notify client that execution has started
      socket.emit('execution-start', { language, timestamp: Date.now() });

      // Start code execution
      executeCode(
        socket,
        language,
        code,
        // onProcessStarted: store process handle for stdin/stop
        (childProcess) => {
          if (childProcess) {
            activeProcesses.set(socket.id, childProcess);
          }
        },
        // onFinished: clean up after process ends
        (result) => {
          activeProcesses.delete(socket.id);
        }
      );
    });

    /**
     * Event: send-input
     * User typed in the terminal while a program awaits stdin.
     * Payload: string (the line of input)
     */
    socket.on('send-input', (inputLine) => {
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed && child.stdin && !child.stdin.destroyed) {
        try {
          // Echo the typed input back to the terminal so user can see it
          socket.emit('output', { type: 'stdin-echo', data: inputLine + '\n' });
          child.stdin.write(inputLine + '\n');
        } catch (err) {
          console.warn(`[Socket] Failed to write stdin for ${socket.id}:`, err.message);
        }
      }
    });

    /**
     * Event: stop-execution
     * Client wants to stop the currently running process.
     */
    socket.on('stop-execution', () => {
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed) {
        try {
          child.kill('SIGTERM');
          // Force kill after brief grace period
          setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL');
          }, 500);
          socket.emit('output', { type: 'info', data: '\r\n[Process stopped by user]\r\n' });
        } catch (err) {
          console.warn(`[Socket] Failed to stop process for ${socket.id}:`, err.message);
        }
      }
      activeProcesses.delete(socket.id);
    });

    /**
     * Event: disconnect
     * Clean up any running process when client disconnects.
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed) {
        try {
          child.kill('SIGKILL');
        } catch (err) {
          // Process may already be dead
        }
      }
      activeProcesses.delete(socket.id);
    });
  });
}
