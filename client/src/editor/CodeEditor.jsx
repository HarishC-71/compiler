/**
 * CodeEditor.jsx
 * Monaco Editor wrapper component with VS Code Dark+ theme,
 * language switching, cursor tracking, and auto-save.
 */

import { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { EDITOR_OPTIONS } from './editorConfig.js';

/**
 * @param {Object} props
 * @param {string} props.language - Monaco language identifier ('java' | 'python')
 * @param {string} props.value - Current code content
 * @param {Function} props.onChange - Callback when code changes
 * @param {Function} [props.onCursorChange] - Callback with { line, column }
 * @param {Function} [props.onSave] - Callback when Ctrl+S pressed
 * @param {Function} [props.onRun] - Callback when Ctrl+Enter pressed
 */
export default function CodeEditor({
  language,
  value,
  onChange,
  onCursorChange,
  onSave,
  onRun,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  /**
   * Configure editor after mount:
   * - Register keyboard shortcuts (Ctrl+S, Ctrl+Enter)
   * - Track cursor position
   * - Disable default browser save dialog
   */
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Ctrl+S → Save file
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Ctrl+Enter → Run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.();
    });

    // Track cursor position for status bar
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Focus editor on mount
    editor.focus();
  }, [onSave, onRun, onCursorChange]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme="vs-dark"
        options={EDITOR_OPTIONS}
        onChange={(val) => onChange?.(val ?? '')}
        onMount={handleEditorDidMount}
        loading={
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1e1e1e',
              color: '#858585',
              fontFamily: 'Consolas, monospace',
              fontSize: 14,
            }}
          >
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
