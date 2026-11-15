/**
 * TabBar.jsx
 * VS Code-style editor tab bar with:
 * - Open file tabs with modified indicator (dot)
 * - Active tab highlighting with bottom border
 * - Close button per tab
 * - Scroll overflow for many tabs
 */

import { VscClose } from 'react-icons/vsc';

function FileIcon({ language, size = 13 }) {
  if (language === 'java') return <span style={{ fontSize: size }}>☕</span>;
  if (language === 'python') return <span style={{ fontSize: size }}>🐍</span>;
  return null;
}

/**
 * @param {Object} props
 * @param {Array} props.tabs - Array of file objects currently open
 * @param {string} props.activeTabId - Id of the active tab
 * @param {Function} props.onTabClick - Switch to a tab
 * @param {Function} props.onTabClose - Close a tab
 */
export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose }) {
  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        height: '35px',
        background: 'var(--color-vsc-tab-inactive)',
        display: 'flex',
        alignItems: 'stretch',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        borderBottom: '1px solid var(--color-vsc-border)',
      }}
      // Hide scrollbar visually
      className="hide-scrollbar"
    >
      {tabs.map((file) => {
        const isActive = file.id === activeTabId;
        return (
          <div
            key={file.id}
            onClick={() => onTabClick(file.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              minWidth: '120px',
              maxWidth: '200px',
              cursor: 'pointer',
              background: isActive
                ? 'var(--color-vsc-tab-active)'
                : 'var(--color-vsc-tab-inactive)',
              borderRight: '1px solid var(--color-vsc-tab-border)',
              borderTop: isActive
                ? '1px solid var(--color-vsc-statusbar)'
                : '1px solid transparent',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.background = 'var(--color-vsc-hover)';
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.background = 'var(--color-vsc-tab-inactive)';
            }}
          >
            <FileIcon language={file.language} />

            {/* File name */}
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '13px',
                color: isActive
                  ? 'var(--color-vsc-text-bright)'
                  : 'var(--color-vsc-text-dim)',
              }}
            >
              {file.name}
            </span>

            {/* Modified indicator OR close button */}
            <div style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
              {/* Dot shows when modified and not hovered */}
              {file.isModified && (
                <span
                  className="modified-dot"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-vsc-text-dim)',
                    }}
                  />
                </span>
              )}

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
                title="Close"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-vsc-icon-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  opacity: file.isModified ? 0 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  // Hide the dot
                  const dot = e.currentTarget.parentElement.querySelector('.modified-dot');
                  if (dot) dot.style.opacity = '0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = file.isModified ? '0' : '1';
                  e.currentTarget.style.background = 'none';
                  const dot = e.currentTarget.parentElement.querySelector('.modified-dot');
                  if (dot) dot.style.opacity = '1';
                }}
              >
                <VscClose size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
