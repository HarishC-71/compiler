/**
 * Sidebar.jsx
 * VS Code-style file explorer sidebar with context menu support,
 * file tree rendering, and CRUD actions (new, rename, delete).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VscChevronDown,
  VscChevronRight,
  VscNewFile,
  VscRefresh,
  VscCollapseAll,
  VscFile,
  VscEdit,
  VscTrash,
  VscCloudDownload,
} from 'react-icons/vsc';

/** Get file icon based on language */
function FileIcon({ language }) {
  if (language === 'java') {
    return <span style={{ fontSize: '12px', color: '#f89820' }}>☕</span>;
  }
  if (language === 'python') {
    return <span style={{ fontSize: '12px', color: '#3572A5' }}>🐍</span>;
  }
  return <VscFile size={14} style={{ color: 'var(--color-vsc-icon)' }} />;
}

/**
 * @param {Object} props
 * @param {Array} props.files - All files in the virtual fs
 * @param {string} props.activeFileId - Currently active file id
 * @param {Function} props.onFileOpen - Callback to open/activate a file
 * @param {Function} props.onFileCreate - Callback to create a new file
 * @param {Function} props.onFileRename - Callback to rename a file
 * @param {Function} props.onFileDelete - Callback to delete a file
 * @param {Function} props.onFileDownload - Callback to download a file
 */
export default function Sidebar({
  files,
  activeFileId,
  onFileOpen,
  onFileCreate,
  onFileRename,
  onFileDelete,
  onFileDownload,
}) {
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null); // { x, y, fileId }
  const [newFilePrompt, setNewFilePrompt] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const renameInputRef = useRef(null);
  const newFileInputRef = useRef(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Focus new file input
  useEffect(() => {
    if (newFilePrompt && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [newFilePrompt]);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const startRename = useCallback((file) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setContextMenu(null);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onFileRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, onFileRename]);

  const handleRenameKey = (e) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleNewFileKey = (e) => {
    if (e.key === 'Enter' && newFileName.trim()) {
      // Determine language from extension
      const ext = newFileName.split('.').pop().toLowerCase();
      const lang = ext === 'java' ? 'java' : 'python';
      onFileCreate(lang, newFileName.trim());
      setNewFilePrompt(false);
      setNewFileName('');
    }
    if (e.key === 'Escape') {
      setNewFilePrompt(false);
      setNewFileName('');
    }
  };

  const handleContextMenu = (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  return (
    <div
      style={{
        width: '250px',
        background: 'var(--color-vsc-sidebar)',
        borderRight: '1px solid var(--color-vsc-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Sidebar header */}
      <div
        style={{
          padding: '0 12px',
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-vsc-text)',
          }}
        >
          Explorer
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => setNewFilePrompt(true)}
            title="New File"
            style={iconBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-vsc-text-bright)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-vsc-icon)')}
          >
            <VscNewFile size={16} />
          </button>
        </div>
      </div>

      {/* EXPLORER section */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        {/* Section header */}
        <div
          onClick={() => setIsExplorerOpen((v) => !v)}
          style={{
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-vsc-text)',
          }}
        >
          {isExplorerOpen ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
          <span>CODEFORGE</span>
        </div>

        {isExplorerOpen && (
          <>
            {/* New file inline input */}
            {newFilePrompt && (
              <div style={{ padding: '2px 8px 2px 24px' }}>
                <input
                  ref={newFileInputRef}
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={handleNewFileKey}
                  onBlur={() => { setNewFilePrompt(false); setNewFileName(''); }}
                  placeholder="filename.py"
                  style={{
                    width: '100%',
                    background: 'var(--color-vsc-input-bg)',
                    border: '1px solid var(--color-vsc-statusbar)',
                    color: 'var(--color-vsc-text)',
                    padding: '2px 6px',
                    fontSize: '13px',
                    outline: 'none',
                    borderRadius: '2px',
                  }}
                />
              </div>
            )}

            {/* File list */}
            {files.map((file) => (
              <div key={file.id}>
                {renamingId === file.id ? (
                  <div style={{ padding: '1px 8px 1px 22px' }}>
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKey}
                      onBlur={commitRename}
                      style={{
                        width: '100%',
                        background: 'var(--color-vsc-input-bg)',
                        border: '1px solid var(--color-vsc-statusbar)',
                        color: 'var(--color-vsc-text)',
                        padding: '1px 4px',
                        fontSize: '13px',
                        outline: 'none',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => onFileOpen(file.id)}
                    onContextMenu={(e) => handleContextMenu(e, file.id)}
                    style={{
                      padding: '2px 8px 2px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      background: activeFileId === file.id
                        ? 'var(--color-vsc-active)'
                        : 'transparent',
                      borderLeft: activeFileId === file.id
                        ? '1px solid var(--color-vsc-statusbar)'
                        : '1px solid transparent',
                      fontSize: '13px',
                      color: 'var(--color-vsc-text)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (activeFileId !== file.id)
                        e.currentTarget.style.background = 'var(--color-vsc-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeFileId !== file.id)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FileIcon language={file.language} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    {file.isModified && (
                      <span
                        title="Unsaved changes"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--color-vsc-text-dim)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              const f = files.find((f) => f.id === contextMenu.fileId);
              if (f) startRename(f);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <VscEdit size={13} /> Rename
            </span>
            <span style={{ color: 'var(--color-vsc-text-dim)', fontSize: '11px' }}>F2</span>
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onFileDownload(contextMenu.fileId);
              setContextMenu(null);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <VscCloudDownload size={13} /> Download
            </span>
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            style={{ color: 'var(--color-vsc-error)' }}
            onClick={() => {
              onFileDelete(contextMenu.fileId);
              setContextMenu(null);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <VscTrash size={13} /> Delete
            </span>
            <span style={{ color: 'var(--color-vsc-text-dim)', fontSize: '11px' }}>Del</span>
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-vsc-icon)',
  cursor: 'pointer',
  padding: '3px',
  borderRadius: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
