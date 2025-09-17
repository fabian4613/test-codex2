#!/usr/bin/env bash
set -euo pipefail

echo "[WSL-SETUP] Starting setup for BackstopJS & Lighthouse in WSL2..."

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[WSL-SETUP] apt-get not found. This script targets Ubuntu/Debian under WSL." >&2
  exit 1
fi

SUDO=sudo
if [ "${EUID:-$(id -u)}" -eq 0 ]; then SUDO=""; fi

export DEBIAN_FRONTEND=noninteractive

echo "[WSL-SETUP] Updating apt cache..."
$SUDO apt-get update -y

echo "[WSL-SETUP] Installing system libraries required by headless Chromium..."
$SUDO apt-get install -y \
  curl ca-certificates gnupg \
  libnss3 libnspr4 libatk-bridge2.0-0 libx11-xcb1 libcups2 \
  libxcomposite1 libxrandr2 libxdamage1 libgtk-3-0 libgbm1 \
  libpango-1.0-0 libcairo2 fonts-liberation xdg-utils

# Handle libasound ABI rename on newer Ubuntu (libasound2t64)
if ! $SUDO apt-get install -y libasound2t64; then
  $SUDO apt-get install -y libasound2 || true
fi

if ! command -v google-chrome >/dev/null 2>&1; then
  echo "[WSL-SETUP] Google Chrome not found — installing stable channel..."
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | $SUDO gpg --dearmor -o /etc/apt/keyrings/google-linux-keyring.gpg
  $SUDO chmod a+r /etc/apt/keyrings/google-linux-keyring.gpg
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | $SUDO tee /etc/apt/sources.list.d/google-chrome.list >/dev/null
  $SUDO apt-get update -y || true
  if ! $SUDO apt-get install -y google-chrome-stable; then
    echo "[WSL-SETUP] Failed to install Google Chrome. Falling back to Chromium..."
    $SUDO apt-get install -y chromium || $SUDO apt-get install -y chromium-browser || true
  fi
else
  echo "[WSL-SETUP] Google Chrome already installed."
fi

CHROME_BIN=""
if command -v google-chrome >/dev/null 2>&1; then CHROME_BIN=$(command -v google-chrome); fi
if [ -z "$CHROME_BIN" ] && command -v chromium >/dev/null 2>&1; then CHROME_BIN=$(command -v chromium); fi
if [ -z "$CHROME_BIN" ] && command -v chromium-browser >/dev/null 2>&1; then CHROME_BIN=$(command -v chromium-browser); fi

if [ -z "$CHROME_BIN" ]; then
  echo "[WSL-SETUP] WARNING: No Chrome/Chromium binary found in PATH. Lighthouse will fail."
else
  echo "[WSL-SETUP] Chrome binary: $CHROME_BIN"
fi

echo "[WSL-SETUP] Done."
