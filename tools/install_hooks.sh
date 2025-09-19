#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
mkdir -p "$ROOT_DIR/.git/hooks"
cp "$ROOT_DIR/hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-commit"
chmod +x "$ROOT_DIR/.git/hooks/pre-commit"
echo "Installed pre-commit hook → .git/hooks/pre-commit"

