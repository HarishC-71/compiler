/**
 * Socket.IO Client Service
 * 
 * Manages the WebSocket connection to the backend server.
 * Provides a singleton socket instance for real-time communication
 * with the code execution engine.
 */
import { io } from 'socket.io-client';

// Server URL - defaults to Render backend
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD && typeof window !== 'undefined' && window.location.origin.includes('onrender.com')
    ? window.location.origin
    : 'https://compiler-bk4w.onrender.com');

/**
 * Socket.IO client singleton instance
 * Configured with reconnection and transport settings
 */
const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

// Connection event logging
socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('[Socket] Connection error:', error.message);
});

/**
 * Socket event names - constants for type safety
 */
export const SOCKET_EVENTS = {
  EXECUTE_CODE: 'execute-code',
  SEND_INPUT: 'send-input',
  STOP_EXECUTION: 'stop-execution',
  OUTPUT: 'output',
  EXECUTION_START: 'execution-start',
  EXECUTION_END: 'execution-end',
};

export default socket;
