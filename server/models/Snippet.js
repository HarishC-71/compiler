/**
 * Snippet.js
 * Mongoose schema for saving code snippets.
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const snippetSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Snippet name is required'],
      trim: true,
      maxlength: [100, 'Snippet name cannot exceed 100 characters'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: {
        values: ['java', 'python'],
        message: '{VALUE} is not a supported language. Choose Java or Python.',
      },
    },
    code: {
      type: String,
      required: [true, 'Code content is required'],
      maxlength: [50000, 'Code size cannot exceed 50,000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for query optimization
snippetSchema.index({ name: 1, updatedAt: -1 });

const Snippet = model('Snippet', snippetSchema);

export default Snippet;
