/**
 * useTerminal.js
 * Custom hook managing the integrated terminal state:
 * - Output lines buffer
 * - Input handling (echoing, stdin send)
 * - Socket.IO event listeners
 * - Execution status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import socket, { SOCKET_EVENTS } from '../services/socket.js';
import { EXEC_STATUS } from '../hooks/useCodeExecution.js';

/**
 * @param {Object} execution - useCodeExecution hook return values
 */
export function useTerminal(execution) {
  // Array of output line objects: { type, text }
  const [lines, setLines] = useState([
    { type: 'system', text: 'Welcome to CodeForge Terminal' },
    { type: 'system', text: 'Press ▶ Run or Ctrl+Enter to execute your code.' },
    { type: 'system', text: '─────────────────────────────────────' },
  ]);

  // Current input line being typed by the user
  const [inputValue, setInputValue] = useState('');

  // Whether the terminal is accepting stdin input (process is waiting)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);

  // Track whether we should auto-scroll
  const outputRef = useRef(null);
  const autoScrollRef = useRef(true);

  /** Append a line to the output buffer */
  const appendLine = useCallback((type, text) => {
    // Split on newlines to handle multi-line chunks from process stdout
    const parts = text.split(/\r?\n/);
    setLines((prev) => {
      const newLines = [...prev];
      parts.forEach((part, i) => {
        if (i === 0 && newLines.length > 0 && newLines[newLines.length - 1].partial) {
          // Append to the last partial line
          newLines[newLines.length - 1] = {
            type,
            text: newLines[newLines.length - 1].text + part,
            partial: i < parts.length - 1,
          };
        } else {
          newLines.push({ type, text: part, partial: i < parts.length - 1 });
        }
      });
      // Keep a max of 2000 lines to prevent memory bloat
      return newLines.slice(-2000);
    });
  }, []);

  /** Clear all terminal output */
  const clearTerminal = useCallback(() => {
    setLines([
      { type: 'system', text: 'Terminal cleared.' },
      { type: 'system', text: '─────────────────────────────────────' },
    ]);
    setInputValue('');
    setIsAwaitingInput(false);
  }, []);

  // Register Socket.IO event listeners
  useEffect(() => {
    const onOutput = ({ type, data }) => {
      if (type === 'stdin-echo') {
        // This is the user's own input echoed back - already shown in input line
        return;
      }
      appendLine(type, data);

      // Heuristic: if program emitted output and we have a running process,
      // it may be waiting for more input (e.g. Scanner in a loop)
      if (execution.status === EXEC_STATUS.RUNNING) {
        setIsAwaitingInput(true);
      }
    };

    const onExecutionStart = () => {
      setIsAwaitingInput(true);
      appendLine('system', '');
      appendLine('system', '▶ Execution started...');
    };

    const onExecutionEnd = ({ exitCode, status, executionTime }) => {
      setIsAwaitingInput(false);
      setInputValue('');
      const ms = executionTime != null ? ` (${executionTime}ms)` : '';
      appendLine('system', '');
      if (status === 'completed') {
        appendLine('system', `✓ Process exited with code ${exitCode ?? 0}${ms}`);
      } else if (status === 'timeout') {
        appendLine('stderr', `⏱ Execution timed out${ms}`);
      } else if (status === 'stopped') {
        appendLine('system', `■ Process stopped by user${ms}`);
      } else {
        appendLine('stderr', `✗ Process exited with code ${exitCode ?? 1}${ms}`);
      }
      appendLine('system', '─────────────────────────────────────');
    };

    socket.on(SOCKET_EVENTS.OUTPUT, onOutput);
    socket.on(SOCKET_EVENTS.EXECUTION_START, onExecutionStart);
    socket.on(SOCKET_EVENTS.EXECUTION_END, onExecutionEnd);

    return () => {
      socket.off(SOCKET_EVENTS.OUTPUT, onOutput);
      socket.off(SOCKET_EVENTS.EXECUTION_START, onExecutionStart);
      socket.off(SOCKET_EVENTS.EXECUTION_END, onExecutionEnd);
    };
  }, [appendLine, execution.status]);

  /** Handle input submission (Enter key in terminal) */
  const handleInputSubmit = useCallback(() => {
    if (!isAwaitingInput || execution.status !== EXEC_STATUS.RUNNING) return;
    // Show the submitted line in the terminal
    appendLine('stdin-echo', `${inputValue}`);
    execution.sendInput(inputValue);
    setInputValue('');
  }, [inputValue, isAwaitingInput, execution, appendLine]);

  return {
    lines,
    inputValue,
    setInputValue,
    isAwaitingInput,
    clearTerminal,
    handleInputSubmit,
    outputRef,
    autoScrollRef,
  };
}
