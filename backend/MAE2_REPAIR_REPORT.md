# MAE #2 repair report: `backend/spatial_and_flight.py`

**Scope.** This pass repaired and verified the module, its data and its tests against the external static audit (F1–F4, B1–B12, A1–A23).

**Missing teammate components.** None of these exist in this tree: `main.py`, `initial_state.json`, `agent_engine.py`, the frontend and a shared `requirements.txt`. I did not create any of them.

**Three separate claims.** They are kept apart throughout this report:
1. Standalone module behaviour: **tested**.
2. Compatibility with an isolated FastAPI harness: **tested**.
3. Real application integration: **blocked**, because the server does not exist yet.

---

## 1. Baseline and changed files

**Baseline (observed in this session, before changes):**
- Ubuntu 24.04.5 x86_64 container, Python 3.12.3 in `backend/.venv`.
- Packages: ephem 4.2.1, geographiclib 2.1, numpy 2.5.4, requests 2.34.2, pytest 9.2.0.
- No git repository, so there is no source revision to record.
- Command: `backend/.venv/bin/python -m pytest backend/tests -q` from the repo root.
- Result: **61 passed in 16.34 s**.
- Every audit defect I could reproduce cheaply was reproduced against that source first, using `scratchpad/repro/repro.py`:

| Item | Observed baseline failure |
|---|---|
| F2 | `TypeError`; the emergency response lacked `schedule` |
| F3 | `TypeError: date not JSON serializable`, and a NaN `ValueError` |
| F4 | `TypeError` raised from `cache_path=123` |
| B1 | Returned `UNAVAILABLE`, rejected FORGET, and made the plan inactive |
| B2 | OFFER options did not include FORGET |
| B3a | The first sample was rebased to minute 0 |
| B3c | Broadcast `ValueError` with shapes (2,) and (4,) |
| B9 | A warning leaked between requests |
| B10 | A score of 0.399 was emitted |
| B11 | `_parse_ts("nan")` returned NaN |

**Runtime source modified:**
- `backend/spatial_and_flight.py` (2,662 → 3,226 lines). The repairs are targeted; it is not a rewrite.

**Tests:**
- `backend/tests/test_spatial_and_flight.py`: the original 61 tests, all kept. Two tests were updated, each because its premise relied on behaviour the repair corrected:
  - The mocked Open-Meteo response is now a realistic streamed list with grid coordinates. The old mock returned two identical, coordinate-free locations, so it could not test association.
  - The last-good test now changes the weather content. A byte-identical copy legitimately has the same identity under content digests.
  - No assertion was weakened, and no skip or xfail was added.
- New `backend/tests/test_mae2_repairs.py`: 105 regression and assumption tests.
- New `backend/tests/test_fastapi_compat.py`: 12 tests in a test-only harness. This is not a server.

**Setup and documentation files (the narrow authorization):**
- `backend/requirements-mae2.txt` (runtime)
- `backend/requirements-mae2-dev.txt` (pytest, plus fastapi and httpx for the harness only)
- `backend/.gitignore` (venv, pycache, pytest cache, stray atomic-write temp files)
- `backend/README_MAE2.md`
- this report

**Regenerated artifacts:**
- `data/cx524_track.csv`: same values as before. Only the line endings changed, from CRLF (the old `csv` default) to LF.
- `data/cx524_track.meta.json`: now records `csv_sha256`.
- `data/fallback_window_moments.json`: now schema `window-fallback-2`, with `config_sig` and `data_digests`. It was rebuilt from fresh computations.
- `demo_output.txt` and `test_results.txt`.
- `data/cached_weather.json` and `data/landmarks.json` are **unchanged**.

---

## 2. Disposition ledger

Locations are current lines in `spatial_and_flight.py`, written as `M:<line>`. Tests are in `test_mae2_repairs.py` (R) or `test_spatial_and_flight.py` (O).

### Conditional fatal and schema findings

