/**
 * snippetController.js
 * Controller handling REST APIs for saved code snippets.
 * Checks MongoDB connection state and returns graceful fallbacks if down.
 */

import Snippet from '../models/Snippet.js';
import mongoose from 'mongoose';

// Helper to check if DB is connected
const checkDbConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ 
      error: 'Database service is currently unavailable. snippet storage features are disabled.' 
    });
    return false;
  }
  return true;
};

/**
 * Save a code snippet
 * POST /api/snippets
 */
export const saveSnippet = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const { name, language, code } = req.body;

    if (!name || !language || !code) {
      return res.status(400).json({ error: 'Name, language, and code are required fields.' });
    }

    const snippet = new Snippet({ name, language, code });
    await snippet.save();

    res.status(201).json(snippet);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all snippets
 * GET /api/snippets
 */
export const getSnippets = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const snippets = await Snippet.find()
      .select('name language updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100);

    res.json(snippets);
  } catch (error) {
    next(error);
  }
};

/**
 * Get snippet by ID
 * GET /api/snippets/:id
 */
export const getSnippetById = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json(snippet);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing snippet
 * PUT /api/snippets/:id
 */
export const updateSnippet = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const { name, language, code } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (language !== undefined) updates.language = language;
    if (code !== undefined) updates.code = code;

    const snippet = await Snippet.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json(snippet);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a snippet
 * DELETE /api/snippets/:id
 */
export const deleteSnippet = async (req, res, next) => {
  try {
    if (!checkDbConnection(res)) return;

    const snippet = await Snippet.findByIdAndDelete(req.params.id);
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json({ message: 'Snippet deleted successfully', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
