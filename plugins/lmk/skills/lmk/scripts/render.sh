#!/usr/bin/env bash
# Render Mermaid source (stdin) as a terminal diagram via the vendored
# termaid wheel. Wheels are zip-importable, so no install step is needed.
# Exits non-zero if python3 is missing or the source fails to parse;
# callers fall back to hand-drawn ASCII in that case.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WHEEL="$(ls "$SCRIPT_DIR"/vendor/termaid-*.whl | head -1)"

command -v python3 >/dev/null || { echo "render.sh: python3 not found" >&2; exit 1; }

PYTHONPATH="$WHEEL" exec python3 -m termaid "$@"