| ID | Status | Fix and location | Regression |
|---|---|---|---|
| F1 | **Fixed (setup) / blocked (server)** | Module-owned `requirements-mae2*.txt`. I reproduced the failure: a venv with only fastapi, uvicorn, pydantic and requests gives `ModuleNotFoundError: No module named 'ephem'`. `uvicorn main:app` remains impossible until the CS Lead writes `main.py`. | R `test_f1_*`; clean installs on 3.10 / 3.11 / 3.12 / 3.13 (section 3) |
| F2 | **Fixed** | `_valid_fallback_moment` (M:2766) checks every consumed field: type, finiteness, score range, HIGH/MEDIUM confidence, ordering `start ≤ peak ≤ end`, the exact alert lead, and airborne bounds. `_fallback_snapshot` (M:2789) rejects the whole snapshot if any moment fails. `_window_result` (M:2725) is the single builder of the `window-1` shape, used by the normal, last-good, fallback and empty paths. `_degraded` (M:2814) guards each recovery step separately. The final emergency return still includes `schedule`. `_print_demo` reads results defensively. | R `test_f2_*`: 15 corruption kinds, a valid fallback with current DND, the regenerated identity, and a **subprocess CLI run with a `notes: null` fallback plus a broken ephemeris** (exit 0, no traceback) |
| F3 | **Fixed** | `@_strict_json` (M:339) wraps every public application function. `_json_safe` (M:306) converts dates and datetimes to ISO strings, NaN and ±inf to null, numpy scalars to native types, and sets to sorted lists. Unknown objects become **null, never `str(obj)`**. `apply_assistance_response` takes a JSON-safe copy at the input boundary. **Documented input domain:** JSON values, plus date/datetime and numpy scalars. "Unchanged block" on rejection means JSON-equal; it is literally equal for JSON-shaped input. Cyclic graphs are out of scope and produce an error result instead of raising. | R `test_f3_*` (dates, `np.float64(inf)`, `np.int64`, NaN, `object()`), all checked with `json.dumps(..., allow_nan=False)` |
| F4 | **Fixed** | `refresh_weather_cache` (M:3004) validates `cache_path` and `timeout_s` (0 < t ≤ 60, not bool, finite) inside its `try`. `write_fallback_snapshots` validates its path. Write failures become `ok: false`. Only `Exception` is caught; KeyboardInterrupt and SystemExit propagate. | R `test_f4_*`: 8 bad-argument cases, an unwritable destination, a bad date |

### Silent logic and edge-case findings

