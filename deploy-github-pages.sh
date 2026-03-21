#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

XDG_CACHE_HOME=/tmp COREPACK_HOME=/tmp/corepack pnpm install --ignore-workspace --frozen-lockfile --config.confirmModulesPurge=false
TRIP_PASSPHRASE="${TRIP_PASSPHRASE:-}" XDG_CACHE_HOME=/tmp COREPACK_HOME=/tmp/corepack pnpm test
TRIP_PASSPHRASE="${TRIP_PASSPHRASE:-}" XDG_CACHE_HOME=/tmp COREPACK_HOME=/tmp/corepack pnpm build

git add -A
if ! git diff --cached --quiet; then
  git commit -m "Ship Honeymoon update"
fi

git push origin main

echo "Pushed to main. GitHub Actions will validate and deploy the app to GitHub Pages."
