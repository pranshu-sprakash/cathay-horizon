# Contributing to Cathay Horizon

The workflow rules below are a **proposal for the team to confirm**. The dependency and setup rules are already what the scripts expect.

## 1. First-time setup

Clone the repo, then run `bash scripts/setup.sh` (or `scripts\setup.ps1` on Windows), as described in the [README](README.md#quick-start-run-once-after-cloning). Re-run it whenever you pull changes to any requirements file or `package.json`.

## 2. Where dependencies are declared

There is exactly one place for each kind of dependency, and the setup scripts install all of them.

| File | Owner | Contains |
|---|---|---|
| `backend/requirements.txt` | CS Lead | the full backend runtime (fastapi, uvicorn[standard], pydantic, requests, google-genai, ephem, geographiclib, numpy) |
| `backend/requirements-mae2.txt` | MAE #2 | runtime dependencies of `spatial_and_flight.py` |
| `backend/requirements-mae2-dev.txt` | MAE #2 | test-only packages (pytest, plus the FastAPI test harness and httpx) |
| `frontend/package.json` + `package-lock.json` | ISDN | frontend packages |

### Adding or changing a dependency

1. Add it to **your** file from the table, using a version range rather than an exact pin (for example `numpy>=1.26,<3`). Don't add it to someone else's file; ask the owner instead.
2. Make sure the range works on **Python 3.10 or newer**. Check the package's `Requires-Python` on PyPI. For example, `numpy==2.5.x` needs Python 3.12, so the module uses a range.
3. Put test-only packages in a `-dev` file, never in a runtime file.
4. Run `scripts/setup.sh` in a fresh clone (or delete `backend/.venv` first), then run the tests.
5. Update the dependency tables in `README.md` in the same pull request.
6. Frontend changes: commit `package-lock.json` alongside `package.json`, so `npm ci` reproduces your install exactly.

## 3. Never commit

- `backend/.venv/`, `backend/venv/`, `node_modules/`, `__pycache__/`, `dist/` (all already git-ignored). Virtual environments are machine-specific; a macOS venv can't run on Windows or Linux.
- `.env` files or any API key, including the Gemini key. If the team needs a template, share a `.env.example` containing variable names only.
- Downloaded or built archives (`*.zip`)

## 4. File ownership

Each person edits only their own files. To change someone else's interface, open an issue or ask that person.

| Owner | Files |
|---|---|
| CS Lead | `backend/main.py`, `backend/initial_state.json`, `backend/requirements.txt` |
| MAE #1 | `backend/agent_engine.py`, `backend/cached_ai_outputs.json` |
| MAE #2 | `backend/spatial_and_flight.py`, `backend/state_sync.py` (server-state glue), `backend/data/`, the module's tests, the `requirements-mae2*.txt` files, and `scripts/export_state_snapshots.py` |
| ISDN | everything under `frontend/` |
| Business Lead | `docs_and_props/` |

Shared files such as `README.md`, `CONTRIBUTING.md`, `.gitignore`, `scripts/` and `.devcontainer/` change only through a reviewed pull request.

## 5. Branches and pull requests (proposed)

- Never push directly to `main`. Work on a branch named `<role>/<short-topic>`, for example `mae2/weather-coverage` or `cslead/endpoints`.
- Open a pull request into `main` and get at least one teammate's review. Describe what changed and how you tested it.
- Before opening the pull request:
  - Backend: run `cd backend && .venv/bin/python -m pytest tests -q`. It must pass offline; it includes all 8 server endpoints.
  - If you changed backend state logic or `initial_state.json`, run `backend/.venv/bin/python scripts/export_state_snapshots.py --source`. A test checks that `frontend/public/mock_state.json` matches what the server serves.
  - If you changed dependencies, re-run the setup script in a fresh clone (see section 2).
  - Frontend: from `frontend/`, run `npm run lint` and `npm run build`.
- Keep pull requests small and limited to the files you own.

## 6. Runtime rules everyone relies on

- **Offline in the air.** Only the explicit weather refresh, the optional Gemini calls (with offline fallbacks) and dependency installation may use the network. Demos and tests must work offline.
- **No hardcoded event times.** Window Moment times, sides and lighting come from `spatial_and_flight.py` through `state_sync.py`. Read `state["window_moments"]`, `flight.window_moment` and `personas[*].window_moment_action` instead of typing times into UI or engine strings.
- **Python 3.10+ compatibility.** Don't use syntax or packages that need a newer Python without agreeing it with the team.
- **Fixed time zones.** The code uses HKT = UTC+8, JST = UTC+9 and GMT = UTC+0 as fixed offsets; no tzdata dependency is needed. LHR is on GMT only from late October to late March. If the demo date moves into British Summer Time, the CX251 arrival offset must change (`TODO(team)` in `SCHEDULES`).
