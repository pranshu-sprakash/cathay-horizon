# Cathay Horizon

**"Cathay remembers, so you never ask twice."** This is the Cathay Pacific Hackathon 2026 prototype: a consent-first passenger memory layer covering pre-flight, in-flight and post-flight, demonstrated on flight **CX251, Hong Kong (HKG) to London Heathrow (LHR)**, 23:00 HKT to 05:40 GMT.

> **Status.** These parts work: the FastAPI server (8 endpoints), the agent engine with its offline fallbacks, the spatial/flight module (computed Window Moments and assistance memory), and the React frontend.
> These are still stubs: `frontend/src/components/*.jsx` (waiting for ISDN's drop-ins) and `docs_and_props/` (Business Lead). See [`MERGE_NOTES.md`](MERGE_NOTES.md) for what changed in the merge and the open items.

## Quick start (run once after cloning)

Git never runs code automatically on `git clone`; that is a deliberate security rule. Instead, run **one setup command** after cloning. It creates `backend/.venv`, installs every backend dependency listed below, and runs `npm ci` in `frontend/`.

**Linux / macOS / WSL / Git Bash**

```bash
git clone <repo-url> cathay-horizon
```
```bash
cd cathay-horizon
```
```bash
bash scripts/setup.sh
```

**Windows (PowerShell)**

```powershell
git clone <repo-url> cathay-horizon
cd cathay-horizon
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

**GitHub Codespaces / VS Code Dev Containers.** Open the repo in a Codespace, or choose *Reopen in Container* in VS Code. `.devcontainer/devcontainer.json` runs `scripts/setup.sh` automatically, so this is the only route where installation happens without typing a command.

Both scripts are safe to re-run. Add `--runtime` (bash) or `-Runtime` (PowerShell) to skip the test-only packages. To pick a specific interpreter, set `PYTHON=/path/to/python3.12`.

## Run the demo

Open two terminals. On Windows use `.venv\Scripts\python.exe` instead of `.venv/bin/python`.

Terminal 1, from `backend/`: start the API on http://localhost:8000.

```bash
.venv/bin/python -m uvicorn main:app --port 8000
```

Terminal 2, from `frontend/`: start the React app.

```bash
npm run dev
```

The frontend polls `http://<host>:8000/api/state` every second. If the backend is unreachable it falls back to `frontend/public/mock_state.json`.

Run the tests from `backend/`. They run offline and include the server endpoints.

```bash
.venv/bin/python -m pytest tests -q
```

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Python | **3.10 or newer** (tested 3.10.20, 3.11.18, 3.12.3, 3.13.18) | backend |
| pip + venv | ships with Python (on Debian/Ubuntu: `sudo apt install python3-venv`) | backend |
| Node.js + npm | LTS (tested Node 22.23 / npm 10.9) | frontend |
| Git | any recent version | cloning |

## Dependencies

### Backend runtime (`backend/requirements.txt`, owner: CS Lead)

| Package | Allowed range | Tested | Purpose |
|---|---|---|---|
| `fastapi` | `>=0.110.0` | 0.163.0 | the API server (`main.py`) |
| `uvicorn[standard]` | `>=0.29.0` | 0.54.0 | ASGI server |
| `pydantic` | `>=2.7.0` | 2.14.3 | data models (via FastAPI) |
| `requests` | `>=2.31.0` | 2.34.2 | the explicit weather refresh (Open-Meteo) |
| `google-genai` | `>=1.0.0` | 3.3.0 | optional Gemini enrichment in `agent_engine.py`; deterministic fallback when unavailable |
| `ephem` (PyEphem) | `>=4.1,<5` | 4.2.1 | sun, moon and Venus positions (`spatial_and_flight.py`) |
| `geographiclib` | `>=2.0,<3` | 2.1 | WGS84 geodesics |
| `numpy` | `>=1.26,<3` | 1.26.4, 2.2.6, 2.4.6, 2.5.4 | vectorised geometry and statistics |

`backend/requirements-mae2.txt` holds the last three again, for installing the module on its own. pip picks a NumPy build that matches your Python. **Don't pin `numpy==2.5.x`**, because it breaks Python 3.10 and 3.11.

### Backend development and test (`backend/requirements-mae2-dev.txt`, skipped with `--runtime`)

| Package | Allowed range | Tested | Purpose |
|---|---|---|---|
| `pytest` | `>=7.4` | 9.2.0 | test runner |
| `fastapi` | `>=0.110` | 0.162–0.163 | the test-only harness and the server tests |
| `httpx` | `>=0.25` | 0.28.1 | required by FastAPI's `TestClient` |

### Transitive Python packages

pip installs these automatically. Versions are from a fresh clone on Python 3.13:

> annotated-doc 0.0.6, annotated-types 0.8.0, anyio 4.16.0, certifi 2026.10.23, cffi 2.1.1, charset-normalizer 3.5.2, click 8.5.1, cryptography 50.0.2, distro 1.9.0, google-auth 2.62.2, h11 0.16.0, httpcore 1.0.9, httpcore2 2.16.0, httptools 0.9.0, httpx2 2.16.0, idna 3.20, iniconfig 2.3.1, opentelemetry-api 1.45.2, packaging 26.3, pluggy 1.7.0, pyasn1 0.6.5, pyasn1-modules 0.4.2, pycparser 3.12, pydantic-core 2.50.4, Pygments 2.21.0, python-dotenv 1.2.4, PyYAML 6.0.3, sniffio 1.3.1, starlette 1.10.0, tenacity 9.1.4, truststore 0.10.5, typing-extensions 4.16.0, typing-inspection 0.4.5, urllib3 2.8.0, uvloop 0.23.0, watchfiles 1.3.0, websockets 17.4

### Frontend (`frontend/package.json` + `package-lock.json`, owner: ISDN)

| Package | Range | Installed (`npm ci`) | Purpose |
|---|---|---|---|
| `react`, `react-dom` | `^19.3.1` | 19.3.1 | UI |
| `lucide-react` | `^1.73.0` | 1.73.0 | icons |
| `vite` (dev) | `^8.3.6` | 8.3.8 | dev server and build |
| `@vitejs/plugin-react` (dev) | `^6.1.2` | 6.3.0 | React support for Vite |
| `oxlint` (dev) | `^1.90.0` | 1.93.0 | linting (`npm run lint`) |
| `@types/react`, `@types/react-dom` (dev) | `^19.3.0` | 19.3.0 | editor types |

### Environment variables, secrets and external services

| Item | Required? | Notes |
|---|---|---|
| `GEMINI_API_KEY` | No | Read by `agent_engine.py`. If it's unset, or the call fails or times out, the engine uses deterministic offline output. Put it in a local `.env` and **never commit it** (`.env` is git-ignored). |
| `CATHAY_REFRESH_WEATHER=1` | No | Makes `main.py` fetch a live Open-Meteo forecast at startup (bounded to 3 s). Off by default, so the demo stays offline and the committed sample in `backend/data/cached_weather.json` is left alone. |
| Open-Meteo forecast API | No | Free, no key. Only contacted by the refresh above. |

## Useful commands

All commands run from the repo root.

**Regenerate the frontend's offline preview** (`frontend/public/mock_state.json`) after changing backend state logic. Add `--source` to also rewrite `backend/initial_state.json`.

```bash
backend/.venv/bin/python scripts/export_state_snapshots.py --source
```

**Window Moments CLI demo**, offline:

```bash
backend/.venv/bin/python backend/spatial_and_flight.py
```

**Fetch a live weather forecast** into the cache:

```bash
backend/.venv/bin/python backend/spatial_and_flight.py --refresh-weather
```

**Lint and build the frontend**, from `frontend/`:

```bash
npm run lint
```
```bash
npm run build
```

## Repository layout

```
cathay-horizon/
├── README.md, CONTRIBUTING.md, MERGE_NOTES.md, .gitignore
├── .devcontainer/devcontainer.json      # Codespaces / Dev Containers: auto-runs setup
├── scripts/
│   ├── setup.sh, setup.ps1              # one-command setup after cloning
│   └── export_state_snapshots.py        # regenerate mock_state.json / initial_state.json
├── backend/
│   ├── main.py, initial_state.json, requirements.txt   # CS Lead: FastAPI server (8 endpoints) + state
│   ├── agent_engine.py, cached_ai_outputs.json          # MAE #1: embedded AI + 8 guardrails
│   ├── spatial_and_flight.py, state_sync.py             # MAE #2: schedule, Window Moments, assistance
│   ├── requirements-mae2.txt, requirements-mae2-dev.txt, README_MAE2.md, MAE2_REPAIR_REPORT.md
│   ├── data/                                            # tracks (CX251, CX524), landmarks, weather, fallback
│   └── tests/                                           # 196 offline tests incl. the server endpoints
├── frontend/                            # ISDN: React 19 + Vite 8 (src/App.jsx; components/ are stubs)
└── docs_and_props/                      # Business Lead: placeholders
```
