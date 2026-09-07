/**
 * ExecutionHistory.js
 * Mongoose schema for saving code execution history.
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const executionHistorySchema = new Schema(
  {
    language: {
      type: String,
      required: true,
      enum: ['java', 'python'],
    },
    code: {
      type: String,
      required: true,
      maxlength: [5000, 'Saved code in history is limited to 5000 characters'],
    },
    output: {
      type: String,
      default: '',
    },
    executionTime: {
      type: Number, // in ms
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['completed', 'error', 'timeout', 'stopped'],
    },
    exitCode: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only log when it was run
  }
);

// Index to clean up old history and query by recency
executionHistorySchema.index({ createdAt: -1 });

const ExecutionHistory = model('ExecutionHistory', executionHistorySchema);

export default ExecutionHistory;