| ID | Status | Fix and location | Regression |
|---|---|---|---|
| B1 | **Fixed** | `_norm_assistance` (M:633) checks consent **first**. Under DONT_REMEMBER the stored need and history are never parsed; only whether they exist is recorded, for the audit code. `_enum` (M:606) makes membership tests safe for unhashable junk. `_canon_segments` and the communication handling accept only list or tuple. Current-trip requests are read independently of memory. | R `test_b1_*`: 4 malformed residual variants × prompt, FORGET, YES_NEW, rejected YES_SAME, refused recording and an active redacted plan; 3 malformed CREW needs |
| B2 | **Fixed** | FORGET is offered whenever permitted memory exists, including OFFER with history only (M:886). It is still never offered under DONT_REMEMBER. | R `test_b2_*`: the whole sequence (expired → NO → next trip → OFFER with FORGET → YES_NEW → FORGET keeps the current request) |
| B3a | **Fixed** | `_resample_track` (M:1550) no longer rebases time; recorded offsets are preserved. A partial-coverage note is added. Missing early flight is not fabricated. The importer still rebases raw ADS-B observations to the first airborne sample, as documented, which is a different operation. | R `test_b3a_*`: the first sample is at takeoff + 30 min with matching position |
| B3b | **Fixed** | Airborne-domain invariant: samples are capped at the scheduled runway time (`_track_for`, M:2510). Candidates wholly outside [takeoff, touchdown] are rejected as "Outside the scheduled airborne period" rather than clamped. Windows that overlap a boundary are clipped, with the peak clamped inside them (M:2253). | R `test_b3b_*`: an overlong recorded track, a wholly post-touchdown candidate, boundary clipping |
| B3c | **Fixed** | `_circular_smooth` (M:1533) uses cumulative sums, so the output is always input length. It matches the old kernel exactly where the old kernel worked. Fewer than two samples is an explicit `ValueError`, and the loader rejects tracks shorter than one sample. A 2-point recorded track now runs. | R `test_b3c_*`: 2, 3, 5, 6 and 12 rows; singleton; too short; 0/360 wrap; equivalence with the old kernel |
| B4 | **Fixed** | Perturbed runs recompute wherever the nominal reference is NaN but the sample is now eligible (M:2006). The same guard was added for sun and Moon. I checked the remaining shortcuts: the sun band covers sunrise, Belt of Venus and the −4° Venus gate, and glare is nominal-only by design. | R `test_b4_*`: **full-recomputation equivalence for all 20 MC runs at delays 0, 40 and 600**, plus a Venus-hole fixture that the old code fails |
| B5 | **Fixed** | `_cloud_series` (M:1832) takes the required points per landmark (the landmark, plus the line-of-sight midpoint when the track passes within range). Missing points and too-distant hours use ASSUMED_CLOUD and set a per-sample `assumed` mask. Confidence is lowered ("Forecast incomplete for this view: cloud assumed"). `data_sources.weather_coverage` reports `{required_points, missing_points, complete}` and a warning is added. Refresh reports `coverage_complete` and `missing_points`. The committed sample is never `live`. The random-overlap cloud rule is unchanged. | R `test_b5_*`: complete; 6 incomplete kinds (missing point, all-null, unequal lengths, nulls around the pass, out-of-range or non-numeric values, empty arrays); far nulls; singleton hour; stale date; out-of-range days; corrupt file |
| B6 | **Fixed** | `_atomic_write_bytes` (M:434) uses a unique `mkstemp` file in the same directory, then write → flush → fsync → close → chmod 0644 → `os.replace`, and unlinks the temp file on any failure. **Policy: last completed writer wins; each document is complete.** No lock is taken, so this works across processes. The track CSV and sidecar are two separate atomic writes; the sidecar stores the CSV's sha256 and is ignored if it doesn't match. **Windows limitation:** `os.replace` can raise PermissionError if another process holds the target open; it is reported as `ok: false` and has not been run on Windows. | R `test_b6_*`: 6 threads × 25 writes with a reader and a barrier; 3 **processes** × 40 writes; failure before replace (old file intact, no temp left); sidecar mismatch |
| B7 | **Fixed** | `_config_sig` (M:2415) hashes every UPPER_CASE constant at call time, excluding fixtures, paths and purely operational knobs. It is part of the core and result keys (`_DataCtx.sig`). Last-good is used only when `config_sig` matches. The disk fallback requires an exact match on flight, date, delay **and** `config_sig`. Old v1 snapshots are rejected, not trusted retroactively. Data drift under the same configuration is allowed only as a degraded result, labelled "last good / earlier data snapshot". | R `test_b7_*`: change and revert, last-good refused under a new configuration, a restart-equivalent disk fallback refused when the schedule changes |
| B8 | **Fixed** | One immutable `_DataCtx` (M:2463) per request. The delayed core, the zero-delay core, the result, debug data and provenance all come from it. Identity is the sha256 of the bytes actually read. `_read_snapshot` (M:2431) re-reads only when the stat changes and memoises only when the stat is stable across the read. | R `test_b8_*`: a refresh injected **between** the delayed and base computations still yields one generation; the next request picks up the new generation consistently |
| B9 | **Fixed** | Request warnings are appended after the cached result is copied and are never stored in it (`get_oag_and_window_moments`, M:2869). | R `test_b9_*`: both call orders, cold and warm, None / {} / invalid |
| B10 | **Fixed** | `_select` compares the raw score with `MIN_SCORE` (M:2231). Rounding is applied to the displayed value only. | R `test_b10_*`: 0.399, 0.3999999, 0.4, 0.401. Zero-delay Fuji is still 0.39 and still filtered |
| B11 | **Fixed** | `_parse_ts` (M:1429) rejects nan, ±inf and overflowed values before any ordering or arithmetic. Seconds, milliseconds (threshold 1e11) and ISO formats still work. | R `test_b11_*`: 5 bad rows mixed with out-of-order good rows |
| B12 | **Fixed** | `_main` (M:3185): 0 on success (an empty Window Moments result counts as success), 1 on an operational failure, 2 on bad arguments. Added `--out PATH` so tests never overwrite committed data. | R `test_b12_*` subprocess checks: refresh through a dead proxy → 1 (no file written); unwritable fallback or track → 1; generate and write-fallback → 0; `--bogus` and lone `--out` → 2; demo → 0; refresh success in-process → 0 |

