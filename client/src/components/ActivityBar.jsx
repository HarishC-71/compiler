/**
 * ActivityBar.jsx
 * The leftmost icon strip — VS Code's activity bar.
 * Shows Explorer, Snippets/History icons with active state indicators.
 */

import {
  VscFiles,
  VscSearch,
  VscHistory,
  VscGithub,
} from 'react-icons/vsc';

const ACTIVITY_ICONS = [
  { id: 'explorer', icon: VscFiles, title: 'Explorer (Ctrl+Shift+E)' },
  { id: 'history', icon: VscHistory, title: 'Execution History' },
];

/**
 * @param {Object} props
 * @param {string} props.activePanel - Currently active sidebar panel id
 * @param {Function} props.onPanelChange - Callback to switch sidebar panel
 */
export default function ActivityBar({ activePanel, onPanelChange }) {
  return (
    <div
      style={{
        width: '48px',
        background: 'var(--color-vsc-activitybar)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '4px',
        borderRight: '1px solid var(--color-vsc-border)',
        flexShrink: 0,
      }}
    >
      {ACTIVITY_ICONS.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          title={title}
          onClick={() => onPanelChange(activePanel === id ? null : id)}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            color: activePanel === id
              ? 'var(--color-vsc-text-bright)'
              : 'var(--color-vsc-icon-dim)',
            transition: 'color 0.1s',
          }}
          onMouseEnter={(e) => {
            if (activePanel !== id)
              e.currentTarget.style.color = 'var(--color-vsc-icon)';
          }}
          onMouseLeave={(e) => {
            if (activePanel !== id)
              e.currentTarget.style.color = 'var(--color-vsc-icon-dim)';
          }}
        >
          {/* Active indicator bar */}
          {activePanel === id && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: 'var(--color-vsc-text-bright)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          )}
          <Icon size={24} />
        </button>
      ))}

      {/* Bottom: GitHub link */}
      <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-vsc-icon-dim)',
            textDecoration: 'none',
            transition: 'color 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-vsc-icon)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-vsc-icon-dim)')}
        >
          <VscGithub size={22} />
        </a>
      </div>
    </div>
  );
}
