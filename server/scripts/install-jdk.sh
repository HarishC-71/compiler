#!/usr/bin/env bash
# ==============================================================================
# install-jdk.sh
# Downloads and extracts a standalone OpenJDK 21 binary on Linux (for Render)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
JDK_DIR="$SERVER_DIR/jdk"

# If javac is already available in PATH, we're done
if command -v javac >/dev/null 2>&1; then
  echo "[install-jdk] javac is already available on this system:"
  javac -version
  exit 0
fi

# If already downloaded in ./jdk
if [ -x "$JDK_DIR/bin/javac" ]; then
  echo "[install-jdk] OpenJDK is already installed at $JDK_DIR"
  "$JDK_DIR/bin/javac" -version
  exit 0
fi

echo "[install-jdk] javac not found in PATH. Downloading OpenJDK 21 (Amazon Corretto) for Linux x64..."
mkdir -p "$JDK_DIR"

TAR_PATH="/tmp/corretto21.tar.gz"

# Download archive using curl or wget
if command -v curl >/dev/null 2>&1; then
  curl -fSL "https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz" -o "$TAR_PATH"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TAR_PATH" "https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz"
else
  echo "[install-jdk] Error: neither curl nor wget found. Cannot download JDK."
  exit 1
fi

echo "[install-jdk] Extracting OpenJDK 21 into $JDK_DIR..."
tar -xzf "$TAR_PATH" -C "$JDK_DIR" --strip-components=1
rm -f "$TAR_PATH"

echo "[install-jdk] OpenJDK 21 installed successfully!"
"$JDK_DIR/bin/javac" -version