### Assumptions A1–A23

| ID | Final disposition | Evidence |
|---|---|---|
| A1 | **Confirmed OK** | Installed ephem 4.2.1: float lat/lon are radians (`"35:00:00.0"`), `Date(25567.5)` is `1970/1/1 00:00:00`, and the converted epoch round-trips. `pressure=0` disables refraction: at ~+35° the difference against 1010 hPa is 0.005–0.05° (near the horizon it is about 1.4°, which is why the threshold handles refraction explicitly). See R `test_a1_*`. |
| A2 | **Confirmed OK** | `moon.phase` stays in 0–100 over a whole lunation, with a minimum below 3 and a maximum above 97 (R `test_a2_*`). |
| A3 | **Confirmed OK** | geographiclib 2.1 with the `DISTANCE\|AZIMUTH` mask returns `s12` and `azi1`; `InverseLine.Position` returns `lat2`/`lon2`; `s13` equals `s12` (R `test_a3_*`). |
| A4 | **Confirmed OK**, plus a documented defect | Searchsorted, argmax and percentile guards are intact. `np.convolve(mode="same")` returns max(M, N) samples, confirmed on the installed numpy; that was the B3c cause (R `test_a4_*`). |
| A5 | **Risk mitigated** | Measured: 8 concurrent identical cold calls ran 16 core computations in **6.19 s**. With per-key single-flight in `_get_core` (M:2661), the same load takes **0.76 s**. Different keys are not serialized (3 different keys: 1.34 s). If the leader fails, a waiter takes over and nothing is cached. All caches stay bounded at 32. See R `test_a5_*` (concurrency equals serial results, cache clears mid-flight, leader failure). The GIL still serializes CPU work within one process. |
| A6 | **Fixed** (with B8) | Measured: 25 warm polls parse the weather file **once**. Warm-call median is 0.37 ms (was ~1 ms). See R `test_a6_*`. |
| A7 | **Confirmed OK, retested** | Mutating any nested part of a returned result (moments, debug, coverage, seat actions) never reaches a later result, including through the last-good path. `get_demo_personas()` always returns pristine copies (R `test_a7_*`). The exported `DEMO_PERSONAS` remains a mutable dict by design; callers should copy it. |
| A8 | **Partially changed, documented** | `generate_synthetic_track(step_min=None)` now reads its constant at call time. `refresh_weather_cache(timeout_s=3)` keeps its documented default, so changing `WEATHER_TIMEOUT_S` after import does not change the default; pass `timeout_s=` explicitly. This is ordinary Python default-argument behaviour, kept so the published signature stays unchanged. |
| A9 | **Confirmed OK** | `rsplit("_", 1)` handles landmark IDs that contain underscores (R `test_a9_*`). |
| A10 | **Confirmed OK** | `"40"` → 0 and `40.0` → 40 are intentional. **API boundary:** declare `delay: int` in FastAPI, which coerces query and path strings to int before the call. |
| A11 | **Confirmed OK** | Scheduled-date identity and the midnight-crossing CX999 test are retained (O). |
| A12 | **Fixed** | See B1. |
| A13 | **Confirmed OK** | A duplicate YES_SAME after the deadline keeps the original `late: false` and `confirmed_on`; a genuine CHANGE after the deadline is a new, late booking (R `test_a13_*`). |
| A14 | **Fixed** | See B4. |
| A15 | **Fixed** | See B3b. The crew-busy rule (alert ≥ touchdown − 30 min) and the shade rule (touchdown − 20 min) were already as specified. |
| A16 | **Fixed** | See F2 and B7. |
| A17 | **Fixed** | See B10. |
| A18 | **Confirmed OK (modelling assumption)** | Sky weights 1.0 / 0.8 / 0.7 / 0.6 and the 25° sky limit are unchanged. |
| A19 | **Confirmed OK** | Assumed 40/40 cloud gives 64% under random overlap, which suppresses Fuji. That is conservative and was kept. |
| A20 | **Confirmed OK** | Matching is by key plus side; the spread is P90 − P10 of peak times; the seed and the 20 runs are unchanged. |
| A21 | **Confirmed OK** | First upward crossing of −(0.833 + dip); no sunset added. Sunrise reference: NAOJ gives **06:17 JST** for Tokyo on 2026-11-16 (35.6581 N, 139.7414 E, 0 m); timeanddate.com also lists 06:17. The test asserts ±2 min and does not derive the expected value from production code. |
| A22 | **Resolved as specified, plus real turn tests** | If the sunrise crossing's bracketing samples are in a turn, that run's candidate is **suppressed**, with no time or score borrowed and the diagnostic "Sunrise occurs during a turn" (M:1985). Non-turn results are unchanged: the score comes from the nearest bracketing sample, as before. A sustained 2.5 °/s orbit is flagged; a 1.0 °/s orbit is not; peaks exclude turn samples. **Finding:** with 2-minute smoothing, brief heading kinks (like the synthetic waypoints, ≤0.13 °/s) never trigger; only sustained turns faster than 1.5 °/s do. See R `test_a22_*`. |
| A23 | **Risk remains** | B11 is fixed. Compatibility with real FlightRadar24 or ADS-B Exchange exports is **unverified**: no real export was available, and synthetic aliases prove nothing about real formats. |

