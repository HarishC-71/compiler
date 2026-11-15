/**
 * API Service
 * 
 * Axios-based HTTP client for REST API communication.
 * Handles snippet CRUD and execution history operations.
 */
import axios from 'axios';

// Base URL for API requests
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD && typeof window !== 'undefined' && window.location.origin.includes('onrender.com')
    ? '/api'
    : 'https://compiler-bk4w.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ============================================
   Snippet API
   ============================================ */

/**
 * Save a code snippet to the database
 * @param {{ name: string, language: string, code: string }} snippet
 */
export const saveSnippet = async (snippet) => {
  const { data } = await api.post('/snippets', snippet);
  return data;
};

/**
 * Get all saved snippets
 */
export const getSnippets = async () => {
  const { data } = await api.get('/snippets');
  return data;
};

/**
 * Get a snippet by ID
 * @param {string} id 
 */
export const getSnippetById = async (id) => {
  const { data } = await api.get(`/snippets/${id}`);
  return data;
};

/**
 * Update an existing snippet
 * @param {string} id 
 * @param {{ name?: string, language?: string, code?: string }} updates
 */
export const updateSnippet = async (id, updates) => {
  const { data } = await api.put(`/snippets/${id}`, updates);
  return data;
};

/**
 * Delete a snippet
 * @param {string} id 
 */
export const deleteSnippet = async (id) => {
  const { data } = await api.delete(`/snippets/${id}`);
  return data;
};

/* ============================================
   Execution History API
   ============================================ */

/**
 * Get execution history
 */
export const getHistory = async () => {
  const { data } = await api.get('/history');
  return data;
};

/**
 * Clear all execution history
 */
export const clearHistory = async () => {
  const { data } = await api.delete('/history');
  return data;
};

export default api;
