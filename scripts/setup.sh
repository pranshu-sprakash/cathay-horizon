#!/usr/bin/env bash
# One-command setup after `git clone` (Linux / macOS / WSL / Git Bash).
#   bash scripts/setup.sh            # backend runtime + dev/test deps, frontend deps if present
#   bash scripts/setup.sh --runtime  # backend runtime deps only (no pytest/FastAPI test harness)
# Override the interpreter with PYTHON=/path/to/python3.x. Safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PYTHON="${PYTHON:-python3}"
MODE="dev"
[[ "${1:-}" == "--runtime" ]] && MODE="runtime"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

command -v "$PYTHON" >/dev/null 2>&1 || die "$PYTHON not found. Install Python 3.10+ or set PYTHON=..."
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' \
  || die "Python 3.10+ required; $PYTHON reports: $("$PYTHON" --version 2>&1 || echo 'no version (not a Python interpreter?)')"

say "Backend virtual environment: backend/.venv"
if [[ ! -x "$BACKEND/.venv/bin/python" ]]; then
  "$PYTHON" -m venv "$BACKEND/.venv"
fi
VPY="$BACKEND/.venv/bin/python"
"$VPY" --version

# Shared backend manifest (owned by the CS Lead) - installed when it exists.
if [[ -f "$BACKEND/requirements.txt" ]]; then
  say "Installing backend/requirements.txt (shared backend dependencies)"
  "$VPY" -m pip install -r "$BACKEND/requirements.txt"
else
  echo "    (backend/requirements.txt not present yet - skipped)"
fi

if [[ "$MODE" == "dev" ]]; then
  say "Installing backend/requirements-mae2-dev.txt (module runtime + test dependencies)"
  "$VPY" -m pip install -r "$BACKEND/requirements-mae2-dev.txt"
else
  say "Installing backend/requirements-mae2.txt (module runtime dependencies)"
  "$VPY" -m pip install -r "$BACKEND/requirements-mae2.txt"
fi

say "Checking installed packages are consistent"
"$VPY" -m pip check

say "Smoke test: import the backend module (offline)"
( cd "$BACKEND" && "$VPY" -c "import spatial_and_flight as m; s = m.get_flight_schedule(m.DEMO_FLIGHT, 0); assert s['supported']; print('    spatial_and_flight OK, touchdown', s['touchdown']['display'])" )

if [[ -f "$FRONTEND/package.json" ]]; then
  command -v npm >/dev/null 2>&1 || die "frontend/package.json found but npm is not installed (install Node.js LTS)"
  say "Installing frontend dependencies"
  if [[ -f "$FRONTEND/package-lock.json" ]]; then (cd "$FRONTEND" && npm ci); else (cd "$FRONTEND" && npm install); fi
else
  echo "    (frontend/package.json not present yet - skipped)"
fi

say "Done. Next:"
echo "    cd backend && .venv/bin/python -m pytest tests -q      # run tests (offline)"
echo "    cd backend && .venv/bin/python spatial_and_flight.py   # offline demo"