### Environment and integration checks

| Check | Status |
|---|---|
| Open-Meteo multi-location order | The official docs (open-meteo.com/en/docs) say a multi-location request returns "a list of structures", but **no order guarantee is documented**. They also say returned coordinates are grid-cell centres "a few kilometres away". So `_associate_locations` (M:2980) matches results by coordinates, within 15 km, one-to-one, and rejects count mismatches, ambiguous matches and missing coordinates. Tested with reversed order and 5 mis-association shapes, with the cache left intact each time. |
| Bounded refresh deadline | `_bounded_get_json` (M:2930) runs one daemon worker with a semaphore of size 1. It streams the body in chunks, checks a monotonic deadline, caps the size at 2 MB, and never writes. The caller joins for at most `timeout_s` and then reports a timeout. **Proven:** a slow trickle returns in under 1.6 s with `timeout_s=0.6`; a hanging connect returns in under 1.2 s with `timeout_s=0.5`; a second refresh while the worker is alive fails fast; a late success is discarded and never written. **Remaining limit:** DNS (`getaddrinfo`) cannot be interrupted, so a stuck worker can outlive the call until the OS gives up. The caller is still bounded, and while that worker lives, further refreshes fail fast. |
| Live verification (one controlled call, scratch destination) | `ok: true`, `coverage_complete: true`, 0.54 s. Requested (35.3606, 138.7274) returned grid (35.35, 138.75); requested (35.1304, 139.0399) returned grid (35.15, 139.0625); 72 hours each. The committed sample is untouched. One success does not establish operational reliability. |
| Network during ordinary use | R `test_no_network_*` blocks `connect`, `connect_ex`, `create_connection` and `getaddrinfo`, then runs the default CLI and delays 0, 40 and 600 with debug: no attempts. The import tests assert `requests` is not imported. |
| Launch arrangements | Tested: import from `backend/`, import as `backend.spatial_and_flight` from the repo root, import via `sys.path` from `/`, and import from a **path containing spaces** (O, R). |

