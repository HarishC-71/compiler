/**
 * MenuBar.jsx
 * Top application menu bar with File, Edit, View, Run, Help menus.
 * VS Code-style dropdown menus with keyboard shortcut hints.
 */

import { useState, useRef, useEffect } from 'react';
import { VscCode } from 'react-icons/vsc';

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New File', shortcut: 'Ctrl+N', action: 'new-file' },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
      { separator: true },
      { label: 'Download File', shortcut: '', action: 'download' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
      { separator: true },
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'select-all' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: 'toggle-sidebar' },
      { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: 'toggle-terminal' },
      { separator: true },
      { label: 'Zoom In', shortcut: 'Ctrl+=', action: 'zoom-in' },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: 'zoom-out' },
    ],
  },
  {
    label: 'Run',
    items: [
      { label: 'Run Code', shortcut: 'Ctrl+Enter', action: 'run' },
      { label: 'Stop Execution', shortcut: 'Ctrl+C', action: 'stop' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Keyboard Shortcuts', shortcut: '', action: 'shortcuts' },
      { label: 'About CodeForge', shortcut: '', action: 'about' },
    ],
  },
];

/**
 * @param {Object} props
 * @param {Function} props.onAction - Callback for menu item actions
 */
export default function MenuBar({ onAction }) {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = (action) => {
    setOpenMenu(null);
    onAction?.(action);
  };

  return (
    <div
      ref={menuRef}
      style={{
        height: '35px',
        background: 'var(--color-vsc-menubar)',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-vsc-border)',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* App Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 12px',
          color: 'var(--color-vsc-statusbar)',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '0.02em',
          borderRight: '1px solid var(--color-vsc-border)',
          height: '100%',
        }}
      >
        <VscCode size={18} />
        <span>CodeForge</span>
      </div>

      {/* Menu Items */}
      {MENUS.map((menu) => (
        <div key={menu.label} style={{ position: 'relative', height: '100%' }}>
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => { if (openMenu) setOpenMenu(menu.label); }}
            style={{
              height: '100%',
              padding: '0 10px',
              background: openMenu === menu.label ? 'var(--color-vsc-active)' : 'none',
              border: 'none',
              color: 'var(--color-vsc-text)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnterCapture={(e) => {
              if (!openMenu) e.currentTarget.style.background = 'var(--color-vsc-hover)';
            }}
            onMouseLeaveCapture={(e) => {
              if (openMenu !== menu.label) e.currentTarget.style.background = 'none';
            }}
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {openMenu === menu.label && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                background: 'var(--color-vsc-menubar)',
                border: '1px solid var(--color-vsc-border)',
                borderRadius: '5px',
                minWidth: '220px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 100,
                padding: '4px 0',
                animation: 'fadeIn 0.1s ease-out',
              }}
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="context-menu-separator" />
                ) : (
                  <div
                    key={i}
                    className="context-menu-item"
                    onClick={() => handleItemClick(item.action)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ color: 'var(--color-vsc-text-dim)', fontSize: '11px' }}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
