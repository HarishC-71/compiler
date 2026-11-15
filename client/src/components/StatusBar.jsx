/**
 * StatusBar.jsx
 * Bottom VS Code status bar showing:
 * - Language, line/column, encoding
 * - Execution status (Running / Completed / Error / Idle)
 * - Execution time
 * - Socket.IO connection status
 */

import { VscCircleFilled, VscCheck, VscError, VscWarning } from 'react-icons/vsc';
import { EXEC_STATUS } from '../hooks/useCodeExecution.js';
import { getLanguage } from '../editor/editorConfig.js';

/**
 * @param {Object} props
 * @param {string} props.language - Current language id
 * @param {{ line: number, column: number }} props.cursor - Cursor position
 * @param {string} props.execStatus - Current execution status
 * @param {number|null} props.executionTime - Last execution time in ms
 * @param {boolean} props.isConnected - Socket.IO connected?
 * @param {string} [props.activeFileName] - Name of the active file
 */
export default function StatusBar({
  language,
  cursor,
  execStatus,
  executionTime,
  isConnected,
  activeFileName,
  autosaveState,
  lastSavedAt,
}) {
  const langInfo = getLanguage(language);

  const getStatusContent = () => {
    switch (execStatus) {
      case EXEC_STATUS.RUNNING:
        return {
          icon: <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', width: 10, height: 10, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />,
          text: 'Running...',
          color: '#4ec9b0',
        };
      case EXEC_STATUS.COMPLETED:
        return {
          icon: <VscCheck size={13} />,
          text: executionTime != null ? `Done  ${executionTime}ms` : 'Done',
          color: '#89d185',
        };
      case EXEC_STATUS.ERROR:
        return {
          icon: <VscError size={13} />,
          text: 'Error',
          color: '#f48771',
        };
      case EXEC_STATUS.TIMEOUT:
        return {
          icon: <VscWarning size={13} />,
          text: 'Timed Out',
          color: '#cca700',
        };
      case EXEC_STATUS.STOPPED:
        return {
          icon: <VscCircleFilled size={11} />,
          text: 'Stopped',
          color: '#858585',
        };
      default:
        return null;
    }
  };

  const statusContent = getStatusContent();

  return (
    <div
      style={{
        height: '22px',
        background: 'var(--color-vsc-statusbar)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '12px',
        color: 'white',
        gap: '2px',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        {/* Connection */}
        <StatusItem
          title={isConnected ? 'Server Connected' : 'Server Disconnected'}
          style={{ color: isConnected ? 'white' : '#ffcdd2' }}
        >
          <VscCircleFilled size={10} style={{ color: isConnected ? '#89d185' : '#f48771' }} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </StatusItem>

        <Divider />

        {/* Execution Status */}
        {statusContent && (
          <>
            <StatusItem style={{ color: statusContent.color, gap: '4px' }}>
              {statusContent.icon}
              {statusContent.text}
            </StatusItem>
            <Divider />
          </>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        {/* Autosave Indicator */}
        {autosaveState !== 'idle' && (
          <>
            <StatusItem title={lastSavedAt ? `Last autosaved: ${lastSavedAt.toLocaleTimeString()}` : ''}>
              {autosaveState === 'saving' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cca700' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', width: 10, height: 10, border: '2px solid #cca700', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Saving...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#89d185' }}>
                  <VscCheck size={13} />
                  Autosaved
                </span>
              )}
            </StatusItem>
            <Divider />
          </>
        )}

        {/* Cursor position */}
        {cursor && (
          <>
            <StatusItem title="Line and Column">
              Ln {cursor.line}, Col {cursor.column}
            </StatusItem>
            <Divider />
          </>
        )}

        {/* Encoding */}
        <StatusItem>UTF-8</StatusItem>
        <Divider />

        {/* Language */}
        <StatusItem title={`Language: ${langInfo.label}`}>
          {langInfo.icon} {langInfo.label}
        </StatusItem>
      </div>
    </div>
  );
}

function StatusItem({ children, title, style }) {
  return (
    <div
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 8px',
        height: '22px',
        cursor: title ? 'pointer' : 'default',
        transition: 'background 0.1s',
        borderRadius: '0',
        ...style,
      }}
      onMouseEnter={(e) => title && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '14px',
        background: 'rgba(255,255,255,0.25)',
        flexShrink: 0,
      }}
    />
  );
}