---

## 3. Executed verification

All commands below were actually run in this session. The working directory is `/home/user`.

| Command | Result |
|---|---|
| `backend/.venv/bin/python -m pytest backend/tests -q -p no:cacheprovider` (Python 3.12.3, numpy 2.5.4) | **178 passed, 0 failed, 0 skipped**, 1 third-party warning: Starlette's TestClient recommends `httpx2`. |
| Clean venv, `pip install -r backend/requirements-mae2-dev.txt`, Python **3.10.20** (from uv) | numpy **2.2.6**, ephem 4.2.1, geographiclib 2.1, requests 2.34.2, fastapi 0.162.5, starlette 1.7.0, pydantic 2.14.3. `pip check` clean. **178 passed** |
| Same, Python **3.11.18** | numpy **2.4.6**, fastapi 0.162.7, starlette 1.10.0. `pip check` clean. **178 passed** |
| Same, Python **3.13.18** | numpy **2.5.4**. `pip check` clean. **178 passed** |
| Python 3.11 + **numpy 1.26.4** (lower bound) | `pip check` clean. **178 passed** |
| Runtime-only venv (`requirements-mae2.txt`), Python 3.12.3 | ephem 4.2.1, geographiclib 2.1, numpy 2.5.4, requests 2.34.2. Import works and computes `['sunrise_right', 'fuji_left']` at +40, not degraded |
| Venv with only the planned shared deps (fastapi, uvicorn, pydantic, requests) | `ModuleNotFoundError: No module named 'ephem'`, which reproduces F1 |
| `backend/.venv/bin/python backend/spatial_and_flight.py` | exit 0, output in `demo_output.txt` |

**Platforms.** Only Linux was run. Windows and macOS were **not** run. The design is portable (pathlib, fixed UTC offsets, LF data files, `os.replace`), but that is a design review, not execution.

---

## 4. Calculation evidence

| | Before the repair | After the repair |
|---|---|---|
| Delay 0 | `venus_right` 04:25–05:59 JST, 0.65 HIGH; `belt_of_venus_left` 05:48–06:07, 0.47 HIGH, crew busy; `fuji_left` 0.39 (score below 0.4) | **identical** |
| Delay +40 | `sunrise_right` peak 06:09, 0.59 HIGH, "Only visible because of the delay"; `fuji_left` peak 06:29, 1.00 MEDIUM, ALPENGLOW, "Delay moved this pass from pre-dawn silhouette to sunlit summit" | **identical** |
| Delay +600 | no moments | no moments. `considered` now also shows `fuji_left` "Hidden by cloud (82% mid/high cloud, daylight)", from the sample forecast's daytime hours |
| Weather coverage | not reported | `fuji` complete (both required points present in the sample) |

None of the repairs changed a displayed result for the committed data, and I did not hand-tune anything. The shortcut-versus-full equivalence test shows the Monte Carlo statistics are exactly those of full recomputation.

**Performance.** These are fresh-process measurements in a 4-vCPU shared cloud container, not a laptop:

| Measurement | Value |
|---|---|
| Import | 0.09 s |
| Cold, delay 0 | 0.43 s |
| Cold, delay +40 (includes the zero-delay comparison) | 0.65 s |
| Cold, delay +600 | 0.73 s |
| Warm, median | 0.28–0.37 ms (p95 ≤ 1.1 ms) |
| 400 warm polls across 8 threads | 0.29 s |
| 8 identical cold calls, before single-flight | 6.19 s |
| 8 identical cold calls, after single-flight | 0.76 s |

Targets: below 1.5 s locally and below 3 s in CI. Both are met here.

**Fallback provenance.** Each snapshot records `config_sig`, `data_digests` (track CSV, sidecar, weather, landmarks) and the `data_sources` it was computed from. It is regenerated with `--write-fallback` from fresh computations; the writer never uses a degraded result.

---

## 5. Public integration contract

The signatures are unchanged:

