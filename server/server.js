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
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { setupSocketHandler } from './socket/socketHandler.js';
import snippetRoutes from './routes/snippetRoutes.js';
import historyRoutes from './routes/historyRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

// Auto-detect portable JDK on Render/Linux if present in server/jdk or root/jdk
const localJdkDir = path.resolve(__dirname, 'jdk');
const rootJdkDir = path.resolve(__dirname, '../jdk');
const activeJdkDir = fs.existsSync(path.join(localJdkDir, 'bin', 'javac'))
  ? localJdkDir
  : (fs.existsSync(path.join(rootJdkDir, 'bin', 'javac')) ? rootJdkDir : null);

if (activeJdkDir) {
  process.env.JAVA_HOME = activeJdkDir;
  const binDir = path.join(activeJdkDir, 'bin');
  if (!process.env.PATH.includes(binDir)) {
    process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;
  }
  console.log(`[JDK] Configured standalone OpenJDK at: ${activeJdkDir}`);
}

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/online-compiler';

// Configure CORS
const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...clientUrls,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, curl, uptime checks without origin header
    if (!origin) {
      return callback(null, true);
    }
    // Allow explicitly defined client URLs & localhost
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow all Vercel deployments (production, previews, branch deploys)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Allow Render deployments
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
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

// Serve static frontend in production if built (Unified deployment support)
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

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
