#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-honeymoon-pwa}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is not installed."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub auth is required. Run: gh auth login -h github.com"
  exit 1
fi

GITHUB_USER="$(gh api user -q .login)"
FULL_REPO="${GITHUB_USER}/${REPO_NAME}"

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

if ! git rev-parse --verify main >/dev/null 2>&1; then
  git branch -M main
fi

if [ ! -f .gitignore ]; then
  cat > .gitignore <<'EOF'
.DS_Store
EOF
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "Deploy PWA update"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo view "$FULL_REPO" >/dev/null 2>&1; then
    gh repo clone "$FULL_REPO" /tmp/"$REPO_NAME"-tmp >/dev/null 2>&1 || true
    git remote add origin "https://github.com/${FULL_REPO}.git"
  else
    gh repo create "$FULL_REPO" --public --source=. --remote=origin --push
  fi
fi

git push -u origin main

if gh api "repos/${FULL_REPO}/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/${FULL_REPO}/pages" \
    -H "Accept: application/vnd.github+json" \
    -f source[branch]=main \
    -f source[path]=/
else
  gh api -X POST "repos/${FULL_REPO}/pages" \
    -H "Accept: application/vnd.github+json" \
    -f source[branch]=main \
    -f source[path]=/
fi

echo "Deployed. URL: https://${GITHUB_USER}.github.io/${REPO_NAME}/"