```
get_flight_schedule(flight_number, delay_minutes=0, demo_date=None)
get_assistance_prompt(persona, flight_number="CX524", delay_minutes=0, today=None, *, demo_date=None)
apply_assistance_response(persona, flight_number, response, today=None, *, demo_date=None)
build_assistance_service_plan(persona, flight_number="CX524", delay_minutes=0, *, demo_date=None)
record_flown_segment(assistance, flight, date)
get_offline_terminal_maps(delay_minutes=0, *, persona=None)   # deprecated plan shim, no maps
get_oag_and_window_moments(flight_number, delay_minutes, seat_prefs=None, demo_date=None, debug=False)
refresh_weather_cache(demo_date=None, *, cache_path=None, timeout_s=3)
import_adsb_track(path, output_path=None)
generate_synthetic_track(runway_minutes=None, waypoints=None, step_min=None)
write_fallback_snapshots(path=None)
clear_window_cache()
get_demo_personas()
```

Numeric helpers (`horizon_dip_deg`, `side_of`, `elevation_angle_deg`) are unchanged. Schema versions are unchanged except the module-owned fallback file (`window-fallback-2`).

**Additive output fields:**
- `data_sources.weather_coverage`, `data_sources.config_sig` and `data_sources.data_digests`.
- Refresh results now include `coverage_complete`, `missing_points` and `elapsed_s`.
- `data_sources.fallback: "snapshot"` appears only when a fallback snapshot is used.

**Input types:**
- `delay_minutes` should be an int; integral floats are accepted, and strings mean 0.
- Dates are `"YYYY-MM-DD"` strings or `date` objects.
- `today` may be a date-only string, interpreted as 00:00 at the origin, or a full ISO datetime.

Applying an assistance answer without mutating the original or auto-confirming:

```python
import copy, spatial_and_flight as saf
persona = state["personas"]["12K"]                       # the CURRENT state, not the global fixture
prompt = saf.get_assistance_prompt(persona)               # nothing is submitted
result = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"})   # explicit tap only
if result["error"] is None:
    updated = copy.deepcopy(persona); updated["assistance"] = result["assistance"]
    state["personas"]["12K"] = updated
state["audit_log"].extend(result["audit_events"])
plan = saf.build_assistance_service_plan(state["personas"]["12K"], "CX524", state["delay_minutes"])
```

`get_offline_terminal_maps()` uses the pristine 12K fixture, which has no request, so it returns `active: false`. Pass `persona=` to use current state, or better, call `build_assistance_service_plan` directly.

---

## 6. Environment handoff

**Module manifests:**
- `requirements-mae2.txt`: `ephem>=4.1,<5`, `geographiclib>=2.0,<3`, `numpy>=1.26,<3`, `requests>=2.31,<3`.
- `requirements-mae2-dev.txt`: adds `pytest>=7.4`, plus `fastapi>=0.110` and `httpx>=0.25` for the harness only.

**Proposed additions to the CS Lead's shared `backend/requirements.txt`.** I did not edit that file. Add these lines:
```
ephem>=4.1,<5
geographiclib>=2.0,<3
numpy>=1.26,<3
```
`requests` is already planned. Keep pytest in dev dependencies.

**Single-machine resolved environment** (`backend/.venv`, Python 3.12.3): ephem 4.2.1, geographiclib 2.1, numpy 2.5.4, requests 2.34.2, pytest 9.2.0, fastapi 0.162.7, starlette 1.10.0, pydantic 2.14.3, httpx 0.28.1, anyio 4.16.0.

**NumPy and Python versions.** Checked against PyPI metadata: numpy 2.5.x requires Python ≥3.12, 2.3.x requires ≥3.11, and 2.2.6 requires ≥3.10. The range above lets pip choose correctly. A pinned `numpy==2.5.4` would break Python 3.10 and 3.11.

**Commands.** Run from `backend/`:
- Linux / macOS: `python3 -m venv .venv`, then `.venv/bin/python -m pip install -r requirements-mae2-dev.txt`.
- Windows: `py -3 -m venv .venv`, then `.venv\Scripts\python.exe -m pip install -r requirements-mae2-dev.txt`.
- **Only Linux was executed.**

