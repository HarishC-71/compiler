/**
 * useCodeExecution Hook
 *
 * Manages code execution via Socket.IO.
 * Handles sending code to server, streaming output,
 * interactive stdin, and execution lifecycle.
 *
 * FIX: Socket listeners for execution-start and execution-end are now
 * self-registered inside a useEffect so the status automatically
 * transitions (RUNNING → COMPLETED / ERROR / TIMEOUT / STOPPED)
 * without any external wiring required from App.jsx.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import socket, { SOCKET_EVENTS } from '../services/socket.js';

/** All possible execution states */
export const EXEC_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  STOPPED: 'stopped',
  TIMEOUT: 'timeout',
};

export function useCodeExecution() {
  const [status, setStatus] = useState(EXEC_STATUS.IDLE);
  const [executionTime, setExecutionTime] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const startTimeRef = useRef(null);

  // ── Connection tracking ──────────────────────────
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── Execution lifecycle auto-listeners ───────────
  // These listeners are always registered so the execution status
  // transitions automatically when the server emits execution-end.
  useEffect(() => {
    const onExecutionEnd = (data) => {
      const elapsed = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : null;
      setExecutionTime(elapsed);
      startTimeRef.current = null;

      if (data.status === 'timeout') {
        setStatus(EXEC_STATUS.TIMEOUT);
      } else if (data.status === 'stopped') {
        setStatus(EXEC_STATUS.STOPPED);
      } else if (data.exitCode !== 0 && data.exitCode !== null) {
        setStatus(EXEC_STATUS.ERROR);
      } else {
        setStatus(EXEC_STATUS.COMPLETED);
      }
    };

    socket.on(SOCKET_EVENTS.EXECUTION_END, onExecutionEnd);
    return () => {
      socket.off(SOCKET_EVENTS.EXECUTION_END, onExecutionEnd);
    };
  }, []);

  // ── Actions ──────────────────────────────────────

  /** Start code execution */
  const executeCode = useCallback(
    (language, code) => {
      if (status === EXEC_STATUS.RUNNING) {
        console.warn('[Execution] Already running');
        return;
      }
      if (!isConnected) {
        console.error('[Execution] Socket not connected');
        return;
      }
      setStatus(EXEC_STATUS.RUNNING);
      setExecutionTime(null);
      startTimeRef.current = Date.now();
      socket.emit(SOCKET_EVENTS.EXECUTE_CODE, { language, code });
    },
    [status, isConnected]
  );

  /** Send stdin to the running process */
  const sendInput = useCallback(
    (input) => {
      if (status !== EXEC_STATUS.RUNNING) return;
      socket.emit(SOCKET_EVENTS.SEND_INPUT, input);
    },
    [status]
  );

  /** Kill the running process */
  const stopExecution = useCallback(() => {
    if (status !== EXEC_STATUS.RUNNING) return;
    socket.emit(SOCKET_EVENTS.STOP_EXECUTION);
    // Status transitions to STOPPED via onExecutionEnd when server confirms
  }, [status]);

  /** Reset to idle (e.g. before a fresh run) */
  const resetStatus = useCallback(() => {
    setStatus(EXEC_STATUS.IDLE);
    setExecutionTime(null);
    startTimeRef.current = null;
  }, []);

  return {
    status,
    executionTime,
    isConnected,
    executeCode,
    sendInput,
    stopExecution,
    resetStatus,
  };
}
