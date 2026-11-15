/**
 * editorConfig.js
 * Monaco Editor configuration and default code templates.
 */

/** Default boilerplate for each language */
export const DEFAULT_CODE = {
  java: `public class Main {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`,
  python: `# Your code here
print("Hello, World!")`,
};

/** Language display metadata */
export const LANGUAGES = [
  {
    id: 'java',
    label: 'Java',
    monacoLang: 'java',
    extension: '.java',
    icon: '☕',
    color: '#f89820',
  },
  {
    id: 'python',
    label: 'Python',
    monacoLang: 'python',
    extension: '.py',
    icon: '🐍',
    color: '#3572A5',
  },
];

/** Get language info by id */
export const getLanguage = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[1];

/** Monaco editor options – closely mirrors VS Code defaults */
export const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
  fontLigatures: true,
  lineHeight: 22,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'off',
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  renderWhitespace: 'selection',
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  padding: { top: 16, bottom: 16 },
  suggest: { showWords: false },
  quickSuggestions: true,
  parameterHints: { enabled: true },
  formatOnPaste: true,
  formatOnType: false,
  renderLineHighlight: 'gutter',
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  colorDecorators: true,
};