---

## 7. FastAPI handoff

- **Tested in the isolated harness** (`tests/test_fastapi_compat.py`, FastAPI 0.162.7 / Starlette 1.10.0):
  - a sync `def` route, which runs in FastAPI's threadpool
  - an `async def` route using `await run_in_threadpool(...)`
  - delays 0, 40 and 600, debug, the schedule, five assistance flows, and a degraded payload
  - `response.json()` equals the module result after `json.dumps(allow_nan=False)`
  - the installed Starlette `JSONResponse` **rejects NaN**, which confirms the strict-JSON boundary matters
- **Not tested:** the real seven-endpoint app, state application, CORS, the frontend and MAE #1's engine. Their source does not exist yet.
- **Owner actions (CS Lead):**
  1. Add the three dependencies listed in section 6.
  2. Import with `import spatial_and_flight as saf` from `backend/`.
  3. Call the module from `def` routes, or use `run_in_threadpool` inside `async def`. Calling it directly from `async def` would block the event loop.
  4. At startup and on `/api/reset`, call `saf.refresh_weather_cache()`, then warm the cache with delays 0 and 40.
  5. On `/api/trigger-delay`, recompute from current state with `get_oag_and_window_moments("CX524", 40, seat_prefs)` and `build_assistance_service_plan(persona, "CX524", 40)`.
  6. Optionally add `POST /api/assist-response {persona_seat, option, level?, segments?, duration_type?, temporary_until?}`. It would call `apply_assistance_response`, store `assistance` only when `error` is null, and append `audit_events`.
- **MAE #1:** take touchdown from `get_flight_schedule`, and import `CREW_INSTRUCTIONS["DEAF"]["line"]` for B3.

---

## 8. Operational boundaries

- **Runtime network:** only `refresh_weather_cache`. Call it before gate closure (startup or reset), never on the delay trigger. In the air, everything runs from local files and in-memory caches.
- **Hard timeout:** the caller is bounded by `timeout_s`. The DNS limit is described in section 2.
- **Concurrent writers and workers:** each written document is complete, and the last writer wins. Separate workers have separate caches but always serve a self-consistent snapshot. Any configuration change invalidates caches, last-good results and the fallback.
- **Weather provenance:**
  - `live` means fetched by this helper for the same date.
  - `sample` means the committed file or a different date.
  - `assumed` means the file is missing or invalid.
  - Partial coverage is reported per landmark.
- **Assistance:** every record is `simulated: true`.

---

## 9. Remaining `TODO(team)` decisions

1. `DEMO_DATE` and `DEMO_TODAY`. If the date changes, re-check the NAOJ sunrise reference.
2. The CX524 aircraft type and seat layout. The proposed move of Ms. Chen from 11D (a centre seat, so `NO_WINDOW`) to 11K is flagged but not applied. 11K works when supplied.
3. A real CX524 ADS-B track to replace the synthetic one.
4. Cathay's actual assistance deadline policy (48 h assumed) and the "date-only today means 00:00 at the origin" convention.
5. The optional Mathur fixture (`MATHUR_ASSIST_FIXTURE_ENABLED`).
6. Whether the CS Lead adds the assistance-response endpoint.

## 10. Honest unresolved items

| Item | Smallest next action |
|---|---|
| Real server integration is blocked because `main.py` does not exist | Run the smoke test once the CS Lead commits it |
| Windows and macOS were not executed | Run the suite once on each teammate OS |
| Real ADS-B export compatibility is unverified (A23) | Import one real FlightRadar24 or ADS-B Exchange CSV |
| A DNS stall can outlive a refresh call (bounded for the caller) | Acceptable for a startup-only helper |
| Open-Meteo order and null behaviour are undocumented upstream; they are handled defensively | — |
| Only one live refresh was performed | Operational reliability is not established |
| The `httpx2` deprecation warning is third-party | Bump the dev dependency when Starlette requires it |
