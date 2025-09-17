#!/usr/bin/env bash
set -euo pipefail

UID_HOST=${HOST_UID:-$(id -u)}
GID_HOST=${HOST_GID:-$(id -g)}

echo "Fixing ownership to ${UID_HOST}:${GID_HOST}..."
sudo chown -R ${UID_HOST}:${GID_HOST} . .next .next-test node_modules backstop_data data.sqlite* 2>/dev/null || true

echo "Done. If errors persist, remove build artifacts:"
echo "  rm -rf .next .next-test && npm run build"

