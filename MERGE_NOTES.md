# Merge notes: CS Lead backend + MAE #2 module

**Inputs.**
- The CS Lead's `cathay-horizon` setup: CX251 HKG → LHR, FastAPI server, agent engine, React frontend, and a stub `spatial_and_flight.py`.
- MAE #2's repaired `spatial_and_flight.py` (built for CX524 HKG → NRT) with its data, tests and setup docs.

**Decisions** (confirmed by MAE #2 before merging):
1. **Flight: CX251.** The module now supports CX251, with CX524 kept as a second flight. `DEMO_FLIGHT = "CX251"`.
2. **No hardcoded story.** On the demo date (16 Nov 2026, arriving 17 Nov) there is **no sunrise before landing**. At 11 km over the English Channel the sun is still about 13° below the horizon at 05:55 GMT. The hardcoded "05:55 GMT English Channel Sunrise & Aurora" texts were therefore replaced with computed values. The engine finds **Venus, the morning star, on the left side**: peak ~05:22 GMT on time, or ~06:02 GMT with the +40 min delay.
3. **Minimal direct edits** to the CS Lead's and MAE #1's files. Every change is listed below.
4. **The old map, QR and meeting-point assistance was replaced** by the consent-first assistance memory flow. The removed concept: HKIA Meeting Point C, map pins, QR payloads, the Door 2L wheelchair handover and step-free routes.

## What changed, file by file

### New files

| File | What it is |
|---|---|
| `backend/state_sync.py` (MAE #2) | Glue between the module and the server state. It writes the computed schedule, Window Moments, per-seat actions and assistance prompt/plan into `STATE`. It also applies one-tap assistance answers and keeps assistance memory in step with the 3-way consent matrix. No network. |
| `backend/tests/test_integration_main.py` | 9 tests that drive all 8 endpoints of the real `main.py` through FastAPI's TestClient, with sockets blocked and no Gemini key. |
| `backend/tests/test_cx251.py` | 9 CX251 tests, including an independent PyEphem check that there is no pre-landing sunrise on the demo date. |
| `backend/data/cx251_track.csv` + `.meta.json` | Synthetic HKG → LHR track. `TODO(team)`: replace it with a real ADS-B track. |
| `scripts/export_state_snapshots.py` | Regenerates `frontend/public/mock_state.json` from the state the server actually serves. With `--source` it also rewrites `backend/initial_state.json`. |
| Module files | `spatial_and_flight.py` (replaces the stub), `data/`, the other tests, `requirements-mae2*.txt`, `README_MAE2.md`, `MAE2_REPAIR_REPORT.md`, plus the root `README.md`, `CONTRIBUTING.md`, `scripts/setup.*` and `.devcontainer/` |

### `backend/spatial_and_flight.py` (MAE #2)

- Adds CX251 to `SCHEDULES`: 23:00 HKT → 05:40 GMT, block 880 min, runway 857 min.
- Adds `GMT` to `TZ_LABELS`, and adds `DEMO_FLIGHT`, `SYNTHETIC_WAYPOINTS_CX251` and `SYNTHETIC_ROUTES`.
- Track files are now per flight (`data/<flight>_track.csv`).
- `generate_synthetic_track(..., flight=)` and the CLI option `--generate-track --flight CX251` are new.
- The weather refresh and fallback snapshots now cover every supported flight.
- Public signatures are unchanged, and CX524 behaviour is unchanged.

### `backend/main.py` (CS Lead): 47 changed lines

- Imports `spatial_and_flight` and `state_sync`.
- **Load and reset:** after loading `initial_state.json`, it calls `state_sync.apply_spatial_and_assistance(STATE)`. It then rebuilds only the crew cards for 11A, 12K and 11D, so the hand-written 14K card is kept.
- **Startup:** an optional weather refresh, only when `CATHAY_REFRESH_WEATHER=1`. It's off by default, so the demo stays offline and the committed sample is never rewritten.
- **`/api/toggle-privacy`:** changing the `kapoor_wheelchair` item's consent now syncs her assistance memory. `DONT_REMEMBER` erases the stored need and history (Guardrail #4) but keeps this trip's request. `SHARE_WITH_CREW` and `SERVICE_ONLY` only change who sees the details.
- **`/api/trigger-delay`:** after `run_delay_agent`, it recomputes the schedule, Window Moments and assistance legs for the new delay, then rebuilds the crew cards.
- **`/api/accept-lounge`:** the hardcoded "Sunrise Wake (05:55 GMT)" icon and text were replaced with the computed label and action.
- **New 8th endpoint, `POST /api/assist-response`:** `{seat, option: YES_SAME|YES_NEW|CHANGE|NO|FORGET, level?, segments?, duration_type?, temporary_until?}`. Free text is ignored. Invalid answers change nothing and log a BLOCKED audit entry.

### `backend/agent_engine.py` (MAE #1 / CS Lead): 73 changed lines

- Uses the shared `CREW_INSTRUCTIONS` wording. The B3 cue is now "Face passenger directly when speaking".
- 11A's Window Moment crew icon uses the computed label (for example "Wake: Venus 05:22 GMT"), and is omitted when there's no moment.
- **12K:** the wheelchair crew icon appears **only after the passenger confirms** this trip (`assistance_plan.active`), followed by the consent-filtered crew brief lines. Before that, the card shows "Assistance not yet confirmed for this trip".
- `assist_count` now counts confirmed plans instead of a fixed 1. The purser headline drops "Door-2L Assist" and "Sunrise Wake (05:55 GMT)".
- **`run_delay_agent`:**
  - The hardcoded `window_moment` and `window_moment_detail` block was removed; `state_sync` recomputes them.
  - The Meeting Point C, pins and QR re-timing for 12K was removed; her service legs are re-timed by the module.
  - Her pickup-ETA label, notification and audit wording no longer mention the removed concept.
- Compiler presets and the Gemini prompt no longer reference "05:55 GMT English Channel Sunrise".

### `backend/initial_state.json` (CS Lead)

- **12K:** removed `assist_profile`, `departure_assist_map` and `arrival_assist_map`, and added `assistance` (consent CREW, remembered WCHR need, no request yet). The `kapoor_wheelchair` and `kapoor_hearing` labels now use functional or instruction wording. Her pickup-ETA label was reworded.
- **11A:** added `assistance`, the optional expired-temporary "Mathur" fixture. The `pref_sunrise` label and the quiz selection now say "computed Window Moment".
- **14K:** added `assistance` with consent DONT_REMEMBER.
- Seeded audit entry 4 no longer claims an English Channel sunrise evaluation.
- Window, crew-card and purser fields were regenerated from the served state by `scripts/export_state_snapshots.py --source`, so the file never carries stale hardcoded values.

### `backend/requirements.txt` (CS Lead)

Added `ephem>=4.1,<5`, `geographiclib>=2.0,<3` and `numpy>=1.26,<3`.

### Frontend (ISDN)

- `frontend/src/App.jsx`: **1 guarded line** (line 1410). The offline delay fallback wrote to `departure_assist_map`, which no longer exists, so it now checks first.
- `frontend/public/mock_state.json`: regenerated from the served startup state. It is **no longer an exact copy of `initial_state.json`**, because it also includes the computed keys. A test enforces that it matches `GET /api/state` at startup.

### Root files

- `.gitignore`: the CS Lead's entries plus `*.py[cod]`, `.pytest_cache/`, `.env.*` (with `!.env.example`), `Thumbs.db`, `*.zip` and temp files.
- `README.md` and `CONTRIBUTING.md`: rewritten for the merged repo, with every dependency and environment variable.
- **Not included:** the CS Lead's macOS `backend/venv/` (machine-specific) and `.DS_Store` files.

## New state fields

These are additive unless marked "replaced". The frontend can render them.

| Path | Content |
|---|---|
| `flight.schedule` | `get_flight_schedule()`: gate departure, takeoff, touchdown and gate arrival (each `{utc, display}`), block minutes |
| `window_moments` | Full computed result: `moments[]` (window, peak, side, score, confidence, reasons, `delay_effect`), `seat_actions{seat: [...]}`, `considered[]`, `data_sources` |
| `flight.window_moment`, `flight.window_moment_detail` | **Replaced**: computed headline and detail (title, `time_gmt`, side, `conflict_resolution{seat: action}`, confidence, window, reasons) |
| `personas[*].window_moment_action` | **Replaced**: the computed action line for that seat |
| `personas[*].window_moment_label` | Short crew-card label, or null |
| `personas[*].assistance` | Stored assistance memory (consent, need, history, requests) |
| `personas[*].assistance_prompt` | What the app should ask: mode, headline, options, deadline. **Nothing is auto-submitted.** |
| `personas[*].assistance_plan` | Confirmed service legs with delay-shifted times, plus ground and crew briefs. **Simulated record.** |
| `last_assistance_response` | Result of the latest `/api/assist-response` call |

## Verification (run in this merge)

| Check | Result |
|---|---|
| `backend/.venv/bin/python -m pytest backend/tests -q`, Python 3.12.3 | **196 passed**. Warnings: FastAPI's `@app.on_event` deprecation in `main.py` and a third-party httpx notice. |
| Fresh copy of the repo, `bash scripts/setup.sh` (Python 3.13.18), installing the real `requirements.txt` | OK: fastapi 0.163.0, uvicorn 0.54.0, google-genai 3.3.0, `pip check` clean. **196 passed** there too. |
| Real server: `uvicorn main:app --port 8000`, exercised with curl | All 8 endpoints return 200 and the CORS preflight returns 200. YES_SAME → plan active; delay → arrival leg 06:20 GMT and "Arrival assistance notified of new time 06:20 GMT"; 11A → "Wake gently · open shade · Venus on left (06:02 GMT, estimate)". No errors in the server log. |
| Frontend: `npm ci`, `npm run build`, `npm run lint` | build OK, lint clean |
| Headless Chromium render of the built frontend against the live backend, clicking 12K, Delay, Crew iPad, Post-Flight and Agent Console | **No page or console errors.** The computed Venus moment is shown. |
| Network | Ordinary runs and tests make no network calls. Gemini is used only when `GEMINI_API_KEY` is set; the weather refresh only when `CATHAY_REFRESH_WEATHER=1`. |

## Open items, by owner

**ISDN (frontend):**
- `App.jsx` still has **hardcoded** "05:55" and "English Channel Sunrise" text in its built-in fallback state (lines ~95–395), in the cabin-summary tiles ("Door 2L Assist", "05:55 Sunrise Wake", ~line 821–825), in the conflict-resolver panel (~829), and in the offline compiler (~1480). Please render `flight.window_moment_detail`, `window_moments.seat_actions` and `personas[*].window_moment_action` instead.
- The A3/A4 assistance panel and map no longer render, because `assist_profile` and the maps are gone. Please add a small tile driven by `personas[*].assistance_prompt`: headline, subline, and option buttons that POST `/api/assist-response` with `{seat, option}`. Also show `assistance_plan.legs` when it is active.

**MAE #1 (`agent_engine.py`):**
- `_call_gemini_json` uses `with ThreadPoolExecutor(...)`. The `with` block waits for the worker on exit, so the "3 s timeout" does **not** bound a hung Gemini call. Use `executor.shutdown(wait=False)` or the module's bounded-worker pattern.
- Remaining hardcoded delay times ("06:20 GMT", "07:05 GMT Estimate", "05:50 GMT top-of-descent") could come from `get_flight_schedule("CX251", delay)`. That full refactor wasn't part of this merge.
- `pickup_eta.touchdown_time` holds the gate-arrival time (06:20), but touchdown is 06:12 by the shared schedule (gate arrival minus 8 min).
- The Universal Compiler accepts free text, and its default example is a medical term ("Photophobia / Migraine"). Please review this against the no-free-text and no-diagnosis rules.

**CS Lead (`main.py`, state):**
- `@app.on_event("startup")` is deprecated in current FastAPI; move it to a lifespan handler eventually.
- 14K's state says "Center Seats (14G/14K)", but with the seat map (A/D/G/K, 1-2-1) **14K is a right-side window seat**, so it now receives Window Moment actions. Ms. Chen's 11D is a centre seat (NO_WINDOW). Please confirm the Boeing 777-300ER Aria Suite seat letters (`SEAT_MAP` is `TODO(team)`).

**Business Lead:** `skybook_history` still says "English Channel Sunrise witnessed at 05:55 GMT" for a past trip. That's only accurate in late March or September–October. Please check the dates in the Skybook story.

**Team decisions (`TODO(team)`):**
- the demo date (moving it changes what's visible, and BST vs GMT for LHR)
- a real CX251 ADS-B track
- the CX251 seat layout
- the Mathur fixture (`MATHUR_ASSIST_FIXTURE_ENABLED`)
- the assistance deadline policy (48 h)
