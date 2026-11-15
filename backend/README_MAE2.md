# `spatial_and_flight.py`: MAE #2 module

This is one importable Python module for Cathay Horizon. It is not a server. It has three jobs:

- **Shared schedule.** `get_flight_schedule` is the single source of truth for CX524 gate and runway times.
- **Window Moments.** `get_oag_and_window_moments` computes what may be visible from each side of the aircraft, and when, with confidence and per-seat actions. The result can legitimately contain no moments.
- **Optional assistance memory.** This is consent-first and needs explicit confirmation for every trip. All requests, legs and plans are **simulated**. Nothing contacts an airline, an airport or staff.

The full repair history is in [`MAE2_REPAIR_REPORT.md`](MAE2_REPAIR_REPORT.md).

**In the merged app** (see [`../MERGE_NOTES.md`](../MERGE_NOTES.md)):
- The demo flight is **CX251 HKG → LHR** (`DEMO_FLIGHT`); CX524 HKG → NRT is still supported.
- `state_sync.py` writes this module's outputs into the server state.
- `main.py` exposes the assistance flow as `POST /api/assist-response`.
- Always pass `flight_number` explicitly: the assistance functions default to "CX524" so their signatures stay unchanged.

## Setup

The module supports Python 3.10 and later. Its runtime dependencies are `ephem`, `geographiclib`, `numpy` and `requests`, listed in `requirements-mae2.txt`. Test-only dependencies are in `requirements-mae2-dev.txt`. Run the commands from `backend/`.

Linux / macOS:

```bash
python3 -m venv .venv
```
```bash
.venv/bin/python -m pip install -r requirements-mae2-dev.txt
```
```bash
.venv/bin/python -m pytest tests -q
```
```bash
.venv/bin/python spatial_and_flight.py
```

Windows (PowerShell or cmd): use the same commands with `py -3 -m venv .venv` and `.venv\Scripts\python.exe` in place of `.venv/bin/python`. Only Linux runs were executed for this repair. Windows and macOS have **not** been run. See the report.

You don't need to pin NumPy yourself. pip picks a wheel that suits your interpreter: 2.2.x on Python 3.10, 2.3+ on 3.11 and later, 2.5+ on 3.12 and later.

## CLI

All commands run from `backend/`.

| Command | Effect | Exit code |
|---|---|---|
| `python spatial_and_flight.py` | Offline demo: schedules, assistance flows, Window Moments at 0 and +40 min | 0 |
| `--generate-track [--out PATH]` | Writes the synthetic track CSV plus its `.meta.json` sidecar | 0 ok, 1 failure |
| `--refresh-weather [--out PATH]` | The **only** network call. Fetches a live Open-Meteo cache | 0 ok, 1 failure |
| `--write-fallback [--out PATH]` | Regenerates `data/fallback_window_moments.json` from fresh computations | 0 ok, 1 failure |

Invalid arguments exit with code 2 (argparse).

## Data files (`backend/data/`)

| File | Provenance |
|---|---|
| `cx524_track.csv` + `.meta.json` | **Synthetic** track from `SYNTHETIC_WAYPOINTS`. The sidecar stores the CSV's sha256. `TODO(team)`: replace with a real ADS-B track via `import_adsb_track`. |
| `landmarks.json` | Mt. Fuji only. |
| `cached_weather.json` | **Offline sample**: real Open-Meteo values fetched 2026-11-14 but labelled `source: sample`. It is always reported as `sample`, never as `live`. |
| `fallback_window_moments.json` | Schema `window-fallback-2`. Snapshots for delays 0 and 40, each tagged with `config_sig` and data digests. Used only when the engine fails **and** flight, date, delay and configuration all match exactly. |

## Integration notes for the CS Lead

- Run `uvicorn main:app` from `backend/` and use `import spatial_and_flight as saf`. Importing does no data I/O and makes no network calls.
- Call these functions from plain `def` routes, which FastAPI runs in its threadpool. Inside an `async def` route, use `await run_in_threadpool(...)`.
- Call `saf.refresh_weather_cache()` at startup and on `/api/reset` only, never per request. Then warm the cache with `get_oag_and_window_moments("CX524", 0)` and `get_oag_and_window_moments("CX524", 40)`.
- Store `apply_assistance_response(...)["assistance"]` on a **copy** of the persona, and only when `error` is null.

See section 5 of the report for examples.
