/**
 * install-jdk.js
 * Automatically provisions OpenJDK 21 on Linux hosting environments (Render).
 * Safe on all platforms: immediately exits on non-Linux systems (Windows/macOS).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');
const jdkDir = path.join(serverDir, 'jdk');

function main() {
  // 1. If not Linux (e.g. Windows local development), skip Linux JDK download
  if (process.platform !== 'linux') {
    console.log('[install-jdk] Non-Linux platform detected. Skipping Linux OpenJDK provisioning.');
    return;
  }

  const javacPath = path.join(jdkDir, 'bin', 'javac');

  // 2. Check if already installed in server/jdk
  if (fs.existsSync(javacPath)) {
    console.log(`[install-jdk] Standalone OpenJDK already present at ${jdkDir}`);
    return;
  }

  // 3. Check if system javac is already in PATH
  try {
    execSync('javac -version', { stdio: 'ignore', timeout: 5000 });
    console.log('[install-jdk] System javac found in PATH.');
    return;
  } catch {
    // Not installed in PATH
  }

  // 4. Linux environment (Render): Download and extract OpenJDK 21
  console.log('[install-jdk] javac not found. Downloading OpenJDK 21 for Linux x64...');

  try {
    const shScript = path.join(__dirname, 'install-jdk.sh');
    if (fs.existsSync(shScript)) {
      execSync(`bash "${shScript}"`, { stdio: 'inherit', timeout: 120000 });
    } else {
      const tarFile = path.join('/tmp', `corretto21-${Date.now()}.tar.gz`);
      fs.mkdirSync(jdkDir, { recursive: true });
      execSync(`curl -fSL "https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz" -o "${tarFile}"`, {
        stdio: 'inherit',
        timeout: 120000,
      });
      execSync(`tar -xzf "${tarFile}" -C "${jdkDir}" --strip-components=1`, {
        stdio: 'inherit',
        timeout: 60000,
      });
      try { fs.unlinkSync(tarFile); } catch {}
      console.log('[install-jdk] OpenJDK 21 installed successfully!');
    }
  } catch (err) {
    console.warn('[install-jdk] Warning: Could not automatically install OpenJDK:', err.message);
  }
}

main();
