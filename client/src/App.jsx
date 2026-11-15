/**
 * App.jsx
 * Root application component.
 * Implements the full VS Code-like layout grid:
 *   [MenuBar]
 *   [ActivityBar | Sidebar | Editor + Terminal]
 *   [StatusBar]
 * 
 * Orchestrates:
 * - File management (useFileManager)
 * - Code execution (useCodeExecution)
 * - Resizable terminal panel
 * - All keyboard shortcuts
 * - Menu bar action dispatch
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import MenuBar from './components/MenuBar.jsx';
import ActivityBar from './components/ActivityBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import TabBar from './components/TabBar.jsx';
import Toolbar from './components/Toolbar.jsx';
import StatusBar from './components/StatusBar.jsx';
import CodeEditor from './editor/CodeEditor.jsx';
import Terminal from './terminal/Terminal.jsx';
import { useFileManager } from './hooks/useFileManager.js';
import { useCodeExecution, EXEC_STATUS } from './hooks/useCodeExecution.js';
import { LANG_TO_EXTENSION } from './hooks/useFileManager.js';

const MIN_TERMINAL_HEIGHT = 120;
const MAX_TERMINAL_HEIGHT_RATIO = 0.7;
const DEFAULT_TERMINAL_HEIGHT = 250;

export default function App() {
  // ── File Management ─────────────────────────────
  const fileManager = useFileManager();
  const {
    files,
    activeFile,
    activeFileId,
    tabFiles,
    createFile,
    updateFileCode,
    renameFile,
    deleteFile,
    openFile,
    closeTab,
    markSaved,
    downloadFile,
    autosaveState,
    lastSavedAt,
  } = fileManager;

  // ── Code Execution ───────────────────────────────
  const execution = useCodeExecution();

  // ── UI State ─────────────────────────────────────
  const [activePanel, setActivePanel] = useState('explorer'); // 'explorer' | 'history' | null
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  // Currently displayed language: follows the active file
  const currentLanguage = activeFile?.language || 'python';

  // ── Terminal Resize ──────────────────────────────
  const isResizingRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);
  const containerRef = useRef(null);

  const handleResizeStart = useCallback((e) => {
    isResizingRef.current = true;
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = terminalHeight;
    e.preventDefault();
  }, [terminalHeight]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartYRef.current - e.clientY;
      const newHeight = resizeStartHeightRef.current + delta;
      const maxH = window.innerHeight * MAX_TERMINAL_HEIGHT_RATIO;
      setTerminalHeight(Math.max(MIN_TERMINAL_HEIGHT, Math.min(maxH, newHeight)));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Language Change ──────────────────────────────
  const handleLanguageChange = useCallback((newLang) => {
    if (!activeFile) {
      createFile(newLang);
      return;
    }
    // If active file is the default boilerplate, rename to match new language
    const newExt = LANG_TO_EXTENSION[newLang];
    const currentExt = LANG_TO_EXTENSION[activeFile.language];
    if (activeFile.name.endsWith(currentExt)) {
      const newName = activeFile.name.replace(currentExt, newExt);
      renameFile(activeFile.id, newName);
    }
    // Create new file with new language
    createFile(newLang);
  }, [activeFile, createFile, renameFile]);

  // ── Run Code ─────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!activeFile || execution.status === EXEC_STATUS.RUNNING) return;
    // Ensure terminal is visible
    setTerminalVisible(true);
    execution.executeCode(activeFile.language, activeFile.code);
  }, [activeFile, execution]);

  // ── Save File ────────────────────────────────────
  const handleSave = useCallback(() => {
    if (activeFileId) markSaved(activeFileId);
  }, [activeFileId, markSaved]);

  // ── Download File ────────────────────────────────
  const handleDownload = useCallback(() => {
    if (activeFileId) downloadFile(activeFileId);
  }, [activeFileId, downloadFile]);

  // ── Global Keyboard Shortcuts ────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+Enter → Run
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      // Ctrl+S → Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+N → New File
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createFile(currentLanguage);
      }
      // Ctrl+B → Toggle Sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      }
      // Ctrl+` → Toggle Terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setTerminalVisible((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleRun, handleSave, createFile, currentLanguage]);

  // ── Menu Action Dispatch ─────────────────────────
  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case 'new-file': createFile(currentLanguage); break;
      case 'save': handleSave(); break;
      case 'download': handleDownload(); break;
      case 'toggle-sidebar': setSidebarVisible((v) => !v); break;
      case 'toggle-terminal': setTerminalVisible((v) => !v); break;
      case 'run': handleRun(); break;
      case 'stop': execution.stopExecution(); break;
      default: break;
    }
  }, [createFile, currentLanguage, handleSave, handleDownload, handleRun, execution]);

  // ── Panel Toggle ─────────────────────────────────
  const handlePanelChange = useCallback((panelId) => {
    if (panelId === null) {
      setSidebarVisible(false);
      setActivePanel(null);
    } else {
      setSidebarVisible(true);
      setActivePanel(panelId);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        height: '100vh',
        width: '100vw',
        gridTemplateRows: '35px 1fr 22px',
        gridTemplateColumns: '48px auto 1fr',
        gridTemplateAreas: `
          "menubar menubar menubar"
          "activity sidebar editor"
          "statusbar statusbar statusbar"
        `,
        overflow: 'hidden',
        background: 'var(--color-vsc-bg)',
      }}
    >
      {/* ── Menu Bar ── */}
      <div style={{ gridArea: 'menubar' }}>
        <MenuBar onAction={handleMenuAction} />
      </div>

      {/* ── Activity Bar ── */}
      <div style={{ gridArea: 'activity' }}>
        <ActivityBar
          activePanel={sidebarVisible ? activePanel : null}
          onPanelChange={handlePanelChange}
        />
      </div>

      {/* ── Sidebar ── */}
      <div
        style={{
          gridArea: 'sidebar',
          width: sidebarVisible ? '250px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.15s ease',
          flexShrink: 0,
        }}
      >
        {sidebarVisible && (
          <Sidebar
            files={files}
            activeFileId={activeFileId}
            onFileOpen={openFile}
            onFileCreate={createFile}
            onFileRename={renameFile}
            onFileDelete={deleteFile}
            onFileDownload={downloadFile}
          />
        )}
      </div>

      {/* ── Editor + Terminal Area ── */}
      <div
        style={{
          gridArea: 'editor',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Tab Bar */}
        <TabBar
          tabs={tabFiles}
          activeTabId={activeFileId}
          onTabClick={openFile}
          onTabClose={closeTab}
        />

        {/* Toolbar */}
        <Toolbar
          language={currentLanguage}
          onLanguageChange={handleLanguageChange}
          execStatus={execution.status}
          onRun={handleRun}
          onStop={execution.stopExecution}
          onSave={handleSave}
          onDownload={handleDownload}
          isConnected={execution.isConnected}
        />

        {/* Monaco Editor */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {activeFile ? (
            <CodeEditor
              key={activeFile.id}
              language={activeFile.language === 'java' ? 'java' : 'python'}
              value={activeFile.code}
              onChange={(newCode) => updateFileCode(activeFile.id, newCode)}
              onCursorChange={setCursor}
              onSave={handleSave}
              onRun={handleRun}
            />
          ) : (
            /* Welcome screen when no file is open */
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-vsc-text-dim)',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '48px' }}>{'</>'}</div>
              <div style={{ fontSize: '20px', color: 'var(--color-vsc-text)', fontWeight: 500 }}>
                CodeForge
              </div>
              <div style={{ fontSize: '13px' }}>
                Open a file from the Explorer or create a new one
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => createFile('python')}
                  style={welcomeBtnStyle('#3572A5')}
                >
                  🐍 New Python File
                </button>
                <button
                  onClick={() => createFile('java')}
                  style={welcomeBtnStyle('#f89820')}
                >
                  ☕ New Java File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Terminal */}
        {terminalVisible && (
          <Terminal
            execution={execution}
            height={terminalHeight}
            onResizeStart={handleResizeStart}
          />
        )}
      </div>

      {/* ── Status Bar ── */}
      <div style={{ gridArea: 'statusbar' }}>
        <StatusBar
          language={currentLanguage}
          cursor={cursor}
          execStatus={execution.status}
          executionTime={execution.executionTime}
          isConnected={execution.isConnected}
          activeFileName={activeFile?.name}
          autosaveState={autosaveState}
          lastSavedAt={lastSavedAt}
        />
      </div>
    </div>
  );
}

const welcomeBtnStyle = (color) => ({
  padding: '8px 20px',
  background: 'transparent',
  border: `1px solid ${color}`,
  borderRadius: '6px',
  color: color,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'inherit',
});
