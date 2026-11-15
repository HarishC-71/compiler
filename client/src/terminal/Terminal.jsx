/**
 * Terminal.jsx
 * VS Code-style integrated terminal with unified input/output.
 * Supports real-time streaming output and interactive stdin.
 */

import { useEffect, useRef, useCallback } from 'react';
import { VscTerminal, VscClearAll, VscClose, VscChevronDown } from 'react-icons/vsc';
import { EXEC_STATUS } from '../hooks/useCodeExecution.js';
import { useTerminal } from './useTerminal.js';

/**
 * @param {Object} props
 * @param {Object} props.execution - useCodeExecution hook values
 * @param {number} props.height - Terminal panel height in px
 * @param {Function} props.onResizeStart - Mouse down handler for resize drag
 */
export default function Terminal({ execution, height, onResizeStart }) {
  const {
    lines,
    inputValue,
    setInputValue,
    isAwaitingInput,
    clearTerminal,
    handleInputSubmit,
  } = useTerminal(execution);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when execution starts
  useEffect(() => {
    if (execution.status === EXEC_STATUS.RUNNING && inputRef.current) {
      inputRef.current.focus();
    }
  }, [execution.status]);

  /** Handle keydown on the terminal input */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputSubmit();
    }
    // Ctrl+C — stop execution
    if (e.key === 'c' && e.ctrlKey) {
      execution.stopExecution();
    }
  }, [handleInputSubmit, execution]);

  /** Focus input when clicking terminal area */
  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /** Get CSS class for a terminal line type */
  const getLineClass = (type) => {
    switch (type) {
      case 'stderr': return 'text-red-400';
      case 'info': return 'text-cyan-400';
      case 'system': return 'text-green-400 opacity-80';
      case 'stdin-echo': return 'text-yellow-300';
      default: return 'text-gray-200';
    }
  };

  const isRunning = execution.status === EXEC_STATUS.RUNNING;

  return (
    <div
      className="flex flex-col"
      style={{
        height: `${height}px`,
        background: 'var(--color-vsc-terminal-bg)',
        borderTop: '1px solid var(--color-vsc-border)',
        minHeight: '120px',
      }}
    >
      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={onResizeStart}
        title="Drag to resize terminal"
      />

      {/* Terminal Tab Bar */}
      <div
        style={{
          background: 'var(--color-vsc-sidebar)',
          borderBottom: '1px solid var(--color-vsc-border)',
          display: 'flex',
          alignItems: 'center',
          height: '35px',
          paddingLeft: '8px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Terminal tab */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '100%',
            borderBottom: '1px solid var(--color-vsc-statusbar)',
            color: 'var(--color-vsc-text)',
            fontSize: '12px',
          }}
        >
          <VscTerminal size={14} />
          <span>Terminal</span>
          {/* Running indicator */}
          {isRunning && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#4ec9b0',
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Right actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '8px' }}>
          <button
            onClick={clearTerminal}
            title="Clear Terminal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-vsc-icon-dim)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-vsc-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <VscClearAll size={16} />
          </button>
          {isRunning && (
            <button
              onClick={execution.stopExecution}
              title="Stop Process (Ctrl+C)"
              style={{
                background: 'none',
                border: 'none',
                color: '#f44747',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-vsc-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <VscClose size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output + Input Area */}
      <div
        ref={scrollRef}
        onClick={handleTerminalClick}
        className="terminal-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '8px 12px',
          cursor: 'text',
        }}
      >
        {/* Render output lines */}
        {lines.map((line, idx) => (
          <div key={idx} className={`terminal-line ${getLineClass(line.type)}`}>
            {line.text || '\u00A0' /* non-breaking space for empty lines */}
          </div>
        ))}

        {/* Interactive Input Line */}
        {isRunning && (
          <div className="terminal-input-line" style={{ marginTop: '2px' }}>
            <span style={{ color: 'var(--color-vsc-terminal-green)', marginRight: '6px' }}>›</span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAwaitingInput ? 'Type input and press Enter...' : ''}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <span className="terminal-cursor" />
          </div>
        )}

        {/* Idle state prompt */}
        {!isRunning && (
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--color-vsc-terminal-green)' }}>$</span>
            <span style={{ color: 'var(--color-vsc-text-dim)', fontFamily: 'var(--font-vsc-mono)', fontSize: '13px' }}>
              {execution.status === EXEC_STATUS.IDLE
                ? 'Ready. Press ▶ or Ctrl+Enter to run.'
                : execution.status === EXEC_STATUS.COMPLETED
                ? 'Process finished successfully.'
                : execution.status === EXEC_STATUS.ERROR
                ? 'Process exited with errors.'
                : execution.status === EXEC_STATUS.STOPPED
                ? 'Process was stopped.'
                : 'Process timed out.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
