/**
 * Toolbar.jsx
 * Editor action toolbar with language selector, Run/Stop buttons, and file actions.
 * Sits between the tab bar and the Monaco Editor.
 */

import { VscPlay, VscDebugStop, VscSave, VscCloudDownload } from 'react-icons/vsc';
import { LANGUAGES } from '../editor/editorConfig.js';
import { EXEC_STATUS } from '../hooks/useCodeExecution.js';

/**
 * @param {Object} props
 * @param {string} props.language - Active language id
 * @param {Function} props.onLanguageChange - Callback for language switch
 * @param {string} props.execStatus - Current execution status
 * @param {Function} props.onRun - Run code callback
 * @param {Function} props.onStop - Stop execution callback
 * @param {Function} props.onSave - Save file callback
 * @param {Function} props.onDownload - Download file callback
 * @param {boolean} props.isConnected - Socket.IO connection status
 */
export default function Toolbar({
  language,
  onLanguageChange,
  execStatus,
  onRun,
  onStop,
  onSave,
  onDownload,
  isConnected,
}) {
  const isRunning = execStatus === EXEC_STATUS.RUNNING;

  return (
    <div
      style={{
        height: '40px',
        background: 'var(--color-vsc-sidebar)',
        borderBottom: '1px solid var(--color-vsc-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 12px',
        flexShrink: 0,
      }}
    >
      {/* Language Selector */}
      <select
        id="language-selector"
        className="vsc-select"
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        style={{ minWidth: '110px' }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.icon} {lang.label}
          </option>
        ))}
      </select>

      <div style={{ flex: 1 }} />

      {/* Connection indicator */}
      <div
        title={isConnected ? 'Connected to server' : 'Server disconnected'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          color: isConnected ? 'var(--color-vsc-success)' : 'var(--color-vsc-error)',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: isConnected ? 'var(--color-vsc-success)' : 'var(--color-vsc-error)',
            animation: isConnected ? 'none' : 'pulse 1.5s infinite',
          }}
        />
        <span style={{ color: 'var(--color-vsc-text-dim)' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--color-vsc-border)', margin: '0 4px' }} />

      {/* Save button */}
      <button
        onClick={onSave}
        title="Save (Ctrl+S)"
        style={toolbarBtnStyle}
        onMouseEnter={(e) => applyHover(e, true)}
        onMouseLeave={(e) => applyHover(e, false)}
      >
        <VscSave size={15} />
        <span style={{ fontSize: '12px' }}>Save</span>
      </button>

      {/* Download button */}
      <button
        onClick={onDownload}
        title="Download File"
        style={toolbarBtnStyle}
        onMouseEnter={(e) => applyHover(e, true)}
        onMouseLeave={(e) => applyHover(e, false)}
      >
        <VscCloudDownload size={15} />
      </button>

      <div style={{ width: '1px', height: '20px', background: 'var(--color-vsc-border)', margin: '0 4px' }} />

      {/* Stop button */}
      {isRunning && (
        <button
          onClick={onStop}
          title="Stop Execution (Ctrl+C)"
          style={{
            ...toolbarBtnStyle,
            color: '#f44747',
            border: '1px solid rgba(244,71,71,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(244,71,71,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          <VscDebugStop size={15} />
          <span style={{ fontSize: '12px' }}>Stop</span>
        </button>
      )}

      {/* Run button */}
      <button
        id="run-button"
        onClick={isRunning ? undefined : onRun}
        disabled={isRunning || !isConnected}
        title={isRunning ? 'Running...' : 'Run Code (Ctrl+Enter)'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 12px',
          background: isRunning
            ? 'rgba(78,201,176,0.15)'
            : 'var(--color-vsc-statusbar)',
          border: 'none',
          borderRadius: '4px',
          color: isRunning ? '#4ec9b0' : 'white',
          cursor: isRunning || !isConnected ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          opacity: !isConnected ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isRunning && isConnected)
            e.currentTarget.style.background = '#1a8ccc';
        }}
        onMouseLeave={(e) => {
          if (!isRunning)
            e.currentTarget.style.background = isRunning ? 'rgba(78,201,176,0.15)' : 'var(--color-vsc-statusbar)';
        }}
      >
        {isRunning ? (
          <>
            <span
              style={{
                width: '10px',
                height: '10px',
                border: '2px solid #4ec9b0',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
            Running...
          </>
        ) : (
          <>
            <VscPlay size={15} />
            Run
          </>
        )}
      </button>
    </div>
  );
}

const toolbarBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: 'none',
  border: 'none',
  borderRadius: '4px',
  color: 'var(--color-vsc-icon)',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background 0.1s',
};

const applyHover = (e, on) => {
  e.currentTarget.style.background = on ? 'var(--color-vsc-hover)' : 'none';
  e.currentTarget.style.color = on ? 'var(--color-vsc-text-bright)' : 'var(--color-vsc-icon)';
};
