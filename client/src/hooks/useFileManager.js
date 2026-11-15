/**
 * useFileManager Hook
 *
 * Manages the in-memory file system for the editor.
 * Handles file creation, deletion, renaming, tab management,
 * auto-save to localStorage, and the autosave feature.
 *
 * AUTOSAVE: When a file is edited, a 2-second debounce timer starts.
 * After 2 seconds of no further edits, the file is automatically
 * marked as saved and persisted to localStorage.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

/** Autosave debounce delay in milliseconds */
const AUTOSAVE_DELAY = 2000;

// Default code templates for new files
const DEFAULT_CODE = {
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  python: `print("Hello, World!")`,
};

// File extension to language mapping
const EXTENSION_TO_LANG = {
  '.java': 'java',
  '.py': 'python',
};

// Language to file extension mapping
const LANG_TO_EXTENSION = {
  java: '.java',
  python: '.py',
};

/**
 * Generate a unique file ID
 */
const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Get language from filename extension
 */
const getLanguageFromFilename = (filename) => {
  const ext = filename.substring(filename.lastIndexOf('.'));
  return EXTENSION_TO_LANG[ext] || 'python';
};

/**
 * Load saved files from localStorage
 */
const loadFilesFromStorage = () => {
  try {
    const saved = localStorage.getItem('compiler_files');
    if (saved) {
      const files = JSON.parse(saved);
      if (files.length > 0) return files;
    }
  } catch (e) {
    console.warn('Failed to load files from localStorage:', e);
  }

  // Default files
  return [
    {
      id: generateId(),
      name: 'Main.java',
      language: 'java',
      code: DEFAULT_CODE.java,
      isModified: false,
    },
    {
      id: generateId(),
      name: 'main.py',
      language: 'python',
      code: DEFAULT_CODE.python,
      isModified: false,
    },
  ];
};

/**
 * Custom hook for file management
 */
export function useFileManager() {
  const [files, setFiles] = useState(loadFilesFromStorage);
  const [activeFileId, setActiveFileId] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);

  // Autosave state: 'idle' | 'saving' | 'saved'
  const [autosaveState, setAutosaveState] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const localStorageTimerRef = useRef(null); // debounce for localStorage writes
  const autosaveTimerRef = useRef(null);     // debounce for autosave mark-as-saved

  // Initialize active file and open tabs on mount
  useEffect(() => {
    if (files.length > 0 && !activeFileId) {
      const firstFile = files[0];
      setActiveFileId(firstFile.id);
      setOpenTabs([firstFile.id]);
    }
  }, []);

  // Persist files to localStorage (500ms debounce — fast, just for storage)
  useEffect(() => {
    if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    localStorageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('compiler_files', JSON.stringify(files));
      } catch (e) {
        console.warn('[FileManager] Failed to persist to localStorage:', e);
      }
    }, 500);
    return () => {
      if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    };
  }, [files]);

  // Autosave: mark modified files as saved after AUTOSAVE_DELAY of inactivity
  useEffect(() => {
    const hasModified = files.some((f) => f.isModified);
    if (!hasModified) return;

    // Show 'saving...' indicator immediately when a change is detected
    setAutosaveState('saving');

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      // Mark all modified files as saved
      setFiles((prev) =>
        prev.map((f) => (f.isModified ? { ...f, isModified: false } : f))
      );
      setAutosaveState('saved');
      setLastSavedAt(new Date());

      // Fade the 'saved' indicator back to idle after 3 seconds
      setTimeout(() => setAutosaveState('idle'), 3000);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [files]);

  /**
   * Get the currently active file object
   */
  const activeFile = files.find((f) => f.id === activeFileId) || null;

  /**
   * Get open tab file objects
   */
  const tabFiles = openTabs.map((id) => files.find((f) => f.id === id)).filter(Boolean);

  /**
   * Create a new file
   * @param {string} language - 'java' or 'python'
   * @param {string} [customName] - Optional custom filename
   */
  const createFile = useCallback((language = 'python', customName) => {
    const ext = LANG_TO_EXTENSION[language] || '.py';
    
    // Generate unique name
    let baseName = language === 'java' ? 'NewClass' : 'script';
    let counter = 1;
    let name = customName || `${baseName}${ext}`;
    
    while (files.some((f) => f.name === name)) {
      name = `${baseName}${counter}${ext}`;
      counter++;
    }

    const newFile = {
      id: generateId(),
      name,
      language,
      code: DEFAULT_CODE[language] || '',
      isModified: false,
    };

    setFiles((prev) => [...prev, newFile]);
    setOpenTabs((prev) => [...prev, newFile.id]);
    setActiveFileId(newFile.id);

    return newFile;
  }, [files]);

  /**
   * Update file code content
   */
  const updateFileCode = useCallback((fileId, newCode) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, code: newCode, isModified: true } : f
      )
    );
  }, []);

  /**
   * Rename a file
   */
  const renameFile = useCallback((fileId, newName) => {
    // Determine new language from extension
    const newLanguage = getLanguageFromFilename(newName);
    
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, name: newName, language: newLanguage }
          : f
      )
    );
  }, []);

  /**
   * Delete a file
   */
  const deleteFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setOpenTabs((prev) => {
      const newTabs = prev.filter((id) => id !== fileId);
      // If active file was deleted, switch to another tab
      if (activeFileId === fileId && newTabs.length > 0) {
        setActiveFileId(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        setActiveFileId(null);
      }
      return newTabs;
    });
  }, [activeFileId]);

  /**
   * Open a file (add to tabs and set active)
   */
  const openFile = useCallback((fileId) => {
    setOpenTabs((prev) => {
      if (!prev.includes(fileId)) {
        return [...prev, fileId];
      }
      return prev;
    });
    setActiveFileId(fileId);
  }, []);

  /**
   * Close a tab
   */
  const closeTab = useCallback((fileId) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((id) => id !== fileId);
      if (activeFileId === fileId) {
        // Switch to adjacent tab
        const closedIndex = prev.indexOf(fileId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveFileId(newTabs[newActiveIndex] || null);
      }
      return newTabs;
    });
  }, [activeFileId]);

  /**
   * Mark file as saved (not modified)
   */
  const markSaved = useCallback((fileId) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, isModified: false } : f))
    );
  }, []);

  /**
   * Download a file
   */
  const downloadFile = useCallback((fileId) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const blob = new Blob([file.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [files]);

  return {
    files,
    activeFile,
    activeFileId,
    openTabs,
    tabFiles,
    createFile,
    updateFileCode,
    renameFile,
    deleteFile,
    openFile,
    closeTab,
    setActiveFileId,
    markSaved,
    downloadFile,
    // Autosave
    autosaveState,   // 'idle' | 'saving' | 'saved'
    lastSavedAt,     // Date object of last autosave
  };
}

export { DEFAULT_CODE, LANG_TO_EXTENSION, EXTENSION_TO_LANG, getLanguageFromFilename };
