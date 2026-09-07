/**
 * dockerExecutor.js
 * Handles execution of Java and Python code inside a sandboxed Docker container.
 * This ensures files are isolated, networking is disabled, and system resources are constrained.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Execute code inside the Docker sandbox container
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} language - 'java' or 'python'
 * @param {string} code - The code to run
 * @param {string} jobId - Unique Job identifier
 * @param {string} tempDir - Local temporary folder holding source code
 * @param {number} timeout - Execution timeout limit in ms
 * @param {Function} onProcessStarted - Callback passed the spawned process handle
 * @param {Function} onProcessEnd - Callback triggered when execution completes
 */
export function executeInDocker(socket, language, code, jobId, tempDir, timeout, onProcessStarted, onProcessEnd) {
  const containerName = 'code-runner';
  const dockerWorkDir = `/code/${jobId}`;
  
  // Local files creation
  let fileName = '';
  if (language === 'java') {
    const match = code.match(/public\s+class\s+(\w+)/);
    const className = match ? match[1] : 'Main';
    fileName = `${className}.java`;
  } else {
    fileName = 'main.py';
  }

  const localFilePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(localFilePath, code);
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `System Error: Failed to write file: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `System Error: ${err.message}`);
    return;
  }

  // 1. Create matching execution folder inside docker container using docker exec
  const mkdirProc = spawn('docker', ['exec', containerName, 'mkdir', '-p', dockerWorkDir]);
  
  mkdirProc.on('close', (mkdirCode) => {
    if (mkdirCode !== 0) {
      socket.emit('output', { type: 'stderr', data: 'Security Sandbox Error: Failed to initialize docker execution workspace. Running local fallback...\r\n' });
      onProcessEnd(1, 'error', 'Docker mkdir failed');
      return;
    }

    // 2. Copy the file into the docker container workspace
    const cpProc = spawn('docker', ['cp', localFilePath, `${containerName}:${dockerWorkDir}/${fileName}`]);

    cpProc.on('close', (cpCode) => {
      if (cpCode !== 0) {
        socket.emit('output', { type: 'stderr', data: 'Security Sandbox Error: Failed to upload file to sandbox container.\r\n' });
        onProcessEnd(1, 'error', 'Docker cp failed');
        return;
      }

      // File is in container. Now run compilation or execution!
      if (language === 'java') {
        const className = fileName.replace('.java', '');
        socket.emit('output', { type: 'info', data: 'Compiling Java program (in Sandbox)...\r\n' });

        // Compile inside container
        const compileProc = spawn('docker', [
          'exec',
          containerName,
          'javac',
          `${dockerWorkDir}/${fileName}`
        ]);

        let compileErr = '';
        compileProc.stderr.on('data', (d) => {
          const text = d.toString();
          compileErr += text;
          const cleanText = text.replace(new RegExp(dockerWorkDir, 'g'), '');
          socket.emit('output', { type: 'stderr', data: cleanText });
        });

        compileProc.on('close', (javacExitCode) => {
          if (javacExitCode !== 0) {
            socket.emit('output', { type: 'stderr', data: `\r\nCompilation failed with exit code ${javacExitCode}\r\n` });
            onProcessEnd(javacExitCode, 'error', compileErr);
            cleanupDockerDir(containerName, dockerWorkDir);
            return;
          }

          socket.emit('output', { type: 'info', data: 'Compilation successful. Launching...\r\n\r\n' });

          // Run inside container
          runDockerProcess(
            socket,
            containerName,
            ['exec', '-i', '-w', dockerWorkDir, containerName, 'java', className],
            timeout,
            dockerWorkDir,
            onProcessStarted,
            onProcessEnd
          );
        });
      } else {
        // Python execution inside container
        socket.emit('output', { type: 'info', data: 'Launching Python script (in Sandbox)...\r\n\r\n' });
        runDockerProcess(
          socket,
          containerName,
          ['exec', '-i', '-w', dockerWorkDir, containerName, 'python3', '-u', fileName],
          timeout,
          dockerWorkDir,
          onProcessStarted,
          onProcessEnd
        );
      }
    });
  });
}

/**
 * Spawns the Docker execution process, streams its I/O, and sets a timeout.
 */
function runDockerProcess(socket, containerName, args, timeout, dockerWorkDir, onProcessStarted, onProcessEnd) {
  let child;
  let timeoutTimer;

  try {
    child = spawn('docker', args);
  } catch (err) {
    socket.emit('output', { type: 'stderr', data: `Sandbox execution failed to start: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `Failed to start docker exec: ${err.message}`);
    cleanupDockerDir(containerName, dockerWorkDir);
    return;
  }

  onProcessStarted(child);

  timeoutTimer = setTimeout(() => {
    if (child && !child.killed) {
      socket.emit('output', { type: 'stderr', data: `\r\nExecution Timed Out (Limit: ${timeout / 1000}s)\r\n` });
      child.kill('SIGKILL');
      // For Docker, we should also kill the exec process inside the container
      onProcessEnd(null, 'timeout', 'Execution timed out');
      cleanupDockerDir(containerName, dockerWorkDir);
    }
  }, timeout);

  let runtimeOutput = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    runtimeOutput += text;
    socket.emit('output', { type: 'stdout', data: text });
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    runtimeOutput += text;
    const cleanText = text.replace(new RegExp(dockerWorkDir, 'g'), '');
    socket.emit('output', { type: 'stderr', data: cleanText });
  });

  child.on('error', (err) => {
    clearTimeout(timeoutTimer);
    socket.emit('output', { type: 'stderr', data: `Sandbox Runtime error: ${err.message}\r\n` });
    onProcessEnd(1, 'error', `Docker runtime error: ${err.message}`);
    cleanupDockerDir(containerName, dockerWorkDir);
  });

  child.on('close', (exitCode, signal) => {
    clearTimeout(timeoutTimer);
    const isStopped = signal === 'SIGKILL' || signal === 'SIGTERM';
    const status = isStopped
      ? (runtimeOutput.includes('Timed Out') ? 'timeout' : 'stopped')
      : (exitCode === 0 ? 'completed' : 'error');

    onProcessEnd(exitCode, status, runtimeOutput);
    cleanupDockerDir(containerName, dockerWorkDir);
  });
}

/**
 * Remove temporary execution files from the docker container sandbox
 */
function cleanupDockerDir(containerName, dockerWorkDir) {
  const rmProc = spawn('docker', ['exec', containerName, 'rm', '-rf', dockerWorkDir]);
  rmProc.on('close', () => {
    // Cleaned up docker workspace
  });
}
