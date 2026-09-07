/**
 * server.js
 * Entry point for the VS Code-inspired Online Compiler Backend.
 * Initializes Express, Socket.IO, MongoDB connections, and mounts API routes.
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

import { setupSocketHandler } from './socket/socketHandler.js';
import snippetRoutes from './routes/snippetRoutes.js';
import historyRoutes from './routes/historyRoutes.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/online-compiler';

// Configure CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Mount Routes
app.use('/api/snippets', snippetRoutes);
app.use('/api/history', historyRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Configure Socket.IO Server
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Setup Socket.IO Handler
setupSocketHandler(io);

// Track MongoDB connection status
let isDbConnected = false;

// Connect to MongoDB (Optional - graceful fallback if down)
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    isDbConnected = true;
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error('[MongoDB] Connection failed. Snippet and history logging features will be unavailable:', error.message);
    isDbConnected = false;
  }
};

// Start Server
httpServer.listen(PORT, async () => {
  console.log(`[Server] Running on port ${PORT}`);
  await connectDB();
});

// Export database status for route controllers
export { isDbConnected };
export default app;
