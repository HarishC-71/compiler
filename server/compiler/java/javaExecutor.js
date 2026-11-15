/**
 * javaExecutor.js
 * Handles compilation and execution of Java code locally.
 * Supports auto-resolving portable OpenJDK or system javac/java binaries.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve javac and java commands from candidate locations
 */
function getJavaBinaries() {
  const isWin = process.platform === 'win32';
  const javacName = isWin ? 'javac.exe' : 'javac';
  const javaName = isWin ? 'java.exe' : 'java';

  const candidates = [
    process.env.JAVA_HOME,
    path.resolve(process.cwd(), 'jdk'),
    path.resolve(__dirname, '../../jdk'),
    path.resolve(__dirname, '../../../jdk'),
    '/opt/render/project/src/server/jdk',
    '/opt/render/project/src/jdk',
    '/usr/lib/jvm/default-java',
    '/usr/lib/jvm/java-21-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk-amd64',
  ].filter(Boolean);

  for (const dir of candidates) {
    const candidateJavac = path.join(dir, 'bin', javacName);
    const candidateJava = path.join(dir, 'bin', javaName);
    if (fs.existsSync(candidateJavac) && fs.existsSync(candidateJava)) {
      return { javacCmd: candidateJavac, javaCmd: candidateJava };
    }
  }

  return { javacCmd: javacName, javaCmd: javaName };
}

/**
 * Compile and run Java code
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} code - The Java code to execute
 * @param {string} tempDir - Dedicated job temp directory
 * @param {number} timeout - Maximum runtime in ms
 * @param {Function} onProcessStarted - Callback passed the spawned process handle
 * @param {Function} onProcessEnd - Callback triggered when execution completes
 */
export function executeJava(socket, code, tempDir, timeout, onProcessStarted, onProcessEnd) {
  // Extract public class name
  const match = code.match(/public\s+class\s+(\w+)/);
  const className = match ? match[1] : 'Main';
  const fileName = `${className}.java`;
  const filePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(filePath, code);
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `System Error: Failed to write Java file: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `System Error: ${err.message}`);
    return;
  }

  const { javacCmd, javaCmd } = getJavaBinaries();

  // 1. Compile Phase (javac)
  socket.emit('output', { type: 'info', data: 'Compiling Java program...\r\n' });
  const compiler = spawn(javacCmd, [fileName], { cwd: tempDir });

  let compileErrorOutput = '';
  let compileEnded = false;

  compiler.stderr.on('data', (data) => {
    const text = data.toString();
    compileErrorOutput += text;
    // Replace raw system path leaks with clean file name
    const cleanText = text.replace(new RegExp(tempDir.replace(/\\/g, '\\\\'), 'g'), '');
    socket.emit('output', { type: 'stderr', data: cleanText });
  });

  compiler.on('error', (err) => {
    if (compileEnded) return;
    compileEnded = true;
    socket.emit('output', { 
      type: 'stderr', 
      data: `Compilation failed to start: ${err.message}\r\nMake sure JDK (javac) is installed and available in server PATH.\r\n` 
    });
    onProcessEnd(1, 'error', `Failed to start compiler: ${err.message}`);
  });

  compiler.on('close', (exitCode) => {
    if (compileEnded) return;
    compileEnded = true;

    if (exitCode !== 0) {
      socket.emit('output', { type: 'stderr', data: `\r\nCompilation failed with exit code ${exitCode}\r\n` });
      onProcessEnd(exitCode, 'error', compileErrorOutput);
      return;
    }

    socket.emit('output', { type: 'info', data: 'Compilation successful. Launching...\r\n\r\n' });

    // 2. Execution Phase (java)
    let child;
    let timeoutTimer;

    try {
      child = spawn(javaCmd, ['-cp', '.', className], { cwd: tempDir });
    } catch (err) {
      socket.emit('output', { type: 'stderr', data: `Execution failed to start: ${err.message}\r\n` });
      onProcessEnd(1, 'error', `Failed to start java: ${err.message}`);
      return;
    }

    // Pass the run handle back to the caller for interactive stdin and process stopping
    onProcessStarted(child);

    // Track execution completion to avoid duplicate callbacks
    let executionEnded = false;
    const finishExecution = (code, status, output) => {
      if (executionEnded) return;
      executionEnded = true;
      clearTimeout(timeoutTimer);
      onProcessEnd(code, status, output);
    };

    // Set execution timeout
    timeoutTimer = setTimeout(() => {
      if (child && !child.killed) {
        socket.emit('output', { type: 'stderr', data: `\r\nExecution Timed Out (Limit: ${timeout / 1000}s)\r\n` });
        child.kill('SIGKILL');
        finishExecution(null, 'timeout', 'Execution timed out');
      }
    }, timeout);

    // Buffer to collect runtime output for history database
    let runtimeOutput = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      runtimeOutput += text;
      socket.emit('output', { type: 'stdout', data: text });
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      runtimeOutput += text;
      // Hide temp directories in stack traces
      const cleanText = text.replace(new RegExp(tempDir.replace(/\\/g, '\\\\'), 'g'), '');
      socket.emit('output', { type: 'stderr', data: cleanText });
    });

    child.on('error', (err) => {
      socket.emit('output', { type: 'stderr', data: `Runtime error: ${err.message}\r\n` });
      finishExecution(1, 'error', `Runtime error: ${err.message}`);
    });

    child.on('close', (runExitCode, signal) => {
      const isStopped = signal === 'SIGKILL' || signal === 'SIGTERM';
      const status = isStopped 
        ? (runtimeOutput.includes('Timed Out') ? 'timeout' : 'stopped')
        : (runExitCode === 0 ? 'completed' : 'error');

      finishExecution(runExitCode, status, runtimeOutput);
    });
  });
}
