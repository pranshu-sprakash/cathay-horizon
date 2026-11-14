"""
spatial_and_flight.py - Cathay Horizon (MAE #2)
===============================================

"Cathay remembers, so you never ask twice."

This module provides three things, all as plain JSON-safe dicts for the FastAPI
layer (owned by the CS Lead) and the icon-first React UI (owned by ISDN):

1. ``get_flight_schedule``      - single source of truth for gate/runway times
                                  (also used by MAE #1's agent_engine.py).
2. Assistance memory (optional) - remembers a passenger's *functional*
                                  wheelchair preference (consent permitting),
                                  pre-fills a one-tap confirmation, never
                                  auto-submits, and produces minimal simulated
                                  service-plan records with consent-filtered
                                  briefs. No maps, routes, QR codes, reasons or
                                  free text.
3. Window Moments engine        - computes what may be visible from each side
                                  of the aircraft (sunrise, Venus, Moon, Belt of
                                  Venus, Mt. Fuji) from a recorded/synthetic
                                  track, PyEphem astronomy, cached weather and a
                                  deterministic Monte Carlo, and turns that into
                                  per-seat actions that respect opt-in and DND.

Design rules (see the spec for details):
* Public functions never raise; failures return a valid dict with
  ``degraded``/``error`` (or ``error``) set.
* Pure: inputs are never mutated; outputs are fresh copies. The only module
  state is an explicit, bounded result cache (plus a lock guarding it).
* No network access except ``refresh_weather_cache``. Imports do no I/O.
* All tunables live in the CONSTANTS block below. ``TODO(team)`` marks open
  team decisions / unverified external facts.
* Times are timezone-aware UTC internally; outputs carry an ISO UTC string and a
  display string with a fixed-offset zone label (HKT = UTC+8, JST = UTC+9).

Interpretations of gaps in the spec are documented inline where they are made
(search for "INTERPRETATION").
"""
from __future__ import annotations

import argparse
import copy
import functools
import hashlib
import tempfile
import time
import csv
import json
import math
import os
import re
import sys
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

import ephem
import numpy as np
from geographiclib.geodesic import Geodesic

# =============================================================================
# CONSTANTS (every tunable number lives here)
# =============================================================================

SCHEMA_VERSIONS: dict[str, str] = {
    "schedule": "schedule-1",
    "assist": "assist-1",
    "window": "window-1",
    "track": "track-1",
    "weather_cache": "weather-cache-1",
    "weather_refresh": "weather-refresh-1",
    "fallback": "window-fallback-2",
}

# ---- Demo configuration ------------------------------------------------------
DEMO_DATE = "2026-11-16"   # TODO(team): local departure date at HKG that the demo depicts.
DEMO_TODAY = "2026-11-14"  # TODO(team): "today" for the pre-flight assistance prompt.

# ---- Schedule ---------------------------------------------------------------
TZ_LABELS: dict[int, str] = {8: "HKT", 9: "JST", 0: "GMT"}  # fixed offsets
# TODO(team): UK clocks are on GMT (UTC+0) from late Oct to late Mar only. If DEMO_DATE moves
# into British Summer Time, LHR local time is UTC+1 (BST) and "arr_local" must be revisited.
SCHEDULES: dict[str, dict[str, Any]] = {
    "CX524": {"origin": "HKG", "dest": "NRT", "dep_local": "01:05", "dep_tz": +8,
              "arr_local": "06:15", "arr_tz": +9},
    "CX251": {"origin": "HKG", "dest": "LHR", "dep_local": "23:00", "dep_tz": +8,
              "arr_local": "05:40", "arr_tz": 0},     # gate times from the CS Lead's initial_state.json
}
DEMO_FLIGHT = "CX251"   # TODO(team): flight the merged demo depicts (team switched from CX524 to CX251)
TAXI_OUT_MIN = 15
TAXI_IN_MIN = 8
RECOVERY_MIN = 0          # minutes of delay recovered in the air (0 = arrival shifts by full delay)
MAX_DELAY_MIN = 600

# ---- Assistance memory (Function 1) ------------------------------------------
ASSIST_REQUEST_DEADLINE_HOURS = 48   # TODO(team): verify Cathay's actual policy. Before *scheduled* gate departure.
ASSIST_REMINDER_HOURS = 72
# INTERPRETATION: a date-only `today` (e.g. "2026-11-14") means the START of that
# day (00:00) in the origin airport's time zone. A full ISO datetime is honoured.
ASSIST_DATE_ONLY_TODAY_LOCAL_TIME = "00:00"
LASTING_RECHECK_DAYS = 365
TEMP_NO_END_DATE_RECHECK_DAYS = 30
ASSIST_CHECKIN_LEAD_MIN = 120
PREBOARD_LEAD_MIN = 45
CONSENT_LEVELS = ("CREW", "SERVICE_ONLY", "DONT_REMEMBER")
DEFAULT_CONSENT = "SERVICE_ONLY"
ASSIST_LEVELS: dict[str, dict[str, str]] = {   # IATA SSR codes: internal only, never shown raw
    "WCHR": {"label": "I can walk short distances", "icon": "walk_short"},
    "WCHS": {"label": "I can't manage stairs", "icon": "no_stairs"},
    "WCHC": {"label": "I need help to my seat", "icon": "full_assist"},
}
ASSIST_SEGMENTS: dict[str, dict[str, str]] = {  # canonical order = journey order
    "CHECKIN_TO_GATE": {"label": "Check-in to gate", "short": "check-in to gate", "icon": "checkin"},
    "BOARDING": {"label": "Boarding", "short": "boarding", "icon": "boarding"},
    "ARRIVAL_TO_EXIT": {"label": "Arrival to exit", "short": "arrival", "icon": "arrival"},
}
ASSIST_DURATION_TYPES: dict[str, dict[str, str]] = {
    "LASTING": {"label": "Every trip", "icon": "repeat"},
    "TEMPORARY": {"label": "For a while", "icon": "calendar"},
}
COMMUNICATION_CODES = ("DEAF", "BLND")
# Crew/ground instruction wording. MAE #1's B3 marker must import these so the
# wording is identical everywhere. Instructions only - never a diagnosis.
CREW_INSTRUCTIONS: dict[str, dict[str, str]] = {
    "WCHR": {"icon": "walk_short", "line": "Can walk short distances; wheelchair for longer distances"},
    "WCHS": {"icon": "no_stairs", "line": "Can walk short distances; cannot manage stairs"},
    "WCHC": {"icon": "full_assist", "line": "Needs help to and from seat"},
    "DEAF": {"icon": "hearing", "line": "Face passenger directly when speaking"},
    "BLND": {"icon": "vision", "line": "Offer arm and describe surroundings"},
    "ASSIST_ARRANGED": {"icon": "assist_arranged", "line": "Assistance arranged"},
}
SERVICE_LEGS: dict[str, dict[str, str]] = {
    "CHECKIN_TO_GATE": {"label": "Assistance from check-in", "icon": "assist_checkin", "owner": "Airport assistance"},
    "BOARDING": {"label": "Pre-boarding at gate", "icon": "preboard", "owner": "Cabin crew"},
    "ARRIVAL_TO_EXIT": {"label": "Wheelchair at aircraft door", "icon": "aircraft_door", "owner": "Arrival assistance"},
}
ASSIST_OPTIONS: dict[str, dict[str, str]] = {
    "YES_SAME": {"label": "Yes, same as last time", "icon": "check"},
    "YES_NEW": {"label": "Yes, please", "icon": "check"},
    "CHANGE": {"label": "Change", "icon": "edit"},
    "NO": {"label": "Not this trip", "icon": "close"},
    "FORGET": {"label": "Don't remember this", "icon": "shield"},
}
ASSIST_LATE_NOTE = "Subject to availability"
ASSIST_SIMULATION_NOTE = "Prototype record only: no airport, crew or booking systems are contacted."
MATHUR_ASSIST_FIXTURE_ENABLED = True  # TODO(team): needs Business Lead agreement; False -> empty block.

# ---- Track (Function 2) -------------------------------------------------------
SAMPLE_SECONDS = 30
HEADING_SMOOTH_MIN = 2
TURN_RATE_DEG_S = 1.5
CRUISE_ALT_M = 11000
CLIMB_MIN = 25
DESCENT_MIN = 30
# TODO(team): replace with a real CX524 track (approximate waypoints, lat/lon degrees).
SYNTHETIC_WAYPOINTS: list[tuple[float, float]] = [
    (22.308, 113.918),   # HKG
    (23.5, 117.5),
    (25.3, 121.8),
    (28.5, 127.5),
    (31.5, 132.5),
    (33.5, 136.5),
    (34.6, 139.0),
    (35.765, 140.386),   # NRT
]
# TODO(team): replace with a real CX251 track. Approximate HKG -> LHR routing over China,
# Mongolia, Siberia, the Baltic and the North Sea (lat/lon degrees); not an operational route.
SYNTHETIC_WAYPOINTS_CX251: list[tuple[float, float]] = [
    (22.308, 113.918),   # HKG
    (30.6, 114.3),
    (40.0, 111.0),
    (47.9, 106.9),
    (55.0, 83.0),
    (57.0, 60.6),
    (56.0, 38.0),
    (55.5, 21.0),
    (54.5, 10.0),
    (52.5, 2.5),
    (51.470, -0.454),    # LHR
]
SYNTHETIC_ROUTES: dict[str, list[tuple[float, float]]] = {
    "CX524": SYNTHETIC_WAYPOINTS, "CX251": SYNTHETIC_WAYPOINTS_CX251,
}
SYNTH_TRACK_STEP_MIN = 1.0                # row spacing of the generated CSV
SYNTH_SPEED_FACTOR_AT_TAKEOFF = 0.55      # relative ground speed at lift-off (ramps to 1.0 at top of climb)
SYNTH_SPEED_FACTOR_AT_TOUCHDOWN = 0.45    # relative ground speed at touchdown (ramps from 1.0 at top of descent)
SYNTH_INTEGRATION_STEP_MIN = 0.05
TRACK_DURATION_TOLERANCE_MIN = 1.0        # synthetic CSV must match the schedule's runway time within this
TRACK_MIN_ROWS = 2
TRACK_MAX_ALT_M = 20000
ADSB_MIN_ALT_FT = 100
ADSB_MIN_SPEED_KT = 50
ADSB_GAP_FILL_MIN = 2.0
ADSB_GAP_FILL_STEP_MIN = 1.0
FT_TO_M = 0.3048
KT_TO_KMH = 1.852
EPOCH_MS_THRESHOLD = 1e11                 # numeric timestamps above this are milliseconds

# ---- Astronomy ----------------------------------------------------------------
SUN_HORIZON_DEG = 0.833        # semi-diameter + standard refraction
SUN_DAWN_GLOW_DEG = 6.0        # sunrise window opens at -(6 + dip)
SUN_WINDOW_END_DEG = 5.0
DIP_ARCMIN_PER_SQRT_M = 1.76   # dip_deg = 1.76 * sqrt(alt_m) / 60
GLARE_SUN_ALT_DEG = 8.0
MOON_MIN_ILLUM = 0.3
SKY_OBJECT_MIN_ABOVE_DIP_DEG = 2.0    # moon/Venus must be above -dip + 2
VENUS_MAX_SUN_ALT_DEG = -4.0
BELT_SUN_LOW_EXTRA_DEG = 4.0          # Belt of Venus while sun between -(4 + dip) ...
BELT_SUN_HIGH_DEG = 1.0               # ... and +1 deg
# INTERPRETATION (gap): a cabin window shows roughly the lower sky only; point
# objects (Moon, Venus) higher than this are not counted as "at the window".
SKY_MAX_VIEW_ALT_DEG = 25.0
# INTERPRETATION (gap): sky events have no lighting state, so this "interest
# weight" plays the role of lighting_factor in the score. Sunrise ranks highest;
# Belt of Venus is explicitly low priority.
SKY_EVENT_WEIGHTS: dict[str, float] = {"sunrise": 1.0, "moon": 0.8, "venus": 0.7, "belt_of_venus": 0.6}
EVENT_PRIORITY: dict[str, int] = {"sunrise": 0, "landmark": 1, "moon": 2, "venus": 3, "belt_of_venus": 4}
LIGHTING_THRESHOLDS: dict[str, float] = {  # sun altitude at the landmark (deg)
    "DARK_BELOW": -6.0, "SILHOUETTE_BELOW": -1.0, "ALPENGLOW_UPTO": 6.0,
}
LIGHTING_ORDER = ("DARK", "SILHOUETTE", "ALPENGLOW", "DAYLIGHT")
LIGHTING_FACTORS: dict[str, float] = {"DARK": 0.0, "SILHOUETTE": 0.5, "ALPENGLOW": 1.0, "DAYLIGHT": 0.8}
LIGHTING_REASONS: dict[str, str] = {
    "DARK": "Too dark", "SILHOUETTE": "Silhouette before sunrise",
    "ALPENGLOW": "Alpenglow on summit", "DAYLIGHT": "Daylight on summit",
}
LIGHTING_PHRASES: dict[str, str] = {
    "DARK": "darkness", "SILHOUETTE": "pre-dawn silhouette",
    "ALPENGLOW": "sunlit summit", "DAYLIGHT": "daylight",
}

# ---- Visibility geometry ------------------------------------------------------
FOV_GOOD_DEG = 45.0
FOV_MAX_DEG = 60.0
HEADING_TOLERANCE_DEG = 5.0      # subtracted from beam offset (crab angle + smoothing)
ANGLE_FACTOR_AT_GOOD = 0.5
VFOV_MIN_DEG = -35.0
VFOV_MAX_DEG = 10.0
GEOMETRIC_RANGE_COEFF_KM = 3.57  # km per sqrt(m)
RANGE_FULL_KM = 80.0
RANGE_GOOD_KM = 150.0
RANGE_MAX_KM = 250.0
RANGE_FACTOR_AT_GOOD = 0.4
LANDMARK_PREFILTER_MARGIN_KM = 25.0
LOW_ALT_M = 3000.0
EARTH_RADIUS_M = 6_371_000.0

# ---- Weather ------------------------------------------------------------------
WEATHER_TIMEOUT_S = 3
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_SOURCE = "open-meteo"
WEATHER_MAX_TIMEOUT_S = 60           # upper bound accepted for refresh_weather_cache(timeout_s=...)
WEATHER_DEADLINE_SLACK_S = 0.5       # scheduling slack tolerated after the worker finishes
WEATHER_MAX_BYTES = 2_000_000        # response size cap (expected payload is ~10 kB)
WEATHER_GRID_MATCH_KM = 15.0         # returned grid-cell centre must lie this close to the requested point
ASSUMED_CLOUD: dict[str, float] = {"low": 40.0, "mid": 40.0, "high": 40.0}
WEATHER_MAX_GAP_H = 3.0          # nearest forecast hour further than this -> assumed cloud
# INTERPRETATION: "mid + high" cover is combined assuming random overlap of the
# two layers: 1 - (1 - mid)(1 - high). Alternatives: "max" (full overlap) or
# "sum" (no overlap, capped at 100).
CLOUD_LAYER_COMBINE = "random_overlap"
CLOUD_THRESHOLDS: dict[str, float] = {
    "clear_below": 30.0, "suppress_above": 60.0, "partial_factor": 0.6,
    "sea_of_clouds_low_above": 60.0, "sky_low_alt_factor": 0.6,
}

# ---- Scoring, selection and uncertainty ---------------------------------------
MIN_SCORE = 0.4
MAX_MOMENTS = 2
MAX_WAKES_PER_SEAT = 1
MERGE_GAP_MIN = 20.0
MC_RUNS = 20
MC_SEED = 524
MC_TIME_JITTER_MIN = 7.0
MC_LATERAL_KM = 30.0
# Performance: in perturbed runs, sky bodies are only recomputed where the
# nominal altitude is within this margin of a threshold band (±7 min jitter and
# ±30 km shift move altitudes by < ~2.5 deg). Elsewhere nominal values are reused;
# they are far from every threshold, so all visibility decisions are unchanged.
MC_SKY_ALT_MARGIN_DEG = 5.0
CONF_HIGH_PRESENCE = 0.9
CONF_MEDIUM_PRESENCE = 0.7
CONF_HIGH_MAX_SPREAD_MIN = 15.0  # INTERPRETATION: spread of predicted PEAK times (P90-P10), not window length
WINDOW_START_PERCENTILE = 10
WINDOW_END_PERCENTILE = 90
CONFIDENCE_LEVELS = ("LOW", "MEDIUM", "HIGH")

# ---- Seats --------------------------------------------------------------------
SEAT_MAP: dict[str, str] = {"A": "LEFT_WINDOW", "D": "CENTRE", "G": "CENTRE", "K": "RIGHT_WINDOW"}  # TODO(team): confirm CX524 aircraft type/layout
WING_OBSTRUCTED_ROWS: list[int] = []   # business rows sit forward of the wing
# TODO(team): Ms. Chen sits in 11D, a centre seat (NO_WINDOW). Proposed demo change: move her to 11K.
DEFAULT_SEAT_PREFS: dict[str, dict[str, Any]] = {
    "11A": {"window_moments": "OPT_IN"}, "11D": {"dnd": True}, "12K": {}, "14G": {}, "14K": {},
}
WAKE_LEAD_MIN = 10
CREW_BUSY_BEFORE_TD_MIN = 30
SHADES_OPEN_BEFORE_TD_MIN = 20

# ---- Caching, debug, output ----------------------------------------------------
RESULT_CACHE_SIZE = 32
SINGLE_FLIGHT_WAIT_S = 30.0   # a waiter re-checks after this long (and takes over if the leader failed)
DEBUG_SAMPLE_EVERY_MIN = 2
ESTIMATES_NOTE = "Times are estimates (±5–10 min)."
FALLBACK_SNAPSHOT_DELAYS = (0, 40)

# ---- Files (resolved relative to this file, never the working directory) -----
DATA_DIR = Path(__file__).resolve().parent / "data"
TRACK_CSV_PATH = DATA_DIR / "cx524_track.csv"
TRACK_META_PATH = DATA_DIR / "cx524_track.meta.json"
LANDMARKS_PATH = DATA_DIR / "landmarks.json"
WEATHER_CACHE_PATH = DATA_DIR / "cached_weather.json"
FALLBACK_PATH = DATA_DIR / "fallback_window_moments.json"

_GEOD = Geodesic.WGS84
_INV_MASK = Geodesic.DISTANCE | Geodesic.AZIMUTH
_UTC = timezone.utc
_EPHEM_UNIX_EPOCH = 25567.5  # ephem Dublin Julian Date of 1970-01-01 00:00 UTC
_SEAT_RE = re.compile(r"^\s*(\d{1,3})([A-Z])\s*$")


# =============================================================================
# Generic helpers
# =============================================================================

def _json_safe(obj: Any) -> Any:
    """Recursively convert to native JSON types (no numpy, no NaN/inf, no datetimes)."""
    if obj is None or isinstance(obj, (str, bool)):
        return obj
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        v = float(obj)
        return v if math.isfinite(v) else None
    if isinstance(obj, datetime):
        return _iso_utc(obj)
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Path):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, np.ndarray)):
        seq = obj.tolist() if isinstance(obj, np.ndarray) else list(obj)
        return [_json_safe(v) for v in seq]
    if isinstance(obj, (set, frozenset)):
        items = [_json_safe(v) for v in obj]
        try:
            return sorted(items)
        except TypeError:
            return sorted(items, key=lambda v: json.dumps(v, sort_keys=True))
    # Outside the documented input domain (JSON values, date/datetime, numpy scalars):
    # never stringify arbitrary objects (they may carry private state) - drop to null.
    return None


def _strict_json(fn: Callable[..., dict]) -> Callable[..., dict]:
    """Public-boundary decorator: every application-level result is native, strict JSON
    (``json.dumps(result, allow_nan=False)`` always succeeds). Dates become ISO strings,
    NaN/inf become null, unknown objects become null. Signature/docstring are preserved."""
    @functools.wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> dict:
        out = fn(*args, **kwargs)
        try:
            return _json_safe(out)
        except Exception as exc:  # e.g. cyclic input graphs (outside the documented input domain)
            return {"schema_version": None, "degraded": True,
                    "error": f"Result not JSON-serialisable ({type(exc).__name__})"}
    return wrapper


def _r1(x: float | None) -> float | None:
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 1)


def _r2(x: float | None) -> float | None:
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 2)


def _km(x_km: float | None) -> int | None:
    return None if x_km is None or not math.isfinite(float(x_km)) else int(round(float(x_km)))


def _tz(offset_h: int) -> timezone:
    return timezone(timedelta(hours=offset_h))


def _iso_utc(dt: datetime) -> str:
    return dt.astimezone(_UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _tz_label(offset_h: int) -> str:
    return TZ_LABELS.get(offset_h, f"UTC{offset_h:+d}")


def _display(dt: datetime, offset_h: int) -> str:
    return f"{dt.astimezone(_tz(offset_h)).strftime('%H:%M')} {_tz_label(offset_h)}"


def _time_obj(dt: datetime, offset_h: int) -> dict[str, str]:
    return {"utc": _iso_utc(dt), "display": _display(dt, offset_h)}


def _round_minute(dt: datetime) -> datetime:
    return (dt + timedelta(seconds=30)).replace(second=0, microsecond=0)


def _from_epoch(ts: float) -> datetime:
    return datetime.fromtimestamp(float(ts), tz=_UTC)


def _parse_iso_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip()[:10]) if len(value.strip()) == 10 else None
        except ValueError:
            return None
    return None


def _parse_utc(value: Any) -> datetime | None:
    """Parse an ISO 8601 timestamp; naive values are taken as UTC."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=_UTC)
    if not isinstance(value, str) or not value.strip():
        return None
    s = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=_UTC)


def _file_sig(path: Path) -> tuple[Any, ...]:
    try:
        st = path.stat()
        return (str(path), st.st_mtime_ns, st.st_size)
    except OSError:
        return (str(path), None, None)


def _read_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    """Write ``data`` to ``path`` atomically.

    Each writer uses its OWN unique temp file in the destination directory
    (``tempfile.mkstemp``), flushes + fsyncs and CLOSES it, then ``os.replace``s it
    over the target. Readers therefore only ever see a complete old or complete new
    file. Concurrent writers (threads or separate server processes): last completed
    writer wins; no lock is taken. On any failure the temp file is removed and the
    previous file is left untouched. Windows: os.replace can fail with PermissionError
    if another process holds the target open without FILE_SHARE_DELETE; the error is
    raised to the caller (public helpers turn it into an error result).
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.chmod(tmp, 0o644)  # mkstemp creates 0600; data files are shared team artefacts
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _write_json_atomic(path: Path, payload: Any) -> None:
    _atomic_write_bytes(path, (json.dumps(payload, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))


def _normalize_flight(flight_number: Any) -> str:
    return re.sub(r"\s+", "", flight_number).upper() if isinstance(flight_number, str) else ""


def _normalize_delay(delay_minutes: Any) -> int:
    """Clamp to 0..MAX_DELAY_MIN; non-integers, bools and negatives become 0."""
    if isinstance(delay_minutes, bool):
        return 0
    if isinstance(delay_minutes, (int, np.integer)):
        v = int(delay_minutes)
    elif isinstance(delay_minutes, (float, np.floating)) and math.isfinite(float(delay_minutes)) \
            and float(delay_minutes).is_integer():
        v = int(delay_minutes)
    else:
        return 0
    return 0 if v < 0 else min(v, MAX_DELAY_MIN)


# =============================================================================
# Shared schedule
# =============================================================================

@dataclass(frozen=True)
class _Sched:
    flight: str
    origin: str
    dest: str
    dep_tz: int
    arr_tz: int
    delay: int
    departure_date: date           # scheduled local departure date (trip identity)
    sched_gate_dep: datetime
    sched_gate_arr: datetime
    gate_dep: datetime
    takeoff: datetime
    touchdown: datetime
    gate_arr: datetime

    @property
    def runway_minutes(self) -> float:
        return (self.touchdown - self.takeoff).total_seconds() / 60.0

    @property
    def midpoint(self) -> datetime:
        return self.takeoff + (self.touchdown - self.takeoff) / 2

    def zone_for(self, dt: datetime) -> int:
        """Display zone: origin zone before the flight midpoint, destination after."""
        return self.dep_tz if dt < self.midpoint else self.arr_tz


def _schedule_core(flight_number: Any, delay_minutes: Any = 0,
                   demo_date: Any = None) -> tuple[_Sched | None, str | None]:
    flight = _normalize_flight(flight_number)
    cfg = SCHEDULES.get(flight)
    if cfg is None:
        return None, f"Flight {flight or '?'} is not supported by this prototype"
    dd = _parse_iso_date(DEMO_DATE if demo_date is None else demo_date)
    if dd is None:
        return None, "Invalid demo_date (expected YYYY-MM-DD)"
    delay = _normalize_delay(delay_minutes)
    dep_h, dep_m = (int(x) for x in cfg["dep_local"].split(":"))
    arr_h, arr_m = (int(x) for x in cfg["arr_local"].split(":"))
    dep_local = datetime(dd.year, dd.month, dd.day, dep_h, dep_m, tzinfo=_tz(cfg["dep_tz"]))
    sched_dep = dep_local.astimezone(_UTC)
    arr_local = datetime(dd.year, dd.month, dd.day, arr_h, arr_m, tzinfo=_tz(cfg["arr_tz"]))
    sched_arr = arr_local.astimezone(_UTC)
    while sched_arr <= sched_dep:          # overnight arrivals land on a later local date
        sched_arr += timedelta(days=1)
    recovery = min(RECOVERY_MIN, delay)
    gate_dep = sched_dep + timedelta(minutes=delay)
    gate_arr = sched_arr + timedelta(minutes=delay - recovery)
    takeoff = gate_dep + timedelta(minutes=TAXI_OUT_MIN)
    touchdown = gate_arr - timedelta(minutes=TAXI_IN_MIN)
    if touchdown <= takeoff:
        return None, "Schedule constants give a non-positive flight time"
    return _Sched(flight, cfg["origin"], cfg["dest"], cfg["dep_tz"], cfg["arr_tz"], delay, dd,
                  sched_dep, sched_arr, gate_dep, takeoff, touchdown, gate_arr), None


def _schedule_dict(s: _Sched) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSIONS["schedule"],
        "supported": True,
        "flight": s.flight,
        "origin": s.origin,
        "dest": s.dest,
        "departure_date": s.departure_date.isoformat(),
        "delay_minutes": s.delay,
        "gate_departure": _time_obj(s.gate_dep, s.dep_tz),
        "takeoff": _time_obj(s.takeoff, s.dep_tz),
        "touchdown": _time_obj(s.touchdown, s.arr_tz),
        "gate_arrival": _time_obj(s.gate_arr, s.arr_tz),
        "block_minutes": int(round((s.gate_arr - s.gate_dep).total_seconds() / 60)),
        "runway_minutes": int(round(s.runway_minutes)),
        "scheduled": {"departure": _time_obj(s.sched_gate_dep, s.dep_tz),
                      "arrival": _time_obj(s.sched_gate_arr, s.arr_tz)},
        "estimated": {"departure": _time_obj(s.gate_dep, s.dep_tz),
                      "arrival": _time_obj(s.gate_arr, s.arr_tz)},
        "times_are_estimates": True,
    }


@_strict_json
def get_flight_schedule(flight_number: str, delay_minutes: int = 0,
                        demo_date: str | None = None) -> dict:
    """Single source of truth for gate and runway times.

    Inputs: flight number (e.g. "CX524"), delay in minutes (clamped to 0..600;
    non-integers/negatives treated as 0), optional local departure date
    "YYYY-MM-DD" (default DEMO_DATE).
    Output: dict with gate_departure, takeoff, touchdown, gate_arrival (each
    ``{"utc", "display"}``), block_minutes, scheduled/estimated departure and
    arrival, ``times_are_estimates: true``.
    Failure: unknown flight or bad date -> ``{"supported": false, "reason"}``;
    unexpected errors -> same shape with ``degraded: true``. Never raises.
    """
    try:
        s, err = _schedule_core(flight_number, delay_minutes, demo_date)
        if s is None:
            return {"schema_version": SCHEMA_VERSIONS["schedule"], "supported": False,
                    "flight": _normalize_flight(flight_number), "reason": err}
        return _schedule_dict(s)
    except Exception as exc:  # pragma: no cover - defensive
        return {"schema_version": SCHEMA_VERSIONS["schedule"], "supported": False,
                "reason": "Schedule unavailable", "degraded": True, "error": type(exc).__name__}


# =============================================================================
# Function 1: Assistance memory
# =============================================================================

def _canon_segments(segs: Any) -> list[str]:
    if not isinstance(segs, (list, tuple)):
        return []
    seen = {s for s in segs if isinstance(s, str) and s in ASSIST_SEGMENTS}
    return [s for s in ASSIST_SEGMENTS if s in seen]


def _enum(value: Any, allowed: Any) -> Any:
    """Return value if it is a str member of ``allowed`` (safe for unhashable junk), else None."""
    return value if isinstance(value, str) and value in allowed else None


def _norm_need(raw: Any) -> dict[str, Any] | None:
    """Defensive read of a stored need. Unknown/invalid level -> treated as no need."""
    if not isinstance(raw, dict) or _enum(raw.get("level"), ASSIST_LEVELS) is None:
        return None
    dtype = _enum(raw.get("duration_type"), ASSIST_DURATION_TYPES) or "LASTING"
    until = _parse_iso_date(raw.get("temporary_until"))
    segs = _canon_segments(raw.get("segments")) or list(ASSIST_SEGMENTS)
    comm_raw = raw.get("communication")
    comm_raw = comm_raw if isinstance(comm_raw, (list, tuple)) else []
    comms = [c for c in COMMUNICATION_CODES if c in comm_raw]
    return {
        "level": raw["level"],
        "duration_type": dtype,
        "temporary_until": until.isoformat() if (until and dtype == "TEMPORARY") else None,
        "segments": segs,
        "communication": comms,
        "own_device": raw.get("own_device"),
        "updated_on": _parse_iso_date(raw.get("updated_on")).isoformat()
        if _parse_iso_date(raw.get("updated_on")) else None,
    }


def _norm_assistance(block: Any) -> dict[str, Any]:
    """Defensive read. Consent is checked FIRST: under DONT_REMEMBER the stored need and
    history are never parsed or reused (only their presence is noted for the audit code),
    so malformed residual memory cannot affect offers, fresh confirmations, FORGET or
    current-trip service. Current-trip requests are read independently of memory."""
    b = block if isinstance(block, dict) else {}
    consent = _enum(b.get("consent"), CONSENT_LEVELS) or DEFAULT_CONSENT
    raw_hist = b.get("history")
    requests_ = {k: copy.deepcopy(v) for k, v in b.get("requests", {}).items()
                 if isinstance(k, str) and isinstance(v, dict)} if isinstance(b.get("requests"), dict) else {}
    if consent == "DONT_REMEMBER":
        residual = b.get("need") is not None or (isinstance(raw_hist, list) and len(raw_hist) > 0)
        return {"consent": consent, "need": None, "history": [], "requests": requests_, "residual": residual}
    history = [copy.deepcopy(h) for h in raw_hist if isinstance(h, dict)] if isinstance(raw_hist, list) else []
    return {"consent": consent, "need": _norm_need(b.get("need")), "history": history, "requests": requests_,
            "residual": False}


def _usable_history(history: list[dict], today: date) -> list[tuple[date, dict]]:
    out = []
    for h in history:
        d = _parse_iso_date(h.get("date"))
        if d is not None and d <= today:
            out.append((d, h))
    out.sort(key=lambda x: x[0])
    return out


def _request_key(flight: str, departure_date: date) -> str:
    return f"{flight}|{departure_date.isoformat()}"


def _parse_today(today: Any, origin_tz: int) -> tuple[datetime | None, date | None]:
    """Return (instant, local date at origin) for `today` (default DEMO_TODAY)."""
    raw = DEMO_TODAY if today is None else today
    if isinstance(raw, datetime):
        dt = raw if raw.tzinfo else raw.replace(tzinfo=_tz(origin_tz))
    elif isinstance(raw, date):
        h, m = (int(x) for x in ASSIST_DATE_ONLY_TODAY_LOCAL_TIME.split(":"))
        dt = datetime(raw.year, raw.month, raw.day, h, m, tzinfo=_tz(origin_tz))
    elif isinstance(raw, str):
        d = _parse_iso_date(raw)
        if d is not None:
            h, m = (int(x) for x in ASSIST_DATE_ONLY_TODAY_LOCAL_TIME.split(":"))
            dt = datetime(d.year, d.month, d.day, h, m, tzinfo=_tz(origin_tz))
        else:
            try:
                dt = datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
            except ValueError:
                return None, None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_tz(origin_tz))
    else:
        return None, None
    return dt, dt.astimezone(_tz(origin_tz)).date()


def _deadline_info(s: _Sched, today_dt: datetime) -> dict[str, Any]:
    """Deadlines are based on SCHEDULED gate departure (demo assumption, see constants)."""
    deadline = s.sched_gate_dep - timedelta(hours=ASSIST_REQUEST_DEADLINE_HOURS)
    reminder = s.sched_gate_dep - timedelta(hours=ASSIST_REMINDER_HOURS)
    def with_date(dt: datetime) -> dict[str, str]:   # deadlines are days away, so the display carries the date
        local = dt.astimezone(_tz(s.dep_tz))
        return {"utc": _iso_utc(dt), "display": f"{_short_date(local.date())} {_display(dt, s.dep_tz)}"}
    return {"deadline": with_date(deadline), "reminder_at": with_date(reminder), "is_late": today_dt > deadline}


def _audit(code: str, seat: str, flight: str, detail: str) -> dict[str, str]:
    return {"event": code, "seat": seat, "flight": flight, "detail": detail}


def _persona_seat(persona: Any) -> str:
    seat = persona.get("seat") if isinstance(persona, dict) else None
    return seat if isinstance(seat, str) else ""


def _decide(a: dict[str, Any], key: str, dep_date: date, today: date,
            ignore_requests: bool = False) -> dict[str, Any]:
    """Prompt decision table (spec §6.4). First match wins."""
    req = None if ignore_requests else a["requests"].get(key)
    if req and req.get("status") == "CONFIRMED":
        return {"mode": "CONFIRMED", "rule": 1, "preselect": None, "stale": False, "codes": []}
    if req and req.get("status") == "DECLINED_THIS_TRIP":
        return {"mode": "DECLINED", "rule": 2, "preselect": None, "stale": False, "codes": []}
    if a["consent"] == "DONT_REMEMBER":
        has_old = bool(a.get("residual"))
        return {"mode": "OFFER", "rule": 3, "preselect": None, "stale": False,
                "codes": ["CONSENT_DONT_REMEMBER_HISTORY_IGNORED"] if has_old else []}
    need = a["need"]
    if need is None:
        return {"mode": "OFFER", "rule": 4, "preselect": None, "stale": False, "codes": []}
    if need.get("own_device") not in (None, "", False):
        return {"mode": "CONTACT_CATHAY", "rule": 5, "preselect": None, "stale": False, "codes": []}
    if need["duration_type"] == "TEMPORARY":
        until = _parse_iso_date(need["temporary_until"])
        if until is not None:
            if until >= dep_date:
                return {"mode": "CONFIRM_SAME", "rule": 6, "preselect": "YES_SAME", "stale": False,
                        "codes": ["TEMP_NEED_STILL_ACTIVE", "NOT_AUTO_SUBMITTED"]}
            return {"mode": "CONFIRM_STILL_NEEDED", "rule": 7, "preselect": None, "stale": False,
                    "codes": ["TEMP_NEED_EXPIRED_ASKED_FRESH", "NOT_AUTO_SUBMITTED"]}
        # No end date. INTERPRETATION (resolution B): recent usable history within
        # the recheck interval -> CONFIRM_SAME (still explicit); otherwise ask fresh.
        hist = _usable_history(a["history"], today)
        if hist and (today - hist[-1][0]).days <= TEMP_NO_END_DATE_RECHECK_DAYS:
            return {"mode": "CONFIRM_SAME", "rule": 6, "preselect": "YES_SAME", "stale": False,
                    "codes": ["TEMP_NEED_STILL_ACTIVE", "NOT_AUTO_SUBMITTED"]}
        return {"mode": "CONFIRM_STILL_NEEDED", "rule": 7, "preselect": None, "stale": False,
                "codes": ["TEMP_NEED_EXPIRED_ASKED_FRESH", "NOT_AUTO_SUBMITTED"]}
    updated = _parse_iso_date(need["updated_on"])
    # INTERPRETATION: an unknown updated_on is treated as stale (ask to check).
    stale = updated is None or (today - updated).days > LASTING_RECHECK_DAYS
    return {"mode": "CONFIRM_SAME", "rule": 8 if stale else 9, "preselect": "YES_SAME", "stale": stale,
            "codes": ["LASTING_NEED_PREFILLED", "NOT_AUTO_SUBMITTED"]}


_CODE_DETAILS: dict[str, str] = {
    "NOT_AUTO_SUBMITTED": "Prompt shown; nothing submitted without a tap",
    "LASTING_NEED_PREFILLED": "Saved preference pre-filled for one-tap confirmation",
    "TEMP_NEED_STILL_ACTIVE": "Temporary preference still in date; asked to confirm",
    "TEMP_NEED_EXPIRED_ASKED_FRESH": "Temporary preference may have ended; asked fresh",
    "TEMP_NEED_RESOLVED": "Temporary preference cleared after passenger declined",
    "LASTING_NEED_KEPT_DECLINED_THIS_TRIP": "Declined for this trip; saved preference kept",
    "CONSENT_DONT_REMEMBER_HISTORY_IGNORED": "Consent is Don't remember; past data not used",
    "ASSIST_MEMORY_ERASED": "Passenger asked Cathay to forget assistance memory",
    "ASSIST_REQUEST_LATE": "Request after the booking deadline; subject to availability",
    "ASSIST_RESPONSE_REJECTED": "Response rejected; nothing changed",
    "CREW_BRIEF_REDACTED_SERVICE_ONLY": "Crew brief limited to 'Assistance arranged'",
    "ASSIST_REQUEST_CONFIRMED": "Assistance confirmed by explicit passenger tap (simulated)",
    "ASSIST_REQUEST_DECLINED": "Assistance not requested for this trip",
    "ASSIST_NEED_UPDATED": "Saved preference updated by passenger",
}


def _events(codes: Iterable[str], seat: str, flight: str) -> list[dict[str, str]]:
    return [_audit(c, seat, flight, _CODE_DETAILS.get(c, "")) for c in codes]


def _option(opt_id: str, preselected: bool = False) -> dict[str, Any]:
    o = ASSIST_OPTIONS[opt_id]
    return {"id": opt_id, "label": o["label"], "icon": o["icon"], "preselected": preselected}


def _change_choices() -> dict[str, Any]:
    labels: dict[str, dict[str, str]] = {}
    for table in (ASSIST_LEVELS, ASSIST_SEGMENTS, ASSIST_DURATION_TYPES):
        for k, v in table.items():
            labels[k] = {"label": v["label"], "icon": v["icon"]}
    return {"levels": list(ASSIST_LEVELS), "segments": list(ASSIST_SEGMENTS),
            "duration_types": list(ASSIST_DURATION_TYPES), "labels": labels}


def _segments_text(segs: list[str]) -> str:
    return ", ".join(ASSIST_SEGMENTS[s]["short"] for s in segs)


def _short_date(d: date) -> str:
    return f"{d.day} {d.strftime('%b')}"


def _has_stored_memory(a: dict[str, Any]) -> bool:
    return a["consent"] != "DONT_REMEMBER" and (a["need"] is not None or bool(a["history"]))


def _summary(req: dict[str, Any]) -> dict[str, Any]:
    level = req.get("level")
    segs = _canon_segments(req.get("segments"))
    return {"level": level, "level_label": ASSIST_LEVELS.get(level, {}).get("label"),
            "level_icon": ASSIST_LEVELS.get(level, {}).get("icon"), "segments": segs,
            "segment_labels": [ASSIST_SEGMENTS[s]["label"] for s in segs],
            "late": req.get("late") is True, "note": req.get("note") if isinstance(req.get("note"), str) else None}


def _unavailable_prompt(flight: str, reason: str, degraded: bool = False) -> dict[str, Any]:
    out = {"schema_version": SCHEMA_VERSIONS["assist"], "flight": flight, "departure_date": None,
           "mode": "UNAVAILABLE", "icon": "wheelchair", "headline": None, "subline": None,
           "stale": False, "options": [], "change_choices": _change_choices(), "deadline": None,
           "reminder_at": None, "is_late": False, "contact_cathay": False, "summary": None,
           "reason_codes": [], "audit_events": [], "error": reason}
    if degraded:
        out["degraded"] = True
    return out


@_strict_json
def get_assistance_prompt(persona: dict, flight_number: str = "CX524", delay_minutes: int = 0,
                          today: str | None = None, *, demo_date: str | None = None) -> dict:
    """Function 1: what the app should ask this passenger about assistance.

    Inputs: persona dict (reads ``persona["assistance"]`` defensively; missing
    means no history), flight number, delay (accepted for API symmetry; trip
    identity and deadlines use the SCHEDULED departure), ``today`` (ISO date or
    datetime, default DEMO_TODAY) and optional ``demo_date`` (local departure
    date, default DEMO_DATE).
    Output: prompt dict (schema "assist-1") with mode, icon, headline, subline,
    options (pre-selection only; NOTHING is submitted), change_choices,
    deadline/reminder_at/is_late, reason_codes and audit_events.
    Failure: unsupported flight or invalid date -> mode "UNAVAILABLE" with an
    ``error``; unexpected errors also set ``degraded``. Never raises; never
    modifies ``persona``.
    """
    flight = _normalize_flight(flight_number)
    try:
        s, err = _schedule_core(flight, 0, demo_date)
        if s is None:
            return _unavailable_prompt(flight, err or "Unsupported flight")
        today_dt, today_d = _parse_today(today, s.dep_tz)
        if today_dt is None:
            return _unavailable_prompt(flight, "Invalid today (expected ISO date)")
        a = _norm_assistance(persona.get("assistance") if isinstance(persona, dict) else None)
        seat = _persona_seat(persona)
        key = _request_key(flight, s.departure_date)
        dec = _decide(a, key, s.departure_date, today_d)
        mode = dec["mode"]
        need = a["need"]
        req = a["requests"].get(key)
        stored = _has_stored_memory(a)
        hist = _usable_history(a["history"], today_d) if a["consent"] != "DONT_REMEMBER" else []
        options: list[dict[str, Any]] = []
        summary = None
        contact = False
        if mode == "CONFIRMED":
            headline, subline = "Wheelchair assistance confirmed", _segments_text(_canon_segments(req.get("segments")))
            if req.get("late") is True:
                subline = f"{subline} · {ASSIST_LATE_NOTE}"
            summary = _summary(req)
            options = [_option("CHANGE"), _option("NO")]
        elif mode == "DECLINED":
            headline, subline = "Need assistance after all?", "Not requested for this trip"
            reusable = need is not None and a["consent"] != "DONT_REMEMBER" and need.get("own_device") in (None, "", False)
            options = [_option("YES_SAME"), _option("CHANGE")] if reusable else [_option("YES_NEW")]
        elif mode == "OFFER":
            headline, subline = "Need assistance at the airport?", "Optional · one tap"
            options = [_option("YES_NEW"), _option("NO")]
        elif mode == "CONTACT_CATHAY":
            headline, subline = "Please contact Cathay about your mobility aid", "Some mobility aids need advance approval"
            contact = True
        elif mode == "CONFIRM_STILL_NEEDED":
            headline = "Last time you needed a wheelchair. Need one this trip?"
            subline = "Nothing is booked unless you choose"
            options = [_option("YES_SAME"), _option("CHANGE"), _option("NO")]
        else:  # CONFIRM_SAME
            headline = "Wheelchair for this trip?"
            segs_txt = _segments_text(need["segments"])
            if hist:
                d, h = hist[-1]
                last_flight = h.get("flight") if isinstance(h.get("flight"), str) else "last flight"
                subline = f"Same as your last trip ({last_flight}, {_short_date(d)}): {segs_txt}"
            else:
                subline = f"As you saved: {segs_txt}"
            if dec["stale"]:
                subline = f"{subline}. Please check this is still right"
            options = [_option("YES_SAME", True), _option("CHANGE"), _option("NO")]
        if stored:
            options.append(_option("FORGET"))
        dl = _deadline_info(s, today_dt)
        return {
            "schema_version": SCHEMA_VERSIONS["assist"],
            "flight": flight,
            "departure_date": s.departure_date.isoformat(),
            "request_key": key,
            "mode": mode,
            "icon": "wheelchair",
            "headline": headline,
            "subline": subline,
            "stale": bool(dec["stale"]),
            "options": options,
            "change_choices": _change_choices(),
            "deadline": dl["deadline"],
            "reminder_at": dl["reminder_at"],
            "is_late": dl["is_late"],
            "contact_cathay": contact,
            "summary": summary,
            "reason_codes": list(dec["codes"]),
            "audit_events": _events(dec["codes"], seat, flight),
            "error": None,
        }
    except Exception as exc:
        return _unavailable_prompt(flight, f"Assistance prompt unavailable ({type(exc).__name__})", degraded=True)


def _validate_change(response: dict[str, Any], today_d: date) -> tuple[dict[str, Any] | None, str | None]:
    level = response.get("level")
    if level not in ASSIST_LEVELS:
        return None, "Invalid or missing level"
    segs_raw = response.get("segments")
    if segs_raw is None:
        segs = list(ASSIST_SEGMENTS)
    else:
        if not isinstance(segs_raw, list) or not segs_raw or any(s not in ASSIST_SEGMENTS for s in segs_raw):
            return None, "Invalid segments"
        segs = _canon_segments(segs_raw)
    dtype = response.get("duration_type", "LASTING")
    if dtype is None:
        dtype = "LASTING"
    if dtype not in ASSIST_DURATION_TYPES:
        return None, "Invalid duration_type"
    until_raw = response.get("temporary_until")
    until = None
    if dtype == "TEMPORARY" and until_raw is not None:
        until = _parse_iso_date(until_raw)
        if until is None or until < today_d:
            return None, "Invalid temporary_until (must be an ISO date on or after today)"
    return {"level": level, "segments": segs, "duration_type": dtype,
            "temporary_until": until.isoformat() if until else None}, None


def _apply_result(assistance: Any, request: Any, events: list, error: str | None, key: str | None,
                  contact: bool = False) -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": assistance, "request": request,
            "request_key": key, "audit_events": events, "contact_cathay": contact,
            "simulated": True, "error": error}


@_strict_json
def apply_assistance_response(persona: dict, flight_number: str, response: dict,
                              today: str | None = None, *, demo_date: str | None = None) -> dict:
    """Function 1: apply an explicit one-tap answer.

    Inputs: persona dict, flight number, ``response = {"option": YES_SAME |
    YES_NEW | CHANGE | NO | FORGET, "level"?, "segments"?, "duration_type"?,
    "temporary_until"?}``, ``today`` (default DEMO_TODAY), optional
    ``demo_date``.
    Output: ``{"schema_version", "assistance": <new block>, "request": <this
    trip's request or null>, "request_key", "audit_events", "contact_cathay",
    "simulated": true, "error": null}``. The caller stores ``assistance`` back
    on its own copy of the persona (only when ``error`` is null).
    Failure: invalid input -> the UNCHANGED block (a copy), ``error`` set and an
    ``ASSIST_RESPONSE_REJECTED`` event. Never raises; never modifies inputs.
    Consent is enforced here too: DONT_REMEMBER never reuses or stores memory.
    """
    flight = _normalize_flight(flight_number)
    seat = _persona_seat(persona)
    try:  # JSON-safe deep copy at the input boundary (dates -> ISO strings, NaN -> null)
        original = _json_safe(persona.get("assistance")) if isinstance(persona, dict) else None
    except Exception:
        original = None

    def reject(msg: str, contact: bool = False, key: str | None = None) -> dict[str, Any]:
        cur = None
        if key and isinstance(original, dict) and isinstance(original.get("requests"), dict):
            cur = copy.deepcopy(original["requests"].get(key))
        return _apply_result(original, cur, _events(["ASSIST_RESPONSE_REJECTED"], seat, flight), msg, key, contact)

    try:
        if not isinstance(persona, dict):
            return reject("Invalid persona")
        s, err = _schedule_core(flight, 0, demo_date)
        if s is None:
            return reject(err or "Unsupported flight")
        key = _request_key(flight, s.departure_date)
        today_dt, today_d = _parse_today(today, s.dep_tz)
        if today_dt is None:
            return reject("Invalid today (expected ISO date)", key=key)
        if not isinstance(response, dict) or response.get("option") not in ASSIST_OPTIONS:
            return reject("Unknown option", key=key)
        option = response["option"]
        a = _norm_assistance(original)
        new_block = copy.deepcopy(original) if isinstance(original, dict) else {}
        late = _deadline_info(s, today_dt)["is_late"]
        existing = a["requests"].get(key)
        events: list[str] = []
        need_out = a["need"]
        consent_out = a["consent"]
        history_out = a["history"]
        requests_out = dict(a["requests"])
        request: dict[str, Any] | None = copy.deepcopy(existing)

        def confirmed(level: str, segs: list[str]) -> dict[str, Any]:
            if existing and existing.get("status") == "CONFIRMED" and existing.get("level") == level \
                    and _canon_segments(existing.get("segments")) == segs:
                return copy.deepcopy(existing)                      # idempotent: keep the original record
            r = {"status": "CONFIRMED", "level": level, "segments": segs,
                 "confirmed_on": today_d.isoformat(), "late": bool(late), "simulated": True}
            if late:
                r["note"] = ASSIST_LATE_NOTE
            return r

        if option == "YES_SAME":
            if a["consent"] == "DONT_REMEMBER" or a["need"] is None:
                return reject("No saved preference to reuse", key=key)
            if a["need"].get("own_device") not in (None, "", False):
                return reject("Please contact Cathay about your mobility aid", contact=True, key=key)
            request = confirmed(a["need"]["level"], list(a["need"]["segments"]))
            events.append("ASSIST_REQUEST_CONFIRMED")
        elif option in ("YES_NEW", "CHANGE"):
            if a["consent"] != "DONT_REMEMBER" and a["need"] is not None \
                    and a["need"].get("own_device") not in (None, "", False):
                return reject("Please contact Cathay about your mobility aid", contact=True, key=key)
            vals, verr = _validate_change(response, today_d)
            if vals is None:
                return reject(verr or "Invalid response", key=key)
            request = confirmed(vals["level"], vals["segments"])
            events.append("ASSIST_REQUEST_CONFIRMED")
            if a["consent"] != "DONT_REMEMBER":
                prev = a["need"] or {}
                need_out = {"level": vals["level"], "duration_type": vals["duration_type"],
                            "temporary_until": vals["temporary_until"], "segments": vals["segments"],
                            "communication": list(prev.get("communication") or []),
                            "own_device": prev.get("own_device"), "updated_on": today_d.isoformat()}
                events.append("ASSIST_NEED_UPDATED")
            else:
                events.append("CONSENT_DONT_REMEMBER_HISTORY_IGNORED")
        elif option == "NO":
            under = _decide(a, key, s.departure_date, today_d, ignore_requests=True)
            request = {"status": "DECLINED_THIS_TRIP", "declined_on": today_d.isoformat(), "simulated": True}
            events.append("ASSIST_REQUEST_DECLINED")
            if under["mode"] == "CONFIRM_STILL_NEEDED":
                need_out = None
                events.append("TEMP_NEED_RESOLVED")
            elif a["consent"] != "DONT_REMEMBER" and a["need"] is not None \
                    and a["need"]["duration_type"] == "LASTING":
                events.append("LASTING_NEED_KEPT_DECLINED_THIS_TRIP")
        else:  # FORGET
            consent_out, need_out, history_out = "DONT_REMEMBER", None, []
            requests_out = {key: copy.deepcopy(existing)} if existing else {}
            request = copy.deepcopy(existing)
            events.append("ASSIST_MEMORY_ERASED")

        if option != "FORGET":
            requests_out[key] = request
        if request and request.get("status") == "CONFIRMED" and request.get("late"):
            events.append("ASSIST_REQUEST_LATE")
        new_block["consent"] = consent_out
        if consent_out == "DONT_REMEMBER" and option != "FORGET":
            # Consent enforcement: nothing new is stored; residual fields are left untouched (never read).
            new_block["need"] = copy.deepcopy(original.get("need")) if isinstance(original, dict) else None
            new_block["history"] = copy.deepcopy(original.get("history", [])) if isinstance(original, dict) else []
        else:
            new_block["need"] = need_out
            new_block["history"] = history_out
        new_block["requests"] = requests_out
        return _apply_result(new_block, copy.deepcopy(request), _events(events, seat, flight), None, key)
    except Exception as exc:
        return _apply_result(original, None, _events(["ASSIST_RESPONSE_REJECTED"], seat, flight),
                             f"Assistance response unavailable ({type(exc).__name__})", None)


@_strict_json
def record_flown_segment(assistance: dict, flight: str, date: str) -> dict:  # noqa: A002 - spec name
    """Append a flown trip to assistance history (post-flight; outside the demo).

    Inputs: an assistance block, flight number, local departure date (ISO).
    Output: ``{"schema_version", "assistance": <new block>, "recorded": bool,
    "reason", "audit_events", "error"}``. History is written only when consent
    is not DONT_REMEMBER and this trip has a CONFIRMED request; duplicates are
    ignored. Never raises; never modifies the input.
    """
    try:
        block = copy.deepcopy(assistance) if isinstance(assistance, dict) else {}
        fl = _normalize_flight(flight)
        d = _parse_iso_date(date)
        if not fl or d is None:
            return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": block, "recorded": False,
                    "reason": "Invalid flight or date", "audit_events": [], "error": "Invalid flight or date"}
        a = _norm_assistance(block)
        if a["consent"] == "DONT_REMEMBER":
            return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": block, "recorded": False,
                    "reason": "Consent is Don't remember", "audit_events":
                        _events(["CONSENT_DONT_REMEMBER_HISTORY_IGNORED"], "", fl), "error": None}
        req = a["requests"].get(_request_key(fl, d))
        if not req or req.get("status") != "CONFIRMED":
            return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": block, "recorded": False,
                    "reason": "No confirmed assistance for this trip", "audit_events": [], "error": None}
        entry = {"flight": fl, "date": d.isoformat(), "level": req.get("level"),
                 "segments": _canon_segments(req.get("segments"))}
        history = a["history"]
        if any(h.get("flight") == fl and h.get("date") == d.isoformat() for h in history):
            return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": block, "recorded": False,
                    "reason": "Already recorded", "audit_events": [], "error": None}
        block["history"] = history + [entry]
        return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": block, "recorded": True,
                "reason": None, "audit_events": [], "error": None}
    except Exception as exc:
        return {"schema_version": SCHEMA_VERSIONS["assist"], "assistance": copy.deepcopy(assistance),
                "recorded": False, "reason": None, "audit_events": [], "error": type(exc).__name__}


@_strict_json
def build_assistance_service_plan(persona: dict, flight_number: str = "CX524", delay_minutes: int = 0,
                                  *, demo_date: str | None = None) -> dict:
    """Function 1: confirmed service legs (delay-shifted) and consent-filtered briefs.

    Inputs: persona dict (current state, AFTER any applied response), flight
    number, delay minutes, optional ``demo_date``.
    Output: with a CONFIRMED request for this trip -> ``active: true`` plus
    ``legs`` (segment, label, icon, time, owner, status CONFIRMED/UPDATED,
    original_time when delayed), ``delay_note``, ``ground_brief`` and
    ``crew_brief`` (full instructions only under CREW consent; otherwise just
    "Assistance arranged"). All records are SIMULATED (``simulated: true``) and
    all times are estimates. Without a confirmed request -> ``active: false``.
    Failure: ``active: false`` with ``error`` (and ``degraded`` for unexpected
    errors). Never raises; never modifies ``persona``.
    """
    flight = _normalize_flight(flight_number)
    base = {"schema_version": SCHEMA_VERSIONS["assist"], "flight": flight, "active": False,
            "simulated": True, "simulation_note": ASSIST_SIMULATION_NOTE, "times_are_estimates": True,
            "legs": [], "delay_note": None, "ground_brief": None, "crew_brief": None,
            "audit_events": [], "error": None}
    try:
        s0, err = _schedule_core(flight, 0, demo_date)
        s, _ = _schedule_core(flight, delay_minutes, demo_date)
        if s0 is None or s is None:
            return {**base, "error": err or "Unsupported flight"}
        key = _request_key(flight, s0.departure_date)
        base.update({"departure_date": s0.departure_date.isoformat(), "request_key": key,
                     "delay_minutes": s.delay})
        a = _norm_assistance(persona.get("assistance") if isinstance(persona, dict) else None)
        req = a["requests"].get(key)
        if not req or req.get("status") != "CONFIRMED":
            return {**base, "reason": "No confirmed assistance for this trip"}
        seat = _persona_seat(persona)
        segs = _canon_segments(req.get("segments")) or list(ASSIST_SEGMENTS)
        level = req.get("level")
        delayed = s.delay > 0

        def leg_time(sched: _Sched, seg: str) -> tuple[datetime, int]:
            if seg == "CHECKIN_TO_GATE":
                return sched.gate_dep - timedelta(minutes=ASSIST_CHECKIN_LEAD_MIN), sched.dep_tz
            if seg == "BOARDING":
                return sched.gate_dep - timedelta(minutes=PREBOARD_LEAD_MIN), sched.dep_tz
            return sched.gate_arr, sched.arr_tz

        legs = []
        for seg in segs:
            t, tz = leg_time(s, seg)
            leg = {"segment": seg, **{k: SERVICE_LEGS[seg][k] for k in ("label", "icon", "owner")},
                   "time": _time_obj(t, tz), "status": "UPDATED" if delayed else "CONFIRMED", "simulated": True}
            if delayed:
                t0, tz0 = leg_time(s0, seg)
                leg["original_time"] = _time_obj(t0, tz0)
            legs.append(leg)
        delay_note = None
        if delayed:
            delay_note = (f"Arrival assistance notified of new time {_display(s.gate_arr, s.arr_tz)}"
                          if "ARRIVAL_TO_EXIT" in segs else "Assistance times updated for the delay")
        level_line = CREW_INSTRUCTIONS.get(level, CREW_INSTRUCTIONS["ASSIST_ARRANGED"])
        ground_brief = {"lines": [dict(level_line)], "segments": segs,
                        "segment_labels": [ASSIST_SEGMENTS[x]["label"] for x in segs]}
        events: list[str] = []
        if a["consent"] == "CREW":
            lines = [dict(level_line)]
            need = a["need"]
            for c in (need or {}).get("communication", []):
                lines.append(dict(CREW_INSTRUCTIONS[c]))
            crew_brief = {"redacted": False, "lines": lines}
        else:  # SERVICE_ONLY and DONT_REMEMBER: service delivered, crew sees no detail
            crew_brief = {"redacted": True, "lines": [dict(CREW_INSTRUCTIONS["ASSIST_ARRANGED"])]}
            events.append("CREW_BRIEF_REDACTED_SERVICE_ONLY")
        return {**base, "active": True, "legs": legs, "delay_note": delay_note,
                "late": bool(req.get("late")), "note": req.get("note"),
                "ground_brief": ground_brief, "crew_brief": crew_brief,
                "audit_events": _events(events, seat, flight)}
    except Exception as exc:
        return {**base, "degraded": True, "error": f"Service plan unavailable ({type(exc).__name__})"}


def _build_demo_personas() -> dict[str, dict[str, Any]]:
    mathur_assist: dict[str, Any] = {}
    if MATHUR_ASSIST_FIXTURE_ENABLED:
        mathur_assist = {  # expired temporary need from last trip; no reason stored
            "consent": "CREW",
            "need": {"level": "WCHS", "duration_type": "TEMPORARY", "temporary_until": "2026-05-15",
                     "segments": list(ASSIST_SEGMENTS), "communication": [], "own_device": None,
                     "updated_on": "2026-04-28"},
            "history": [{"flight": "CX524", "date": "2026-04-28", "level": "WCHS",
                         "segments": list(ASSIST_SEGMENTS)}],
            "requests": {},
        }
    return {
        "11A": {"seat": "11A", "name": "Mr. R. Mathur", "tier": "Diamond", "assistance": mathur_assist},
        "12K": {"seat": "12K", "name": "Mrs. S. Kapoor", "tier": "Gold", "assistance": {
            "consent": "CREW",
            "need": {"level": "WCHR", "duration_type": "LASTING", "temporary_until": None,
                     "segments": list(ASSIST_SEGMENTS), "communication": ["DEAF"], "own_device": None,
                     "updated_on": "2026-03-02"},
            "history": [{"flight": "CX524", "date": "2026-03-02", "level": "WCHR",
                         "segments": ["CHECKIN_TO_GATE", "ARRIVAL_TO_EXIT"]}],
            "requests": {},
        }},
        "14G": {"seat": "14G", "name": "The Lee family", "tier": None, "assistance": {
            "consent": "DONT_REMEMBER", "need": None, "history": [], "requests": {}}},
        "14K": {"seat": "14K", "name": "The Lee family", "tier": None, "assistance": {
            "consent": "DONT_REMEMBER", "need": None, "history": [], "requests": {}}},
        "11D": {"seat": "11D", "name": "Ms. L. Chen", "tier": "Gold"},
    }


#: Assistance fixtures for initial_state.json (copy them; never mutate in place).
DEMO_PERSONAS: dict[str, dict[str, Any]] = _build_demo_personas()


def get_demo_personas() -> dict:
    """Return a fresh deep copy of the pristine demo assistance fixtures. Never raises."""
    return _build_demo_personas()


@_strict_json
def get_offline_terminal_maps(delay_minutes: int = 0, *, persona: dict | None = None) -> dict:
    """DEPRECATED compatibility shim for the original playbook name. No maps.

    Returns ``build_assistance_service_plan(<12K fixture>, "CX524", delay)`` plus
    ``deprecated: true``. Uses the PRISTINE 12K fixture (which has no confirmed
    request, so ``active`` is false) unless the caller passes the current
    ``persona`` state. Never raises.
    """
    try:
        p = persona if isinstance(persona, dict) else _build_demo_personas()["12K"]
        out = build_assistance_service_plan(p, "CX524", delay_minutes)
    except Exception as exc:  # pragma: no cover - defensive
        out = {"schema_version": SCHEMA_VERSIONS["assist"], "active": False, "degraded": True,
               "error": type(exc).__name__}
    out["deprecated"] = True
    out["deprecation_note"] = "Terminal maps were removed. Use build_assistance_service_plan(persona, ...)."
    return out


# =============================================================================
# Function 2: Track data
# =============================================================================

def _speed_shape(t: np.ndarray, total: float) -> np.ndarray:
    """Relative ground-speed profile: slower in climb and descent, 1.0 in cruise."""
    climb = min(CLIMB_MIN, total / 2)
    desc = min(DESCENT_MIN, total / 2)
    f = np.ones_like(t, dtype=float)
    c = t < climb
    f[c] = SYNTH_SPEED_FACTOR_AT_TAKEOFF + (1 - SYNTH_SPEED_FACTOR_AT_TAKEOFF) * t[c] / climb
    d = t > total - desc
    f[d] = 1 - (1 - SYNTH_SPEED_FACTOR_AT_TOUCHDOWN) * (t[d] - (total - desc)) / desc
    return f


def _alt_profile(t: float, total: float) -> float:
    climb = min(CLIMB_MIN, total / 2)
    desc = min(DESCENT_MIN, total / 2)
    if t < climb:
        return CRUISE_ALT_M * t / climb
    if t > total - desc:
        return CRUISE_ALT_M * max(total - t, 0.0) / desc
    return float(CRUISE_ALT_M)


def _default_runway_minutes(flight: str = "CX524") -> float:
    s, _ = _schedule_core(flight, 0, None)
    return s.runway_minutes if s else 227.0


def generate_synthetic_track(runway_minutes: float | None = None,
                             waypoints: list[tuple[float, float]] | None = None,
                             step_min: float | None = None, *, flight: str | None = None) -> list[dict]:
    """Synthetic CX524 track joined by geodesic segments.

    Inputs: takeoff-to-touchdown minutes (default: the schedule's runway time,
    so the track and schedule always agree), waypoints (default: the route of
    ``flight`` in SYNTHETIC_ROUTES; ``flight`` defaults to "CX524"), row spacing in
    minutes (default SYNTH_TRACK_STEP_MIN, read at call time).
    Output: list of rows ``{min_since_takeoff, lat, lon, alt_m, gs_kmh}``.
    Ground speed is scaled so the path is flown in exactly ``runway_minutes``.
    Failure: returns ``[]``. Never raises.
    """
    try:
        fl = _normalize_flight(flight) or "CX524"
        wps = waypoints or SYNTHETIC_ROUTES.get(fl, SYNTHETIC_WAYPOINTS)
        total = float(runway_minutes) if runway_minutes else _default_runway_minutes(fl)
        step = float(step_min) if step_min and step_min > 0 else SYNTH_TRACK_STEP_MIN
        if len(wps) < 2 or total <= 0:
            return []
        lines, cum = [], [0.0]
        for (la1, lo1), (la2, lo2) in zip(wps[:-1], wps[1:]):
            ln = _GEOD.InverseLine(la1, lo1, la2, lo2)
            lines.append(ln)
            cum.append(cum[-1] + ln.s13)
        dist_total = cum[-1]
        fine = np.arange(0.0, total + SYNTH_INTEGRATION_STEP_MIN / 2, SYNTH_INTEGRATION_STEP_MIN)
        fine[-1] = total
        shape = _speed_shape(fine, total)
        integ = np.concatenate([[0.0], np.cumsum((shape[1:] + shape[:-1]) / 2 * np.diff(fine))])
        k = dist_total / integ[-1]           # metres per minute at speed factor 1.0
        times = list(np.arange(0.0, total, step)) + [total]
        rows = []
        for t in times:
            s_along = float(np.interp(t, fine, integ)) * k
            i = min(int(np.searchsorted(cum, s_along, side="right") - 1), len(lines) - 1)
            pos = lines[i].Position(min(s_along - cum[i], lines[i].s13))
            gs = float(_speed_shape(np.array([t]), total)[0]) * k * 60 / 1000
            rows.append({"min_since_takeoff": round(float(t), 3), "lat": round(pos["lat2"], 5),
                         "lon": round(pos["lon2"], 5), "alt_m": int(round(_alt_profile(float(t), total))),
                         "gs_kmh": round(gs, 1)})
        return rows
    except Exception:
        return []


def _write_track_csv(rows: list[dict], csv_path: Path, meta_path: Path, source: str, note: str) -> None:
    """Write track CSV + sidecar, each atomically. The pair is not one atomic unit, so
    the sidecar records the CSV's sha256; a sidecar that does not match its CSV is
    ignored by the loader (provenance falls back to the CSV header comment)."""
    import io
    buf = io.StringIO(newline="")
    buf.write(f"# source: {source}\n# {note}\n")
    w = csv.DictWriter(buf, fieldnames=["min_since_takeoff", "lat", "lon", "alt_m", "gs_kmh"], lineterminator="\n")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    data = buf.getvalue().encode("utf-8")
    _atomic_write_bytes(csv_path, data)
    _write_json_atomic(meta_path, {"schema_version": SCHEMA_VERSIONS["track"], "source": source,
                                   "note": note, "rows": len(rows),
                                   "duration_min": rows[-1]["min_since_takeoff"] if rows else 0,
                                   "csv_sha256": hashlib.sha256(data).hexdigest()})


def _parse_track_bytes(csv_bytes: bytes | None, meta_bytes: bytes | None) -> tuple[list[dict] | None, str, str | None]:
    """Validate track CSV content. Returns (rows | None, source label, problem/note).

    Times are minutes since TAKEOFF and are preserved as given (a recorded track may
    start after takeoff). Provenance is "recorded" only if the header comment or a
    sidecar whose csv_sha256 matches this CSV says ``source: adsb``.
    """
    if csv_bytes is None:
        return None, "synthetic", "Track file missing; synthetic track generated in memory"
    try:
        comment_source = None
        data_lines = []
        for line in csv_bytes.decode("utf-8").splitlines():
            if line.lstrip().startswith("#"):
                m = re.match(r"#\s*source\s*:\s*(\S+)", line.strip(), re.I)
                if m:
                    comment_source = m.group(1).lower()
                continue
            if line.strip():
                data_lines.append(line)
        reader = csv.DictReader(data_lines)
        needed = {"min_since_takeoff", "lat", "lon", "alt_m", "gs_kmh"}
        if reader.fieldnames is None or not needed.issubset({f.strip() for f in reader.fieldnames}):
            return None, "synthetic", "Track file has wrong columns; synthetic track used"
        rows = []
        for r in reader:
            r = {k.strip(): v for k, v in r.items() if k}
            row = {k: float(r[k]) for k in needed}
            if not all(math.isfinite(v) for v in row.values()):
                raise ValueError("non-finite")
            if not (-90 <= row["lat"] <= 90 and -180 <= row["lon"] <= 180
                    and 0 <= row["alt_m"] <= TRACK_MAX_ALT_M and row["gs_kmh"] >= 0):
                raise ValueError("out of range")
            rows.append(row)
        t = [r["min_since_takeoff"] for r in rows]
        if len(rows) < TRACK_MIN_ROWS or any(b <= a for a, b in zip(t[:-1], t[1:])) or t[0] < 0:
            return None, "synthetic", "Track file not sorted/unique or too short; synthetic track used"
        if t[-1] - t[0] < SAMPLE_SECONDS / 60.0:
            return None, "synthetic", "Track file covers less than one sample interval; synthetic track used"
        meta_source, note = None, None
        if meta_bytes is not None:
            try:
                meta = json.loads(meta_bytes.decode("utf-8"))
                if isinstance(meta, dict):
                    digest = meta.get("csv_sha256")
                    if digest is not None and digest != hashlib.sha256(csv_bytes).hexdigest():
                        note = "Track sidecar does not match the CSV; sidecar ignored"
                    else:
                        meta_source = str(meta.get("source", "")).lower()
            except (UnicodeDecodeError, ValueError):
                meta_source = None
        source = "recorded" if "adsb" in (comment_source, meta_source) else "synthetic"
        return rows, source, note
    except (UnicodeDecodeError, ValueError, KeyError, TypeError):
        return None, "synthetic", "Track file invalid; synthetic track used"


def _read_bytes_or_none(path: Path) -> bytes | None:
    try:
        return path.read_bytes()
    except OSError:
        return None


def _load_track_file(csv_path: Path, meta_path: Path) -> tuple[list[dict] | None, str, str | None]:
    """Read + validate the track CSV (see ``_parse_track_bytes``)."""
    return _parse_track_bytes(_read_bytes_or_none(csv_path), _read_bytes_or_none(meta_path))


_TS_ALIASES = ("timestamp", "time", "ts", "datetime", "utc")
_LAT_ALIASES = ("lat", "latitude")
_LON_ALIASES = ("lon", "lng", "long", "longitude")
_ALT_ALIASES = ("altitude", "alt", "alt_ft", "altitude_ft", "baro_altitude")
_SPD_ALIASES = ("speed", "gs", "ground_speed", "speed_kt", "groundspeed", "gs_kt")


def _pick(fieldnames: list[str], aliases: tuple[str, ...]) -> str | None:
    low = {f.strip().lower(): f for f in fieldnames}
    for a in aliases:
        if a in low:
            return low[a]
    return None


def _parse_ts(value: str) -> float | None:
    v = (value or "").strip()
    if not v:
        return None
    try:
        num = float(v)
    except ValueError:
        num = None
    if num is not None:
        if not math.isfinite(num):
            return None              # "nan"/"inf" are rejected before any ordering/maths
        return num / 1000.0 if num > EPOCH_MS_THRESHOLD else num
    dt = _parse_utc(v)
    return dt.timestamp() if dt else None


@_strict_json
def import_adsb_track(path: str | Path, output_path: str | Path | None = None) -> dict:
    """Import an ADS-B CSV (timestamp, lat, lon, altitude in FEET, speed in KNOTS).

    Converts to metres / km/h, drops ground points (alt < 100 ft or speed < 50
    kt), sorts, de-duplicates timestamps, re-bases time to minutes since the
    first airborne point, and fills gaps > 2 min by geodesic interpolation.
    If ``output_path`` is given, writes the track CSV (``# source: adsb``) plus a
    ``.meta.json`` sidecar so the engine reports ``track: "recorded"``.
    Output: ``{"schema_version", "ok", "rows", "points", "dropped_ground",
    "dropped_invalid", "gaps_filled", "written_to", "error"}``. Never raises.
    """
    base = {"schema_version": SCHEMA_VERSIONS["track"], "ok": False, "rows": 0, "points": [],
            "dropped_ground": 0, "dropped_invalid": 0, "gaps_filled": 0, "written_to": None, "error": None}
    try:
        with open(path, "r", encoding="utf-8") as fh:
            lines = [ln for ln in fh if ln.strip() and not ln.lstrip().startswith("#")]
        reader = csv.DictReader(lines)
        names = reader.fieldnames or []
        cols = [_pick(names, a) for a in (_TS_ALIASES, _LAT_ALIASES, _LON_ALIASES, _ALT_ALIASES, _SPD_ALIASES)]
        if any(c is None for c in cols):
            return {**base, "error": "Missing column (need timestamp, lat, lon, altitude ft, speed kt)"}
        c_ts, c_lat, c_lon, c_alt, c_spd = cols
        pts, bad, ground = [], 0, 0
        for r in reader:
            try:
                ts = _parse_ts(r[c_ts])
                la, lo, alt_ft, spd_kt = float(r[c_lat]), float(r[c_lon]), float(r[c_alt]), float(r[c_spd])
                if ts is None or not all(math.isfinite(x) for x in (la, lo, alt_ft, spd_kt)) \
                        or not (-90 <= la <= 90 and -180 <= lo <= 180):
                    bad += 1
                    continue
            except (TypeError, ValueError, KeyError):
                bad += 1
                continue
            if alt_ft < ADSB_MIN_ALT_FT or spd_kt < ADSB_MIN_SPEED_KT:
                ground += 1
                continue
            pts.append((ts, la, lo, alt_ft * FT_TO_M, spd_kt * KT_TO_KMH))
        pts.sort(key=lambda p: p[0])
        dedup = []
        for p in pts:
            if not dedup or p[0] > dedup[-1][0]:
                dedup.append(p)
        if len(dedup) < TRACK_MIN_ROWS:
            return {**base, "dropped_ground": ground, "dropped_invalid": bad,
                    "error": "Too few airborne points"}
        t0 = dedup[0][0]
        out, filled = [], 0
        for a, b in zip(dedup[:-1], dedup[1:]):
            out.append(a)
            gap_min = (b[0] - a[0]) / 60
            if gap_min > ADSB_GAP_FILL_MIN:
                ln = _GEOD.InverseLine(a[1], a[2], b[1], b[2])
                n_new = int(math.ceil(gap_min / ADSB_GAP_FILL_STEP_MIN)) - 1
                for k in range(1, n_new + 1):
                    f = k / (n_new + 1)
                    pos = ln.Position(ln.s13 * f)
                    out.append((a[0] + f * (b[0] - a[0]), pos["lat2"], pos["lon2"],
                                a[3] + f * (b[3] - a[3]), a[4] + f * (b[4] - a[4])))
                    filled += 1
        out.append(dedup[-1])
        rows = [{"min_since_takeoff": round((p[0] - t0) / 60, 3), "lat": round(p[1], 5), "lon": round(p[2], 5),
                 "alt_m": int(round(p[3])), "gs_kmh": round(p[4], 1)} for p in out]
        written = None
        if output_path is not None:
            op = Path(output_path)
            _write_track_csv(rows, op, op.with_name(op.stem + ".meta.json"), "adsb",
                             f"Imported from {Path(path).name}")
            written = str(op)
        return {**base, "ok": True, "rows": len(rows), "points": rows, "dropped_ground": ground,
                "dropped_invalid": bad, "gaps_filled": filled, "written_to": written}
    except Exception as exc:
        return {**base, "error": f"Import failed ({type(exc).__name__})"}


@dataclass
class _Track:
    t_min: np.ndarray
    lat: np.ndarray
    lon: np.ndarray
    alt: np.ndarray
    heading: np.ndarray
    in_turn: np.ndarray
    source: str
    note: str | None


def _circular_smooth(deg: np.ndarray, half: int) -> np.ndarray:
    """Centred circular moving mean over i-half..i+half, truncated at the ends.

    Always returns the input length (np.convolve(mode="same") returns
    max(len(a), len(kernel)) and broke tracks shorter than the kernel).
    """
    n = deg.size
    if half <= 0 or n < 2:
        return np.asarray(deg, dtype=float) % 360
    r = np.radians(deg)
    cs = np.concatenate([[0.0], np.cumsum(np.sin(r))])
    cc = np.concatenate([[0.0], np.cumsum(np.cos(r))])
    i = np.arange(n)
    lo, hi = np.maximum(i - half, 0), np.minimum(i + half + 1, n)
    return np.degrees(np.arctan2(cs[hi] - cs[lo], cc[hi] - cc[lo])) % 360


def _resample_track(rows: list[dict], source: str, note: str | None,
                    max_minutes: float | None = None) -> _Track:
    """Resample to SAMPLE_SECONDS. Times stay minutes since TAKEOFF (no rebasing), and
    samples are limited to [first row, min(last row, max_minutes)] - the airborne domain.
    Raises ValueError if fewer than two samples remain (caller decides the fallback)."""
    t = np.array([r["min_since_takeoff"] for r in rows], dtype=float)
    lat_r = [float(r["lat"]) for r in rows]
    lon_r = [float(r["lon"]) for r in rows]
    alt_r = np.array([r["alt_m"] for r in rows], dtype=float)
    step = SAMPLE_SECONDS / 60.0
    end = float(t[-1]) if max_minutes is None else min(float(t[-1]), float(max_minutes))
    grid = np.arange(float(t[0]), end + 1e-9, step)
    if len(t) < 2 or grid.size < 2:
        raise ValueError("Track covers fewer than two samples of the airborne period")
    seg_idx = np.clip(np.searchsorted(t, grid, side="right") - 1, 0, len(t) - 2)
    lines: dict[int, Any] = {}
    lat = np.empty(grid.size)
    lon = np.empty(grid.size)
    for j, (g, i) in enumerate(zip(grid, seg_idx)):
        i = int(i)
        if i not in lines:
            lines[i] = _GEOD.InverseLine(lat_r[i], lon_r[i], lat_r[i + 1], lon_r[i + 1])
        f = (g - t[i]) / (t[i + 1] - t[i])
        pos = lines[i].Position(lines[i].s13 * min(max(f, 0.0), 1.0))
        lat[j], lon[j] = pos["lat2"], pos["lon2"]
    alt = np.interp(grid, t, alt_r)
    raw = np.empty(grid.size)
    for j in range(grid.size - 1):
        raw[j] = _GEOD.Inverse(lat[j], lon[j], lat[j + 1], lon[j + 1], _INV_MASK)["azi1"] % 360
    raw[-1] = raw[-2] if grid.size > 1 else 0.0
    half = int(round(HEADING_SMOOTH_MIN * 60 / SAMPLE_SECONDS / 2))
    heading = _circular_smooth(raw, half)
    dh = (np.diff(heading) + 180) % 360 - 180
    rate = np.abs(dh) / SAMPLE_SECONDS
    in_turn = np.zeros(grid.size, dtype=bool)
    in_turn[:-1] |= rate > TURN_RATE_DEG_S
    in_turn[1:] |= rate > TURN_RATE_DEG_S
    return _Track(grid, lat, lon, alt, heading, in_turn, source, note)


# =============================================================================
# Function 2: Astronomy and geometry helpers
# =============================================================================

def horizon_dip_deg(alt_m: float | np.ndarray) -> Any:
    """Horizon dip (deg) at altitude, nautical formula incl. standard refraction."""
    return DIP_ARCMIN_PER_SQRT_M * np.sqrt(np.maximum(alt_m, 0.0)) / 60.0


def _ephem_dates(epochs: np.ndarray) -> np.ndarray:
    return epochs / 86400.0 + _EPHEM_UNIX_EPOCH


def _altaz_series(body_cls: Callable[[], Any], lat: np.ndarray, lon: np.ndarray, elev: np.ndarray,
                  epochs: np.ndarray, mask: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Topocentric altitude/azimuth (deg) with pressure=0 (no ephem refraction).

    NaN where ``mask`` is False. lat/lon/elev may be scalars or arrays.
    """
    n = epochs.size
    lat_a = np.broadcast_to(np.radians(lat), (n,))
    lon_a = np.broadcast_to(np.radians(lon), (n,))
    elev_a = np.broadcast_to(np.asarray(elev, dtype=float), (n,))
    ed = _ephem_dates(epochs)
    alt_out = np.full(n, np.nan)
    az_out = np.full(n, np.nan)
    obs = ephem.Observer()
    obs.pressure = 0.0
    body = body_cls()
    idx = range(n) if mask is None else np.flatnonzero(mask).tolist()
    for i in idx:
        obs.lat = float(lat_a[i])
        obs.lon = float(lon_a[i])
        obs.elevation = float(elev_a[i])
        obs.date = float(ed[i])
        body.compute(obs)
        alt_out[i] = float(body.alt)
        az_out[i] = float(body.az)
    return np.degrees(alt_out), np.degrees(az_out)


def _first_crossing(epochs: np.ndarray, values: np.ndarray, threshold: Any) -> tuple[float | None, int | None]:
    """First upward crossing of values through threshold, linearly interpolated."""
    f = values - threshold
    ok = (f[:-1] < 0) & (f[1:] >= 0)
    ok &= np.isfinite(f[:-1]) & np.isfinite(f[1:])
    hits = np.flatnonzero(ok)
    if hits.size == 0:
        return None, None
    k = int(hits[0]) + 1
    frac = -f[k - 1] / (f[k] - f[k - 1])
    return float(epochs[k - 1] + frac * (epochs[k] - epochs[k - 1])), k


def _side_offset(az: Any, heading: Any) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (rel_bearing, side code, beam offset). side: +1 RIGHT, -1 LEFT, 0 dead ahead/astern."""
    rel = (np.asarray(az, dtype=float) - np.asarray(heading, dtype=float)) % 360.0
    side = np.where((rel > 0) & (rel < 180), 1, np.where((rel > 180) & (rel < 360), -1, 0))
    offset = np.where(side == 1, np.abs(rel - 90.0), np.abs(rel - 270.0))
    return rel, side, offset


def side_of(az_deg: float, heading_deg: float) -> str | None:
    """'LEFT' / 'RIGHT' / None for an object azimuth relative to the heading."""
    _, side, _ = _side_offset(az_deg, heading_deg)
    return {1: "RIGHT", -1: "LEFT"}.get(int(side))


def _angle_factor(offset: np.ndarray) -> np.ndarray:
    eff = np.maximum(np.asarray(offset, dtype=float) - HEADING_TOLERANCE_DEG, 0.0)
    good = 1.0 - (1.0 - ANGLE_FACTOR_AT_GOOD) * eff / FOV_GOOD_DEG
    acc = ANGLE_FACTOR_AT_GOOD * (FOV_MAX_DEG - eff) / (FOV_MAX_DEG - FOV_GOOD_DEG)
    return np.where(eff <= FOV_GOOD_DEG, good, np.where(eff <= FOV_MAX_DEG, acc, 0.0))


def _side_factor(az: np.ndarray, heading: np.ndarray, side_code: int) -> np.ndarray:
    _, side, off = _side_offset(az, heading)
    af = _angle_factor(off)
    return np.where((side == side_code) & np.isfinite(af), af, 0.0)


def elevation_angle_deg(h_target_m: Any, h_ac_m: Any, d_m: Any) -> Any:
    """Apparent elevation of a target (deg), incl. earth curvature: atan2(dh, d) - d/(2R)."""
    d = np.asarray(d_m, dtype=float)
    return np.degrees(np.arctan2(np.asarray(h_target_m) - np.asarray(h_ac_m), d)) - np.degrees(d / (2 * EARTH_RADIUS_M))


def _range_factor(d_km: np.ndarray) -> np.ndarray:
    d = np.asarray(d_km, dtype=float)
    a = 1.0 - (1.0 - RANGE_FACTOR_AT_GOOD) * (d - RANGE_FULL_KM) / (RANGE_GOOD_KM - RANGE_FULL_KM)
    b = RANGE_FACTOR_AT_GOOD * (RANGE_MAX_KM - d) / (RANGE_MAX_KM - RANGE_GOOD_KM)
    return np.where(d <= RANGE_FULL_KM, 1.0, np.where(d <= RANGE_GOOD_KM, a, np.where(d <= RANGE_MAX_KM, b, 0.0)))


def _lighting_state(sun_alt: float) -> str:
    if not math.isfinite(sun_alt) or sun_alt < LIGHTING_THRESHOLDS["DARK_BELOW"]:
        return "DARK"
    if sun_alt < LIGHTING_THRESHOLDS["SILHOUETTE_BELOW"]:
        return "SILHOUETTE"
    if sun_alt <= LIGHTING_THRESHOLDS["ALPENGLOW_UPTO"]:
        return "ALPENGLOW"
    return "DAYLIGHT"


def _haversine_km(lat1: np.ndarray, lon1: np.ndarray, lat2: float, lon2: float) -> np.ndarray:
    p1, p2 = np.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2) - np.radians(lon1)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * math.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M / 1000 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def _offset_track(lat: np.ndarray, lon: np.ndarray, heading: np.ndarray, offset_km: float) -> tuple[np.ndarray, np.ndarray]:
    """Shift each point sideways (perpendicular to local heading; +right). Spherical, vectorised."""
    if offset_km == 0:
        return lat.copy(), lon.copy()
    brg = np.radians(heading + 90.0)
    dlt = offset_km * 1000 / EARTH_RADIUS_M
    p1, l1 = np.radians(lat), np.radians(lon)
    p2 = np.arcsin(np.sin(p1) * np.cos(dlt) + np.cos(p1) * np.sin(dlt) * np.cos(brg))
    l2 = l1 + np.arctan2(np.sin(brg) * np.sin(dlt) * np.cos(p1), np.cos(dlt) - np.sin(p1) * np.sin(p2))
    return np.degrees(p2), (np.degrees(l2) + 540) % 360 - 180


def _segments(mask: np.ndarray) -> list[tuple[int, int]]:
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return []
    br = np.flatnonzero(np.diff(idx) > 1)
    starts = np.r_[idx[0], idx[br + 1]]
    ends = np.r_[idx[br], idx[-1]]
    return list(zip(starts.tolist(), ends.tolist()))


def _best_instance(score: np.ndarray, mask: np.ndarray, in_turn: np.ndarray) -> tuple[int, int, int, float] | None:
    """Best contiguous visible segment: (start_idx, end_idx, peak_idx, peak_score). Peaks exclude turns."""
    best = None
    for s, e in _segments(mask):
        seg = np.arange(s, e + 1)
        ok = seg[~in_turn[seg]]
        if ok.size == 0:
            continue
        j = int(ok[int(np.argmax(score[ok]))])
        if score[j] <= 0:
            continue
        if best is None or score[j] > best[3]:
            best = (s, e, j, float(score[j]))
    return best


# =============================================================================
# Function 2: Weather (cache file only; network only in refresh_weather_cache)
# =============================================================================

@dataclass
class _Weather:
    status: str                       # live | sample | assumed
    points: dict[str, dict[str, np.ndarray]]
    shift_s: float
    fetched_at: str | None
    forecast_for: str | None
    note: str | None
    sig: tuple[Any, ...] = field(default_factory=tuple)


def _validate_weather(payload: Any) -> dict[str, dict[str, np.ndarray]] | None:
    if not isinstance(payload, dict) or not isinstance(payload.get("points"), dict):
        return None
    out = {}
    for key, pt in payload["points"].items():
        try:
            hourly = pt["hourly"]
            times = hourly["time"]
            cols = [hourly["cloud_cover_low"], hourly["cloud_cover_mid"], hourly["cloud_cover_high"]]
            if not (len(times) == len(cols[0]) == len(cols[1]) == len(cols[2])) or not times:
                continue
            tt, lo, mi, hi = [], [], [], []
            for i, ts in enumerate(times):
                dt = _parse_utc(ts)
                vals = [c[i] for c in cols]
                if dt is None or any(not isinstance(v, (int, float)) or isinstance(v, bool)
                                     or not (0 <= v <= 100) for v in vals):
                    continue
                tt.append(dt.timestamp())
                lo.append(float(vals[0]))
                mi.append(float(vals[1]))
                hi.append(float(vals[2]))
            if tt:
                order = np.argsort(tt)
                out[str(key)] = {"t": np.array(tt)[order], "low": np.array(lo)[order],
                                 "mid": np.array(mi)[order], "high": np.array(hi)[order]}
        except (KeyError, TypeError, AttributeError):
            continue
    return out or None


def _parse_weather_bytes(data: bytes) -> dict[str, Any]:
    payload = json.loads(data.decode("utf-8"))
    if not isinstance(payload, dict):
        return {"meta": {}, "points": None}
    meta = {k: payload.get(k) for k in ("source", "forecast_for_date", "fetched_at_utc")}
    return {"meta": meta, "points": _validate_weather(payload)}


def _weather_from_parsed(parsed: dict[str, Any] | None, demo_date: date, sig: tuple[Any, ...] = ()) -> _Weather:
    if parsed is None:
        return _Weather("assumed", {}, 0.0, None, None, "No weather cache; moderate cloud assumed", sig)
    points, payload = parsed["points"], parsed["meta"]
    if points is None:
        return _Weather("assumed", {}, 0.0, None, None, "Weather cache invalid; moderate cloud assumed", sig)
    ffd = _parse_iso_date(payload.get("forecast_for_date"))
    shift = (ffd - demo_date).days * 86400.0 if ffd else 0.0
    fetched = payload.get("fetched_at_utc") if isinstance(payload.get("fetched_at_utc"), str) else None
    # A committed sample never becomes "live", even if its date matches.
    if payload.get("source") == OPEN_METEO_SOURCE and ffd == demo_date:
        status, note = "live", None
    elif payload.get("source") == OPEN_METEO_SOURCE:
        status, note = "sample", "Forecast is for a different date; used as a sample"
    else:
        status, note = "sample", "Committed sample forecast (not live)"
    return _Weather(status, points, shift, fetched, ffd.isoformat() if ffd else None, note, tuple(sig) + (fetched,))


def _load_weather(demo_date: date) -> _Weather:
    """Read the weather cache (WEATHER_CACHE_PATH) for ``demo_date``."""
    data = _read_bytes_or_none(WEATHER_CACHE_PATH)
    if data is None:
        return _weather_from_parsed(None, demo_date)
    try:
        parsed = _parse_weather_bytes(data)
    except (UnicodeDecodeError, ValueError):
        parsed = {"meta": {}, "points": None}
    return _weather_from_parsed(parsed, demo_date, (hashlib.sha256(data).hexdigest()[:16],))


def _combine_mid_high(mid: np.ndarray, high: np.ndarray) -> np.ndarray:
    if CLOUD_LAYER_COMBINE == "max":
        return np.maximum(mid, high)
    if CLOUD_LAYER_COMBINE == "sum":
        return np.minimum(mid + high, 100.0)
    return 100.0 * (1.0 - (1.0 - mid / 100.0) * (1.0 - high / 100.0))


def _cloud_series(w: _Weather, lm_id: str, epochs: np.ndarray,
                  required: list[str] | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Per sample: (low %, combined mid/high %, assumed mask) for a landmark.

    ``required`` lists the forecast points this view needs (the landmark and, when the
    track passes within range, its line-of-sight midpoint). A required point that is
    missing from the cache - or a sample whose nearest forecast hour is more than
    WEATHER_MAX_GAP_H away - uses the conservative ASSUMED_CLOUD values and is flagged
    in the assumed mask. Combined cover is the worst (max) over the required points;
    low cloud comes from the landmark point.
    """
    keys = list(required) if required is not None else [k for k in (lm_id, f"{lm_id}_los_mid") if k in w.points]
    if not keys:
        keys = [lm_id]
    n = epochs.size
    a_low = np.full(n, ASSUMED_CLOUD["low"])
    a_mh = _combine_mid_high(np.full(n, ASSUMED_CLOUD["mid"]), np.full(n, ASSUMED_CLOUD["high"]))
    q = epochs + w.shift_s
    low_out, mh_out = None, None
    assumed = np.zeros(n, dtype=bool)
    for k in keys:
        p = w.points.get(k)
        if p is None or p["t"].size == 0:
            assumed[:] = True
            low, mh = a_low, a_mh
            if low_out is None:
                low_out, mh_out = low, mh
            else:
                mh_out = np.maximum(mh_out, mh)
            continue
        j = np.clip(np.searchsorted(p["t"], q), 1, max(p["t"].size - 1, 1)) if p["t"].size > 1 else np.zeros(n, int)
        if p["t"].size > 1:
            prev = j - 1
            j = np.where(np.abs(p["t"][prev] - q) <= np.abs(p["t"][j] - q), prev, j)
        far = np.abs(p["t"][j] - q) > WEATHER_MAX_GAP_H * 3600
        assumed |= far
        low = np.where(far, a_low, p["low"][j])
        mh = np.where(far, a_mh, _combine_mid_high(p["mid"][j], p["high"][j]))
        if low_out is None:
            low_out, mh_out = low, mh          # landmark point (first key) provides low cloud
        else:
            mh_out = np.maximum(mh_out, mh)
    return low_out, mh_out, assumed


def _cloud_factor(mid_high: np.ndarray) -> np.ndarray:
    return np.where(mid_high < CLOUD_THRESHOLDS["clear_below"], 1.0,
                    np.where(mid_high <= CLOUD_THRESHOLDS["suppress_above"], CLOUD_THRESHOLDS["partial_factor"], 0.0))


def _load_landmarks() -> tuple[list[dict[str, Any]], str, tuple[Any, ...]]:
    data = _read_bytes_or_none(LANDMARKS_PATH)
    if data is None:
        return [], "missing", ()
    try:
        out, status = _parse_landmarks_bytes(data)
    except (UnicodeDecodeError, ValueError):
        return [], "missing", ()
    return out, status, (hashlib.sha256(data).hexdigest()[:16],)


def _parse_landmarks_bytes(data: bytes) -> tuple[list[dict[str, Any]], str]:
    raw = json.loads(data.decode("utf-8"))
    items = raw.get("landmarks") if isinstance(raw, dict) else raw
    out = []
    for lm in items if isinstance(items, list) else []:
        try:
            out.append({"id": str(lm["id"]), "name": str(lm["name"]),
                        "short_name": str(lm.get("short_name") or lm["name"]),
                        "lat": float(lm["lat"]), "lon": float(lm["lon"]), "elev_m": float(lm["elev_m"]),
                        "type": str(lm.get("type", "landmark")), "icon": str(lm.get("icon", "landmark")),
                        "min_lighting": lm.get("min_lighting") if lm.get("min_lighting") in LIGHTING_ORDER else "SILHOUETTE",
                        "cloud_rule": str(lm.get("cloud_rule", "summit_above_low_cloud"))})
        except (KeyError, TypeError, ValueError):
            continue
    return out, ("file" if out else "missing")


def _landmark_weather_points(track: _Track, landmarks: list[dict]) -> dict[str, tuple[float, float]]:
    """Fixed forecast points: each landmark, and the midpoint of the line of sight at closest approach."""
    pts: dict[str, tuple[float, float]] = {}
    for lm in landmarks:
        pts[lm["id"]] = (lm["lat"], lm["lon"])
        d = _haversine_km(track.lat, track.lon, lm["lat"], lm["lon"])
        i = int(np.argmin(d))
        if d[i] <= RANGE_MAX_KM:
            inv = _GEOD.Inverse(track.lat[i], track.lon[i], lm["lat"], lm["lon"])
            mid = _GEOD.Direct(track.lat[i], track.lon[i], inv["azi1"], inv["s12"] / 2)
            pts[f"{lm['id']}_los_mid"] = (round(mid["lat2"], 4), round(mid["lon2"], 4))
    return pts


# =============================================================================
# Function 2: Per-run evaluation
# =============================================================================

@dataclass
class _Ctx:
    landmarks: list[dict[str, Any]]
    weather: _Weather
    moon_active: bool
    moon_illum: float
    required: dict[str, list[str]] = field(default_factory=dict)   # landmark id -> forecast points needed


def _band(ref_alt: np.ndarray, lo: Any, hi: Any) -> np.ndarray:
    """Samples whose reference altitude lies within [lo, hi] widened by MC_SKY_ALT_MARGIN_DEG."""
    return np.isfinite(ref_alt) & (ref_alt >= lo - MC_SKY_ALT_MARGIN_DEG) & (ref_alt <= hi + MC_SKY_ALT_MARGIN_DEG)


def _evaluate_run(ctx: _Ctx, tr: _Track, lat: np.ndarray, lon: np.ndarray, epochs: np.ndarray,
                  keep_series: bool = False, ref: dict[str, Any] | None = None) -> dict[str, Any]:
    """Find event instances for one (possibly perturbed) run of the flight.

    ``ref`` (the nominal run's series) enables the Monte Carlo speed-up: bodies
    are recomputed only near threshold bands, nominal values are reused elsewhere.
    """
    alt, heading, in_turn = tr.alt, tr.heading, tr.in_turn
    n = epochs.size
    events: dict[str, dict[str, Any]] = {}
    series: dict[str, Any] = {}
    blocked: dict[str, dict[str, Any]] = {}
    dip = horizon_dip_deg(alt)
    if ref is None:
        sun_alt, sun_az = _altaz_series(ephem.Sun, lat, lon, alt, epochs)
    else:
        need = _band(ref["sun_alt"], -(SUN_DAWN_GLOW_DEG + dip), np.maximum(SUN_WINDOW_END_DEG, BELT_SUN_HIGH_DEG)) \
            | _band(ref["sun_alt"], VENUS_MAX_SUN_ALT_DEG, VENUS_MAX_SUN_ALT_DEG) | ~np.isfinite(ref["sun_alt"])
        sun_alt, sun_az = _altaz_series(ephem.Sun, lat, lon, alt, epochs, need)
        sun_alt = np.where(need, sun_alt, ref["sun_alt"])
        sun_az = np.where(need, sun_az, ref["sun_az"])
    sky_cloud = np.where(alt < LOW_ALT_M, CLOUD_THRESHOLDS["sky_low_alt_factor"], 1.0)

    def add(eid: str, key: str, kind: str, side_code: int, start: int, end: int, peak_idx: int,
            score: float, peak_t: float | None = None, attrs: dict | None = None) -> None:
        events[eid] = {"id": eid, "key": key, "kind": kind, "side": "RIGHT" if side_code == 1 else "LEFT",
                       "start": float(epochs[start]), "end": float(epochs[end]),
                       "peak": float(epochs[peak_idx] if peak_t is None else peak_t), "peak_idx": peak_idx,
                       "score": float(score), "alt_m": float(alt[peak_idx]), "attrs": attrs or {}}

    # --- Sunrise: peak at apparent-horizon crossing ---------------------------
    t_cross, k = _first_crossing(epochs, sun_alt, -(SUN_HORIZON_DEG + dip))
    for code in (1, -1):
        af = _side_factor(sun_az, heading, code)
        score = af * sky_cloud
        mask = (sun_alt >= -(SUN_DAWN_GLOW_DEG + dip)) & (sun_alt < SUN_WINDOW_END_DEG) & (af > 0)
        if keep_series:
            series[f"sunrise_{'right' if code == 1 else 'left'}"] = np.where(mask, score, 0.0)
        if k is None:
            continue
        name = f"sunrise_{'right' if code == 1 else 'left'}"
        for s, e in _segments(mask):
            if s <= k <= e or s <= k - 1 <= e:
                # RESOLUTION (spec ambiguity): the peak is ALWAYS the computed crossing. If the
                # crossing lies in an excluded turn (either bracketing sample in_turn), the
                # candidate is suppressed for this run - no other time or score is borrowed.
                if in_turn[k - 1] or in_turn[k]:
                    if keep_series:
                        blocked[name] = {"key": "sunrise", "side": "RIGHT" if code == 1 else "LEFT",
                                         "title": "Sunrise", "lighting": None,
                                         "why_not": "Sunrise occurs during a turn"}
                    break
                pos = (k - 1) + (t_cross - epochs[k - 1]) / max(epochs[k] - epochs[k - 1], 1e-9)
                brackets = [x for x in (k - 1, k) if s <= x <= e]
                j = min(brackets, key=lambda x: (abs(x - pos), x))   # nearest bracketing sample's score
                add(name, "sunrise", "SKY", code, s, e, j, float(score[j]), peak_t=t_cross)
                break

    # --- Venus (morning/evening star) ------------------------------------------
    v_mask_t = sun_alt < VENUS_MAX_SUN_ALT_DEG
    if v_mask_t.any():
        if ref is None or "venus_alt" not in ref:
            v_alt, v_az = _altaz_series(ephem.Venus, lat, lon, alt, epochs, v_mask_t)
        else:
            # Recompute inside the threshold band AND wherever the nominal run never computed
            # Venus (NaN: nominal sun was above -4 deg) but this run's sun is now below it.
            need = v_mask_t & (_band(ref["venus_alt"], -dip + SKY_OBJECT_MIN_ABOVE_DIP_DEG, SKY_MAX_VIEW_ALT_DEG)
                               | ~np.isfinite(ref["venus_alt"]))
            v_alt, v_az = _altaz_series(ephem.Venus, lat, lon, alt, epochs, need)
            v_alt = np.where(need, v_alt, ref["venus_alt"])
            v_az = np.where(need, v_az, ref["venus_az"])
        if keep_series:
            series["venus_alt"], series["venus_az"] = v_alt, v_az
        vis = v_mask_t & (v_alt > -dip + SKY_OBJECT_MIN_ABOVE_DIP_DEG) & (v_alt <= SKY_MAX_VIEW_ALT_DEG)
        for code in (1, -1):
            af = np.where(vis, _side_factor(np.nan_to_num(v_az), heading, code), 0.0)
            score = af * sky_cloud * SKY_EVENT_WEIGHTS["venus"]
            name = f"venus_{'right' if code == 1 else 'left'}"
            if keep_series:
                series[name] = score
            b = _best_instance(score, score > 0, in_turn)
            if b:
                add(name, "venus", "SKY", code, b[0], b[1], b[2], b[3], attrs={"obj_alt": float(v_alt[b[2]])})

    # --- Moon ------------------------------------------------------------------
    if ctx.moon_active:
        if ref is None or "moon_alt" not in ref:
            m_alt, m_az = _altaz_series(ephem.Moon, lat, lon, alt, epochs)
        else:
            need = _band(ref["moon_alt"], -dip + SKY_OBJECT_MIN_ABOVE_DIP_DEG, SKY_MAX_VIEW_ALT_DEG) \
                | ~np.isfinite(ref["moon_alt"])
            m_alt, m_az = _altaz_series(ephem.Moon, lat, lon, alt, epochs, need)
            m_alt = np.where(need, m_alt, ref["moon_alt"])
            m_az = np.where(need, m_az, ref["moon_az"])
        if keep_series:
            series["moon_alt"], series["moon_az"] = m_alt, m_az
        vis = (m_alt > -dip + SKY_OBJECT_MIN_ABOVE_DIP_DEG) & (m_alt <= SKY_MAX_VIEW_ALT_DEG)
        for code in (1, -1):
            af = np.where(vis, _side_factor(m_az, heading, code), 0.0)
            score = af * sky_cloud * SKY_EVENT_WEIGHTS["moon"] * ctx.moon_illum
            name = f"moon_{'right' if code == 1 else 'left'}"
            if keep_series:
                series[name] = score
            b = _best_instance(score, score > 0, in_turn)
            if b:
                add(name, "moon", "SKY", code, b[0], b[1], b[2], b[3], attrs={"illum": ctx.moon_illum})

    # --- Belt of Venus (opposite the sun around sunrise) -----------------------
    belt_t = (sun_alt >= -(BELT_SUN_LOW_EXTRA_DEG + dip)) & (sun_alt <= BELT_SUN_HIGH_DEG)
    anti_az = (sun_az + 180.0) % 360.0
    for code in (1, -1):
        af = np.where(belt_t, _side_factor(anti_az, heading, code), 0.0)
        score = af * sky_cloud * SKY_EVENT_WEIGHTS["belt_of_venus"]
        name = f"belt_of_venus_{'right' if code == 1 else 'left'}"
        if keep_series:
            series[name] = score
        b = _best_instance(score, score > 0, in_turn)
        if b:
            add(name, "belt_of_venus", "SKY", code, b[0], b[1], b[2], b[3])

    # --- Landmarks ---------------------------------------------------------------
    for lm in ctx.landmarks:
        approx = _haversine_km(lat, lon, lm["lat"], lm["lon"])
        near = np.flatnonzero(approx <= RANGE_MAX_KM + LANDMARK_PREFILTER_MARGIN_KM)
        if near.size == 0:
            continue
        d_km = np.full(n, np.inf)
        az = np.full(n, np.nan)
        for i in near.tolist():
            inv = _GEOD.Inverse(lat[i], lon[i], lm["lat"], lm["lon"], _INV_MASK)
            d_km[i] = inv["s12"] / 1000.0
            az[i] = inv["azi1"] % 360.0
        elev = np.where(np.isfinite(d_km), elevation_angle_deg(lm["elev_m"], alt, np.where(np.isfinite(d_km), d_km * 1000, 0.0)), np.nan)
        geo_lim = GEOMETRIC_RANGE_COEFF_KM * (np.sqrt(np.maximum(alt, 0)) + math.sqrt(max(lm["elev_m"], 0)))
        near_mask = np.zeros(n, dtype=bool)
        near_mask[near] = True
        lm_sun_alt, _ = _altaz_series(ephem.Sun, lm["lat"], lm["lon"], lm["elev_m"], epochs, near_mask)
        lighting = np.array([_lighting_state(x) for x in lm_sun_alt], dtype=object)
        lf = np.array([LIGHTING_FACTORS[x] for x in lighting])
        min_rank = LIGHTING_ORDER.index(lm["min_lighting"])
        light_ok = np.array([LIGHTING_ORDER.index(x) >= min_rank for x in lighting])
        low, mh, assumed = _cloud_series(ctx.weather, lm["id"], epochs, ctx.required.get(lm["id"]))
        cf = _cloud_factor(mh) if lm["cloud_rule"] == "summit_above_low_cloud" else np.ones(n)
        rf = _range_factor(d_km)
        geom_ok = (d_km <= np.minimum(RANGE_MAX_KM, geo_lim)) & (elev >= VFOV_MIN_DEG) & (elev <= VFOV_MAX_DEG)
        for code in (1, -1):
            af = np.where(np.isfinite(az), _side_factor(np.nan_to_num(az), heading, code), 0.0)
            score = np.where(geom_ok & light_ok, af * rf * lf * cf, 0.0)
            name = f"{lm['id']}_{'right' if code == 1 else 'left'}"
            if keep_series:
                series[name] = score
            b = _best_instance(score, score > 0, in_turn)
            seen = geom_ok & (af > 0)
            if not b and keep_series and seen.any():
                j = int(np.flatnonzero(seen)[np.argmax((af * rf)[seen])])
                why = ("Hidden by cloud" if not cf[seen].any() else
                       "Too dark" if not light_ok[seen].any() else "Not visible at a usable angle")
                blocked[name] = {"key": lm["id"], "side": "RIGHT" if code == 1 else "LEFT", "title": lm["name"],
                                 "lighting": str(lighting[j]), "why_not": f"{why} ({_km(mh[j])}% mid/high cloud, "
                                 f"{LIGHTING_PHRASES[str(lighting[j])]})"}
            if b:
                j = b[2]
                add(name, lm["id"], "LANDMARK", code, b[0], b[1], j, b[3], attrs={
                    "range_km": float(d_km[j]), "lighting": str(lighting[j]), "mid_high": float(mh[j]),
                    "low": float(low[j]), "cloud_assumed": bool(assumed[j]), "elev_deg": float(elev[j]),
                    "landmark": lm})
    if keep_series:
        series["sun_alt"] = sun_alt
        series["sun_az"] = sun_az
    return {"events": events, "series": series, "blocked": blocked}


# =============================================================================
# Function 2: Aggregation, selection, formatting
# =============================================================================

def _lower(conf: str, notes: list[str], note: str) -> str:
    notes.append(note)
    return CONFIDENCE_LEVELS[max(CONFIDENCE_LEVELS.index(conf) - 1, 0)]


def _event_title(ev: dict[str, Any]) -> tuple[str, str, str]:
    if ev["kind"] == "LANDMARK":
        lm = ev["attrs"]["landmark"]
        return lm["name"], lm["icon"], lm["short_name"]
    return {"sunrise": ("Sunrise", "sunrise", "Sunrise"),
            "venus": ("Venus, the morning star", "star", "Venus"),
            "moon": ("Moon", "moon", "Moon"),
            "belt_of_venus": ("Belt of Venus", "sky_band", "Pink dawn band")}[ev["key"]]


def _reasons(ev: dict[str, Any], weather_status: str) -> tuple[list[str], list[str]]:
    side = "Left side" if ev["side"] == "LEFT" else "Right side"
    r, conf_notes = [side], []
    if ev["kind"] == "LANDMARK":
        a = ev["attrs"]
        r.append(f"{_km(a['range_km'])} km")
        r.append(LIGHTING_REASONS[a["lighting"]])
        r.append(f"{_km(a['mid_high'])}% mid/high cloud")
        if a["low"] > CLOUD_THRESHOLDS["sea_of_clouds_low_above"] and a["mid_high"] < CLOUD_THRESHOLDS["clear_below"]:
            r.append("Above a sea of clouds")
    elif ev["key"] == "sunrise":
        r.append(f"Sunrise from {int(round(ev['alt_m'], -2)):,} m")
        r.append("Above most cloud" if ev["alt_m"] >= LOW_ALT_M else "Low altitude: cloud may block")
    elif ev["key"] == "venus":
        r.append("Brightest planet, low in the sky")
    elif ev["key"] == "moon":
        r.append(f"Moon {_km(ev['attrs']['illum'] * 100)}% lit")
    else:
        r.append("Pink band opposite the sunrise")
    return r, conf_notes


def _aggregate(nom: dict[str, dict], runs: list[dict[str, dict]], weather: _Weather) -> list[dict[str, Any]]:
    """Combine nominal + Monte Carlo runs into candidates with windows and confidence.

    Matching: an event is identified across runs by (event key, side), e.g.
    "fuji_left". "Same side in all runs" means no run saw that event key on the
    other side. Window = P10 of run starts .. P90 of run ends; peak = median of
    run peaks; timing spread = P90 - P10 of run peaks (uncertainty of WHEN,
    distinct from how long the view lasts).
    """
    ids = set(nom)
    sides_by_key: dict[str, set[str]] = {}
    for r in runs:
        ids |= set(r)
        for ev in r.values():
            sides_by_key.setdefault(ev["key"], set()).add(ev["side"])
    cands = []
    for eid in sorted(ids):
        present = [r[eid] for r in runs if eid in r]
        rep = nom.get(eid)
        if present:
            starts = np.array([p["start"] for p in present])
            ends = np.array([p["end"] for p in present])
            peaks = np.array([p["peak"] for p in present])
            w_start = float(np.percentile(starts, WINDOW_START_PERCENTILE))
            w_end = float(np.percentile(ends, WINDOW_END_PERCENTILE))
            peak = float(np.median(peaks))
            spread = float(np.percentile(peaks, 90) - np.percentile(peaks, 10)) / 60.0
            if rep is None:
                rep = min(present, key=lambda p: (abs(p["peak"] - peak), p["start"]))
        else:
            w_start, w_end, peak, spread = rep["start"], rep["end"], rep["peak"], float("nan")
        w_start, w_end = min(w_start, peak), max(w_end, peak)
        presence = len(present) / MC_RUNS
        same_side = sides_by_key.get(rep["key"], {rep["side"]}) <= {rep["side"]}
        if presence >= CONF_HIGH_PRESENCE and same_side and math.isfinite(spread) and spread <= CONF_HIGH_MAX_SPREAD_MIN:
            conf = "HIGH"
        elif presence >= CONF_MEDIUM_PRESENCE:
            conf = "MEDIUM"
        else:
            conf = "LOW"
        notes: list[str] = []
        weather_dependent = rep["kind"] == "LANDMARK" or rep["alt_m"] < LOW_ALT_M
        if weather_dependent:
            if rep["kind"] == "LANDMARK" and weather.status != "assumed" and rep["attrs"].get("cloud_assumed"):
                conf = _lower(conf, notes, "Forecast incomplete for this view: cloud assumed")
            elif weather.status == "assumed":
                conf = _lower(conf, notes, "No forecast: cloud assumed")
            elif weather.status == "sample":
                conf = _lower(conf, notes, "Sample weather, not a live forecast")
        if rep["alt_m"] < LOW_ALT_M:
            conf = _lower(conf, notes, "Low altitude: terrain may block the view")
        reasons, _ = _reasons(rep, weather.status)
        title, icon, short = _event_title(rep)
        cands.append({"id": eid, "key": rep["key"], "kind": rep["kind"], "side": rep["side"], "title": title,
                      "icon": icon, "short": short,
                      "lighting": rep["attrs"].get("lighting") if rep["kind"] == "LANDMARK" else None,
                      "start": w_start, "end": w_end, "peak": peak, "score": rep["score"], "confidence": conf,
                      "reasons": reasons, "confidence_notes": notes,
                      "uncertainty": {"runs": MC_RUNS, "present_in": len(present),
                                      "timing_spread_min": _r1(spread) if math.isfinite(spread) else None,
                                      "same_side": bool(same_side)}})
    return cands


def _select(cands: list[dict[str, Any]]) -> tuple[list[dict], list[dict]]:
    """Apply MIN_SCORE / confidence filters, merge same-side neighbours, cap MAX_MOMENTS."""
    def prio(c: dict) -> int:
        return EVENT_PRIORITY["landmark"] if c["kind"] == "LANDMARK" else EVENT_PRIORITY.get(c["key"], 9)

    ordered = sorted(cands, key=lambda c: (-round(c["score"], 6), prio(c), c["peak"], c["id"]))
    kept: list[dict] = []
    considered = []
    for c in ordered:
        why = None
        if c.get("out_of_domain"):
            why = "Outside the scheduled airborne period"
        elif c["score"] < MIN_SCORE:          # full precision; rounding is for display only
            why = f"Score below {MIN_SCORE}"
        elif c["confidence"] == "LOW":
            why = "Low confidence"
        else:
            for k in kept:
                gap = max(c["start"], k["start"]) - min(c["end"], k["end"])
                if k["side"] == c["side"] and gap < MERGE_GAP_MIN * 60:
                    why = f"Merged into {k['id']}"
                    break
            if why is None and len(kept) >= MAX_MOMENTS:
                why = "Moment limit reached"
        if why is None:
            kept.append(c)
        considered.append({"id": c["id"], "title": c["title"], "side": c["side"], "score": _r2(c["score"]),
                           "confidence": c["confidence"], "lighting": c["lighting"], "emitted": why is None,
                           "why_not": why})
    kept.sort(key=lambda c: (c["peak"], c["id"]))
    return kept, considered


def _format_moment(c: dict[str, Any], s: _Sched, glare: list[dict]) -> dict[str, Any]:
    # Airborne-domain invariant: candidates wholly outside [takeoff, touchdown] were already
    # rejected (out_of_domain). Boundary overlaps (MC jitter pushing P10/P90 past the
    # CURRENT schedule) are clipped, and the peak is clamped inside the clipped window,
    # so window_start <= peak <= window_end always holds.
    start_dt = max(_from_epoch(c["start"]), s.takeoff)
    end_dt = min(_from_epoch(c["end"]), s.touchdown)
    peak = min(max(_from_epoch(c["peak"]), start_dt), end_dt)
    tz = s.zone_for(peak)
    start, end = _round_minute(start_dt), _round_minute(end_dt)
    alert = start - timedelta(minutes=WAKE_LEAD_MIN)
    busy = alert >= s.touchdown - timedelta(minutes=CREW_BUSY_BEFORE_TD_MIN)
    notes = []
    for g in glare:
        if g["side"] == c["side"] and g["start"] <= c["end"] and g["end"] >= c["start"]:
            notes.append("Lower shade, direct sun")
            break
    return {"id": c["id"], "type": c["kind"], "title": c["title"], "icon": c["icon"], "short_title": c["short"],
            "side": c["side"], "lighting": c["lighting"],
            "window_start": _time_obj(start, tz), "peak": _time_obj(_round_minute(peak), tz),
            "window_end": _time_obj(end, tz), "crew_alert_at": _time_obj(alert, tz),
            "score": _r2(c["score"]), "confidence": c["confidence"], "crew_busy": bool(busy),
            "reasons": list(c["reasons"]), "confidence_notes": list(c["confidence_notes"]), "notes": notes,
            "uncertainty": dict(c["uncertainty"]), "delay_effect": None}


def _glare_intervals(series: dict[str, Any], tr: _Track, epochs: np.ndarray) -> list[dict[str, Any]]:
    out = []
    sun_alt, sun_az = series["sun_alt"], series["sun_az"]
    for code, name in ((1, "RIGHT"), (-1, "LEFT")):
        mask = (sun_alt > GLARE_SUN_ALT_DEG) & (_side_factor(sun_az, tr.heading, code) > 0)
        for s, e in _segments(mask):
            out.append({"side": name, "start": float(epochs[s]), "end": float(epochs[e])})
    return sorted(out, key=lambda g: (g["start"], g["side"]))


# =============================================================================
# Function 2: Seat actions
# =============================================================================

def _parse_seat(seat: str) -> tuple[int | None, str]:
    m = _SEAT_RE.match(seat.upper()) if isinstance(seat, str) else None
    if not m:
        return None, "UNKNOWN"
    return int(m.group(1)), SEAT_MAP.get(m.group(2), "UNKNOWN")


def _clean_seat_prefs(seat_prefs: Any) -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Current request's preferences only. Invalid input -> no seats (never someone else's wake)."""
    warnings: list[str] = []
    if seat_prefs is None:
        seat_prefs = copy.deepcopy(DEFAULT_SEAT_PREFS)
    if not isinstance(seat_prefs, dict):
        return {}, ["seat_prefs invalid; no seat actions produced"]
    out = {}
    for seat, prefs in seat_prefs.items():
        if not isinstance(seat, str):
            continue
        if not isinstance(prefs, dict):
            warnings.append(f"Preferences for {seat} invalid; treated as not opted in")
            prefs = {}
        dnd_raw = prefs.get("dnd", False)
        # Privacy-safe asymmetry: DND honoured for any truthy value; wake only for exactly "OPT_IN".
        dnd = dnd_raw is True or (isinstance(dnd_raw, str) and dnd_raw.strip().lower() in ("true", "yes", "1", "on")) \
            or (isinstance(dnd_raw, (int, float)) and not isinstance(dnd_raw, bool) and dnd_raw != 0)
        out[seat.strip().upper()] = {"dnd": bool(dnd), "window_moments": prefs.get("window_moments") == "OPT_IN"}
    return out, warnings


def _seat_actions(moments: list[dict[str, Any]], prefs: dict[str, dict[str, Any]], s: _Sched) -> dict[str, list]:
    shade_until = s.touchdown - timedelta(minutes=SHADES_OPEN_BEFORE_TD_MIN)
    out: dict[str, list] = {}
    for seat in sorted(prefs):
        p = prefs[seat]
        row, pos = _parse_seat(seat)
        actions = []
        for m in moments:
            side_word = m["side"].lower()
            entry: dict[str, Any] = {"moment_id": m["id"], "action": None, "line": None, "reason": None}
            window_side = {"LEFT_WINDOW": "LEFT", "RIGHT_WINDOW": "RIGHT"}.get(pos)
            if window_side is None:
                entry.update(action="NO_WINDOW", line="No window at this seat")
            elif window_side != m["side"] or (m["type"] == "LANDMARK" and row in WING_OBSTRUCTED_ROWS):
                entry.update(action="NOT_VISIBLE", line=f"Not visible from this seat ({m['short_title']} on {side_word})")
            elif p["dnd"]:
                entry.update(action="SUPPRESS_DND", line="Rest prioritised · check shade closed",
                             shade_closed_until=_time_obj(shade_until, s.arr_tz))
            elif p["window_moments"]:
                if m["crew_busy"]:
                    entry.update(action="NOTIFY_IF_AWAKE", line=f"If awake · mention {m['short_title']} on {side_word}",
                                 reason="Cabin landing preparation")
                else:
                    entry.update(action="WAKE_GENTLY", line=f"Wake gently · open shade · {m['short_title']} on {side_word}")
            else:
                entry.update(action="NOTIFY_IF_AWAKE", line=f"If awake · mention {m['short_title']} on {side_word}")
            if "Lower shade, direct sun" in m.get("notes", []) and entry["action"] in ("WAKE_GENTLY", "NOTIFY_IF_AWAKE"):
                entry["line"] += " · lower shade if sun is direct"
            actions.append(entry)
        wakes = sorted([a for a in actions if a["action"] == "WAKE_GENTLY"],
                       key=lambda a: -next(m["score"] for m in moments if m["id"] == a["moment_id"]))
        for a in wakes[MAX_WAKES_PER_SEAT:]:
            short = next(m for m in moments if m["id"] == a["moment_id"])
            a.update(action="NOTIFY_IF_AWAKE", line=f"If awake · mention {short['short_title']} on {short['side'].lower()}",
                     reason="One wake per seat")
        out[seat] = actions
    return out


# =============================================================================
# Function 2: Data snapshots, engine core and caching
# =============================================================================
#
# Consistency model (B7/B8):
# * Every public request loads ONE immutable data snapshot (_DataCtx): track CSV +
#   sidecar, weather cache, landmarks, plus a hash of all module configuration
#   constants. The delayed result, its zero-delay comparison, debug data and
#   provenance are all computed from that same snapshot.
# * Files are re-read only when their stat (mtime_ns, size, inode, device) changes;
#   identity is the sha256 of the bytes actually read, so a cache key always matches
#   the content used.
# * Separate worker processes have separate in-memory caches; they share only the
#   data files, whose writes are atomic (see _atomic_write_bytes).

_CACHE_LOCK = threading.RLock()
_CORE_CACHE: "OrderedDict[tuple, dict]" = OrderedDict()      # (flight, delay, date, snapshot sig) -> core
_RESULT_CACHE: "OrderedDict[tuple, dict]" = OrderedDict()    # (+ frozen seat prefs) -> result (no debug/warnings)
_LAST_GOOD_CORE: "OrderedDict[tuple, dict]" = OrderedDict()  # (flight, delay, date) -> {config_sig, data_sig, core}
_TRACK_CACHE: "OrderedDict[tuple, _Track]" = OrderedDict()
_FILE_MEMO: "OrderedDict[str, tuple]" = OrderedDict()        # path -> (stat key, digest, parsed, ok)
_INFLIGHT: dict[tuple, threading.Event] = {}                 # core key -> event (per-key single-flight)
# Constants that do not influence Window Moments calculations: mutable fixtures, file
# locations (data identity is tracked by content digest instead) and purely operational
# knobs (cache size, concurrency, network-refresh limits). Everything else is identity.
_CONFIG_EXCLUDE = frozenset({"DEMO_PERSONAS", "DATA_DIR", "TRACK_CSV_PATH", "TRACK_META_PATH",
                             "LANDMARKS_PATH", "WEATHER_CACHE_PATH", "FALLBACK_PATH",
                             "RESULT_CACHE_SIZE", "SINGLE_FLIGHT_WAIT_S", "WEATHER_TIMEOUT_S",
                             "WEATHER_MAX_TIMEOUT_S", "WEATHER_DEADLINE_SLACK_S", "WEATHER_MAX_BYTES",
                             "OPEN_METEO_URL", "FALLBACK_SNAPSHOT_DELAYS"})


def _cache_put(cache: OrderedDict, key: Any, value: Any) -> None:
    with _CACHE_LOCK:
        cache[key] = value
        cache.move_to_end(key)
        while len(cache) > RESULT_CACHE_SIZE:
            cache.popitem(last=False)


def _cache_get(cache: OrderedDict, key: Any) -> Any:
    with _CACHE_LOCK:
        if key in cache:
            cache.move_to_end(key)
            return cache[key]
    return None


def clear_window_cache() -> None:
    """Clear all memoised Window Moments results and file snapshots. Never raises."""
    with _CACHE_LOCK:
        for c in (_CORE_CACHE, _RESULT_CACHE, _LAST_GOOD_CORE, _TRACK_CACHE, _FILE_MEMO):
            c.clear()


def _config_sig() -> str:
    """Hash of every UPPER_CASE module constant (schedule, taxi times, thresholds, seeds,
    seat map, ...) read at call time. Any configuration change invalidates caches,
    last-good results and persisted fallback snapshots."""
    cfg = {k: v for k, v in globals().items()
           if k.isupper() and not k.startswith("_") and k not in _CONFIG_EXCLUDE
           and isinstance(v, (int, float, str, bool, tuple, list, dict, frozenset))}
    blob = json.dumps(cfg, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def _stat_key(path: Path) -> tuple[int, int, int, int]:
    st = path.stat()
    return (st.st_mtime_ns, st.st_size, st.st_ino, st.st_dev)


def _read_snapshot(path: Path, parse: Callable[[bytes], Any]) -> tuple[str | None, Any, bool]:
    """(digest | None if missing, parsed payload, parsed ok). One read+parse per file change.

    The parsed payload is shared between requests and must be treated as read-only.
    It is memoised only if the file's stat was identical before and after the read."""
    key = str(path)
    try:
        st1 = _stat_key(path)
    except OSError:
        return None, None, False
    memo = _cache_get(_FILE_MEMO, key)
    if memo is not None and memo[0] == st1:
        return memo[1], memo[2], memo[3]
    try:
        data = path.read_bytes()
    except OSError:
        return None, None, False
    digest = hashlib.sha256(data).hexdigest()[:16]
    try:
        parsed, ok = parse(data), True
    except Exception:
        parsed, ok = None, False
    try:
        st2 = _stat_key(path)
    except OSError:
        st2 = None
    if st1 == st2:
        _cache_put(_FILE_MEMO, key, (st1, digest, parsed, ok))
    return digest, parsed, ok


@dataclass(frozen=True)
class _DataCtx:
    config_sig: str
    track_digest: str | None
    meta_digest: str | None
    track_csv: bytes | None
    track_meta: bytes | None
    weather_digest: str | None
    weather_parsed: Any
    landmarks: tuple
    lm_status: str
    lm_digest: str | None

    @property
    def sig(self) -> tuple:
        return (self.config_sig, self.track_digest, self.meta_digest, self.weather_digest, self.lm_digest)

    def digests(self) -> dict[str, str | None]:
        return {"track_csv": self.track_digest, "track_meta": self.meta_digest,
                "weather": self.weather_digest, "landmarks": self.lm_digest}


def _track_paths(flight: str) -> tuple[Path, Path]:
    """CX524 keeps the original monkeypatchable constants; other flights use
    data/<flight>_track.csv (+ .meta.json). A missing file means synthetic-in-memory."""
    if flight == "CX524":
        return TRACK_CSV_PATH, TRACK_META_PATH
    stem = f"{flight.lower()}_track"
    return DATA_DIR / f"{stem}.csv", DATA_DIR / f"{stem}.meta.json"


def _load_data_ctx(flight: str) -> _DataCtx:
    csv_path, meta_path = _track_paths(flight)
    t_dig, t_bytes, _ = _read_snapshot(csv_path, lambda b: b)
    m_dig, m_bytes, _ = _read_snapshot(meta_path, lambda b: b)
    w_dig, w_parsed, w_ok = _read_snapshot(WEATHER_CACHE_PATH, _parse_weather_bytes)
    if w_dig is not None and not w_ok:
        w_parsed = {"meta": {}, "points": None}          # unreadable JSON -> "assumed", digest kept
    l_dig, l_parsed, l_ok = _read_snapshot(LANDMARKS_PATH, _parse_landmarks_bytes)
    landmarks, lm_status = (l_parsed if (l_ok and l_parsed) else ([], "missing"))
    return _DataCtx(_config_sig(), t_dig, m_dig, t_bytes, m_bytes, w_dig, w_parsed,
                    tuple(landmarks), lm_status, l_dig)


def _weather_for(ctx: _DataCtx, demo_date: date) -> _Weather:
    return _weather_from_parsed(ctx.weather_parsed, demo_date, (ctx.weather_digest,))


def _synthetic_track(s: _Sched, note: str | None) -> _Track:
    return _resample_track(generate_synthetic_track(s.runway_minutes, flight=s.flight), "synthetic", note,
                           max_minutes=s.runway_minutes)


def _track_for(ctx: _DataCtx, s: _Sched) -> _Track:
    """Validated, resampled track restricted to the scheduled airborne period [0, runway]."""
    key = (s.flight, ctx.track_digest, ctx.meta_digest, round(s.runway_minutes, 3), ctx.config_sig)
    cached = _cache_get(_TRACK_CACHE, key)
    if cached is not None:
        return cached
    rows, source, note = _parse_track_bytes(ctx.track_csv, ctx.track_meta)
    tol = TRACK_DURATION_TOLERANCE_MIN
    tr: _Track | None = None
    if rows is not None and source == "synthetic":
        dur = rows[-1]["min_since_takeoff"] - rows[0]["min_since_takeoff"]
        if rows[0]["min_since_takeoff"] > tol or abs(dur - s.runway_minutes) > tol:
            rows, note = None, "Synthetic track does not match the schedule; regenerated in memory"
    elif rows is not None:  # recorded: keep its takeoff-relative times, never fabricate coverage
        first, last = rows[0]["min_since_takeoff"], rows[-1]["min_since_takeoff"]
        notes = [note] if note else []
        if first > tol:
            notes.append(f"Recorded track starts {first:.0f} min after takeoff; earlier flight not covered")
        if last > s.runway_minutes + tol:
            notes.append(f"Recorded track runs {last - s.runway_minutes:.0f} min past scheduled touchdown; "
                         "later samples ignored")
        elif last < s.runway_minutes - tol:
            notes.append(f"Recorded track ends {s.runway_minutes - last:.0f} min before scheduled touchdown")
        try:
            tr = _resample_track(rows, source, "; ".join(notes) or None, max_minutes=s.runway_minutes)
        except ValueError:
            rows, note = None, "Recorded track does not cover the scheduled airborne period; synthetic track used"
    if tr is None:
        tr = _synthetic_track(s, note) if rows is None else _resample_track(rows, source, note,
                                                                             max_minutes=s.runway_minutes)
    _cache_put(_TRACK_CACHE, key, tr)
    return tr


def _get_track(s: _Sched) -> _Track:
    """Compatibility helper: track for ``s`` from the current files."""
    return _track_for(_load_data_ctx(s.flight), s)


def _weather_coverage(weather: _Weather, tr: _Track, epochs: np.ndarray, landmarks: list[dict],
                      required: dict[str, list[str]]) -> dict[str, dict[str, Any]]:
    out = {}
    for lm in landmarks:
        req = required.get(lm["id"], [lm["id"]])
        missing = [k for k in req if k not in weather.points] if weather.status != "assumed" else list(req)
        near = _haversine_km(tr.lat, tr.lon, lm["lat"], lm["lon"]) <= RANGE_MAX_KM + LANDMARK_PREFILTER_MARGIN_KM
        assumed_hours = False
        if near.any() and weather.status != "assumed":
            _, _, mask = _cloud_series(weather, lm["id"], epochs[near], req)
            assumed_hours = bool(mask.any())
        out[lm["id"]] = {"required_points": list(req), "missing_points": missing,
                         "complete": weather.status != "assumed" and not missing and not assumed_hours}
    return out


def _compute_core(s: _Sched, data: _DataCtx) -> dict[str, Any]:
    """Expensive, preference-free computation for one (flight, delay, date, data snapshot)."""
    tr = _track_for(data, s)
    weather = _weather_for(data, s.departure_date)
    landmarks, lm_status = [dict(lm) for lm in data.landmarks], data.lm_status
    required = {k: [] for k in (lm["id"] for lm in landmarks)}
    for key in _landmark_weather_points(tr, landmarks):
        required.setdefault(key.split("_los_mid")[0], []).append(key)
    mid_epoch = s.midpoint.timestamp()
    moon = ephem.Moon(ephem.Date(mid_epoch / 86400.0 + _EPHEM_UNIX_EPOCH))
    illum = float(moon.phase) / 100.0
    ctx = _Ctx(landmarks, weather, illum > MOON_MIN_ILLUM, illum, required)
    base_epochs = s.takeoff.timestamp() + tr.t_min * 60.0
    nominal = _evaluate_run(ctx, tr, tr.lat, tr.lon, base_epochs, keep_series=True)
    rng = np.random.default_rng(MC_SEED)
    jitters = rng.uniform(-MC_TIME_JITTER_MIN, MC_TIME_JITTER_MIN, MC_RUNS)
    laterals = rng.uniform(-MC_LATERAL_KM, MC_LATERAL_KM, MC_RUNS)
    runs = []
    for jit, lat_km in zip(jitters, laterals):
        la, lo = _offset_track(tr.lat, tr.lon, tr.heading, float(lat_km))
        runs.append(_evaluate_run(ctx, tr, la, lo, base_epochs + float(jit) * 60.0, ref=nominal["series"])["events"])
    cands = _aggregate(nominal["events"], runs, weather)
    t0, t1 = s.takeoff.timestamp(), s.touchdown.timestamp()
    for c in cands:
        c["out_of_domain"] = c["start"] >= t1 or c["end"] <= t0
    kept, considered = _select(cands)
    cand_ids = {c["id"] for c in cands}
    blocked = {k: v for k, v in nominal["blocked"].items() if k not in cand_ids}
    for k, v in sorted(blocked.items()):
        considered.append({"id": k, "title": v["title"], "side": v["side"], "score": 0.0, "confidence": None,
                           "lighting": v["lighting"], "emitted": False, "why_not": v["why_not"]})
    glare_raw = _glare_intervals(nominal["series"], tr, base_epochs)
    moments = [_format_moment(c, s, glare_raw) for c in kept]
    glare = [{"side": g["side"],
              "start": _time_obj(_round_minute(_from_epoch(g["start"])), s.zone_for(_from_epoch(g["start"]))),
              "end": _time_obj(_round_minute(_from_epoch(g["end"])), s.zone_for(_from_epoch(g["start"]))),
              "note": "Lower shade, direct sun"} for g in glare_raw]
    coverage = _weather_coverage(weather, tr, base_epochs, landmarks, required)
    warnings = [x for x in (tr.note, weather.note if weather.status != "live" else None) if x]
    for lm in landmarks:
        cov = coverage[lm["id"]]
        if weather.status != "assumed" and not cov["complete"]:
            warnings.append(f"Forecast incomplete for {lm['name']}: cloud assumed where missing")
    if lm_status != "file":
        warnings.append("Landmark catalogue missing; sky events only")
    core = {
        "flight": s.flight, "demo_date": s.departure_date.isoformat(), "delay_minutes": s.delay,
        "moments": moments, "considered": considered, "glare": glare,
        "candidates": {c["id"]: {"lighting": c["lighting"], "side": c["side"], "key": c["key"],
                                 "emitted": any(m["id"] == c["id"] for m in moments),
                                 "why_not": next((x["why_not"] for x in considered if x["id"] == c["id"]), None)}
                       for c in cands} | {k: {"lighting": v["lighting"], "side": v["side"], "key": v["key"],
                                               "emitted": False, "why_not": v["why_not"]} for k, v in blocked.items()},
        "data_sources": {"track": tr.source, "weather": weather.status, "ephemeris": "pyephem",
                         "landmarks": lm_status, "weather_forecast_for_date": weather.forecast_for,
                         "weather_fetched_at_utc": weather.fetched_at, "weather_coverage": coverage,
                         "config_sig": data.config_sig, "data_digests": data.digests()},
        "warnings": warnings,
        "debug": _debug_payload(ctx, tr, base_epochs, nominal["series"], landmarks),
    }
    return _json_safe(core)


def _debug_payload(ctx: _Ctx, tr: _Track, epochs: np.ndarray, series: dict[str, Any],
                   landmarks: list[dict]) -> dict[str, Any]:
    step = max(int(round(DEBUG_SAMPLE_EVERY_MIN * 60 / SAMPLE_SECONDS)), 1)
    idx = np.arange(0, epochs.size, step)
    score_keys = sorted(k for k in series if not k.endswith(("_alt", "_az")))
    lm_geo = {}
    for lm in landmarks:
        mask = np.zeros(epochs.size, dtype=bool)
        mask[idx] = True
        lsun, _ = _altaz_series(ephem.Sun, lm["lat"], lm["lon"], lm["elev_m"], epochs, mask)
        per = {}
        for i in idx.tolist():
            inv = _GEOD.Inverse(tr.lat[i], tr.lon[i], lm["lat"], lm["lon"])
            rel, _, _ = _side_offset(inv["azi1"] % 360, tr.heading[i])
            per[i] = {"range_km": _km(inv["s12"] / 1000), "rel_bearing": _r1(float(rel)),
                      "elev_deg": _r1(float(elevation_angle_deg(lm["elev_m"], tr.alt[i], inv["s12"]))),
                      "lighting": _lighting_state(float(lsun[i]))}
        lm_geo[lm["id"]] = per
    samples = []
    for i in idx.tolist():
        side = side_of(float(series["sun_az"][i]), float(tr.heading[i]))
        row = {"t_utc": _iso_utc(_from_epoch(epochs[i])), "lat": round(float(tr.lat[i]), 4),
               "lon": round(float(tr.lon[i]), 4), "alt_m": int(round(tr.alt[i])), "heading": _r1(tr.heading[i]),
               "in_turn": bool(tr.in_turn[i]), "sun_alt": _r1(series["sun_alt"][i]), "sun_az": _r1(series["sun_az"][i]),
               "sun_side": side}
        for lm_id, per in lm_geo.items():
            for k, v in per[i].items():
                row[f"{lm_id}_{k}"] = v
        row["scores"] = {k: _r2(float(series[k][i])) for k in score_keys}
        samples.append(row)
    return {"samples": samples, "sample_every_min": DEBUG_SAMPLE_EVERY_MIN, "moon_illuminated": _r2(ctx.moon_illum)}


def _get_core(s: _Sched, data: _DataCtx) -> dict[str, Any]:
    """Core for this key, computing it at most once concurrently (per-key single-flight).

    Measured motivation: 8 concurrent identical cold requests previously ran 16 core
    computations (~6 s under the GIL). Concurrent requests for the SAME key wait for
    the leader; different keys never block each other. If the leader raises, waiters
    retry (one becomes the new leader), so a failure is never cached."""
    key = (s.flight, s.delay, s.departure_date.isoformat(), data.sig)
    while True:
        core = _cache_get(_CORE_CACHE, key)
        if core is not None:
            break
        with _CACHE_LOCK:
            event = _INFLIGHT.get(key)
            leader = event is None
            if leader:
                event = _INFLIGHT[key] = threading.Event()
        if leader:
            try:
                core = _compute_core(s, data)
                _cache_put(_CORE_CACHE, key, core)
            finally:
                with _CACHE_LOCK:
                    _INFLIGHT.pop(key, None)
                event.set()
            break
        event.wait(SINGLE_FLIGHT_WAIT_S)
    _cache_put(_LAST_GOOD_CORE, (s.flight, s.delay, s.departure_date.isoformat()),
               {"config_sig": data.config_sig, "data_sig": data.sig, "core": core})
    return core


def _delay_effects(core: dict[str, Any], base: dict[str, Any]) -> tuple[dict[str, str | None], list[dict]]:
    """Compare against the zero-delay result: lighting, side or presence changes only."""
    effects: dict[str, str | None] = {}
    bc = base["candidates"]
    for m in core["moments"]:
        b = bc.get(m["id"])
        other_side = next((v for k, v in bc.items() if v["key"] == m["id"].rsplit("_", 1)[0]
                           and v["side"] != m["side"]), None)
        if b is None:
            effects[m["id"]] = (f"Delay moved this to the {m['side'].lower()} side" if other_side
                                else "Only visible because of the delay")
        elif b["lighting"] and m["lighting"] and b["lighting"] != m["lighting"]:
            effects[m["id"]] = (f"Delay moved this pass from {LIGHTING_PHRASES[b['lighting']]} "
                                f"to {LIGHTING_PHRASES[m['lighting']]}")
        elif not b["emitted"]:
            effects[m["id"]] = f"Recommended only because of the delay (without it: {(b['why_not'] or 'not shown').lower()})"
        else:
            effects[m["id"]] = None
    removed = []
    now_ids = {m["id"] for m in core["moments"]}
    for bm in base["moments"]:
        if bm["id"] not in now_ids:
            cur = core["candidates"].get(bm["id"])
            why = (cur or {}).get("why_not") or "no longer visible"
            removed.append({"id": bm["id"], "title": bm["title"], "side": bm["side"],
                            "note": f"Not recommended after the delay ({why.lower()})"})
    return effects, removed


_EMPTY_SOURCES = {"track": "unknown", "weather": "unknown", "ephemeris": "unavailable", "landmarks": "unknown"}


def _window_result(s: _Sched, moments: list[dict], prefs: dict, *, removed: list | None = None,
                   glare: list | None = None, considered: list | None = None, data_sources: dict | None = None,
                   warnings: list | None = None, degraded: bool = False, error: str | None = None) -> dict[str, Any]:
    """The one place the window-1 response shape is built (normal, last-good, fallback, empty)."""
    return {
        "schema_version": SCHEMA_VERSIONS["window"], "supported": True, "flight": s.flight,
        "demo_date": s.departure_date.isoformat(), "delay_minutes": s.delay, "schedule": _schedule_dict(s),
        "moments": moments, "delay_removed": removed or [], "seat_actions": _seat_actions(moments, prefs, s),
        "glare": glare or [], "considered": considered or [],
        "data_sources": data_sources or dict(_EMPTY_SOURCES),
        "estimates_note": ESTIMATES_NOTE, "warnings": list(warnings or []),
        "degraded": degraded, "error": error,
    }


def _assemble(core: dict[str, Any], s: _Sched, prefs: dict, base: dict[str, Any] | None,
              *, extra_warnings: list[str] | None = None, degraded: bool = False,
              error: str | None = None) -> dict[str, Any]:
    core = copy.deepcopy(core)
    moments = core["moments"]
    removed: list[dict] = []
    if base is not None and s.delay > 0:
        effects, removed = _delay_effects(core, base)
        for m in moments:
            m["delay_effect"] = effects.get(m["id"])
    return _window_result(s, moments, prefs, removed=removed, glare=core["glare"], considered=core["considered"],
                          data_sources=core["data_sources"], warnings=core["warnings"] + list(extra_warnings or []),
                          degraded=degraded, error=error)


# ---- Fallback snapshot validation (F2/B7) -----------------------------------

def _is_time_obj(v: Any) -> bool:
    return isinstance(v, dict) and _parse_utc(v.get("utc")) is not None \
        and isinstance(v.get("display"), str) and bool(v.get("display").strip())


def _is_str_list(v: Any, nonempty: bool = False) -> bool:
    return isinstance(v, list) and all(isinstance(x, str) for x in v) and (bool(v) or not nonempty)


def _valid_fallback_moment(m: Any, s: _Sched) -> bool:
    """Every field a consumer reads must be present, typed, finite and ordered."""
    if not isinstance(m, dict):
        return False
    if not (isinstance(m.get("id"), str) and m["id"] and m.get("type") in ("SKY", "LANDMARK")
            and isinstance(m.get("title"), str) and m["title"].strip()
            and isinstance(m.get("icon"), str) and m["icon"]
            and isinstance(m.get("short_title"), str) and m["short_title"].strip()
            and m.get("side") in ("LEFT", "RIGHT")
            and (m.get("lighting") is None or m.get("lighting") in LIGHTING_ORDER)
            and all(_is_time_obj(m.get(k)) for k in ("window_start", "peak", "window_end", "crew_alert_at"))
            and isinstance(m.get("score"), (int, float)) and not isinstance(m.get("score"), bool)
            and math.isfinite(float(m["score"])) and MIN_SCORE <= float(m["score"]) <= 1.0
            and m.get("confidence") in ("HIGH", "MEDIUM")
            and _is_str_list(m.get("reasons"), nonempty=True) and _is_str_list(m.get("confidence_notes"))
            and _is_str_list(m.get("notes")) and isinstance(m.get("uncertainty"), dict)
            and (m.get("delay_effect") is None or isinstance(m.get("delay_effect"), str))):
        return False
    ws, pk, we, al = (_parse_utc(m[k]["utc"]) for k in ("window_start", "peak", "window_end", "crew_alert_at"))
    return (s.takeoff <= ws <= pk <= we <= s.touchdown
            and al == ws - timedelta(minutes=WAKE_LEAD_MIN))


def _fallback_snapshot(s: _Sched, config_sig: str) -> tuple[dict | None, str]:
    """(snapshot | None, reason). Exact flight/date/delay AND configuration match required;
    every moment must validate, otherwise the whole snapshot is rejected."""
    try:
        raw = _read_json(FALLBACK_PATH)
    except (OSError, ValueError):
        return None, "Fallback file missing or unreadable"
    if not isinstance(raw, dict) or raw.get("schema_version") != SCHEMA_VERSIONS["fallback"] \
            or not isinstance(raw.get("snapshots"), list):
        return None, "Fallback file has an unsupported schema"
    for snap in raw["snapshots"]:
        if not (isinstance(snap, dict) and snap.get("flight") == s.flight
                and snap.get("demo_date") == s.departure_date.isoformat() and snap.get("delay_minutes") == s.delay):
            continue
        if snap.get("config_sig") != config_sig:
            return None, "Fallback snapshot was computed with a different configuration"
        moments = snap.get("moments")
        if not isinstance(moments, list) or len(moments) > MAX_MOMENTS \
                or not all(_valid_fallback_moment(m, s) for m in moments) \
                or len({m["id"] for m in moments}) != len(moments):
            return None, "Fallback snapshot failed validation"
        return snap, "ok"
    return None, "No fallback snapshot for this flight, date and delay"


def _degraded(s: _Sched, prefs: dict, warnings: list[str], error: str) -> dict[str, Any]:
    """Recovery chain; each step is independently guarded and returns the full window-1 shape."""
    try:
        cfg = _config_sig()
    except Exception:
        cfg = None
    try:
        last = _cache_get(_LAST_GOOD_CORE, (s.flight, s.delay, s.departure_date.isoformat()))
        if last is not None and cfg is not None and last["config_sig"] == cfg:
            note = ["Showing last good result (computed from an earlier data snapshot)"]
            base = None
            if s.delay > 0:   # delay comparison only against the SAME snapshot's zero-delay core
                b = _cache_get(_LAST_GOOD_CORE, (s.flight, 0, s.departure_date.isoformat()))
                base = b["core"] if b is not None and b["data_sig"] == last["data_sig"] else None
                if base is None:
                    note.append("Delay comparison unavailable in this recovery mode")
            return _json_safe(_assemble(last["core"], s, prefs, base, extra_warnings=warnings + note,
                                        degraded=True, error=error))
    except Exception:
        pass
    reason = "Configuration unavailable"
    try:
        snap, reason = _fallback_snapshot(s, cfg) if cfg is not None else (None, reason)
        if snap is not None:
            moments = copy.deepcopy(snap["moments"])
            for m in moments:
                alert = _parse_utc(m["crew_alert_at"]["utc"])
                m["crew_busy"] = alert >= s.touchdown - timedelta(minutes=CREW_BUSY_BEFORE_TD_MIN)
            sources = {**_EMPTY_SOURCES, **(snap.get("data_sources") if isinstance(snap.get("data_sources"), dict) else {}),
                       "fallback": "snapshot"}
            return _json_safe(_window_result(s, moments, prefs, data_sources=sources, degraded=True, error=error,
                                             warnings=warnings + ["Showing pre-computed fallback snapshot"]))
    except Exception:
        reason = "Fallback snapshot unusable"
    return _json_safe(_window_result(s, [], prefs, degraded=True, error=error,
                                     warnings=warnings + [f"{reason}; no moments shown"]))


def _compute_result(s: _Sched, data: _DataCtx, prefs: dict) -> tuple[dict, dict]:
    """(result without request warnings/debug, core). Delayed result and zero-delay
    comparison come from the same data snapshot."""
    rkey = (s.flight, s.delay, s.departure_date.isoformat(), data.sig, json.dumps(prefs, sort_keys=True))
    core = _get_core(s, data)
    result = _cache_get(_RESULT_CACHE, rkey)
    if result is None:
        base = None
        if s.delay > 0:
            s0, _ = _schedule_core(s.flight, 0, s.departure_date.isoformat())
            base = _get_core(s0, data)
        result = _json_safe(_assemble(core, s, prefs, base))
        _cache_put(_RESULT_CACHE, rkey, result)
    return result, core


@_strict_json
def get_oag_and_window_moments(flight_number: str, delay_minutes: int, seat_prefs: dict | None = None,
                               demo_date: str | None = None, debug: bool = False) -> dict:
    """Function 2: Window Moments engine (legacy name; no live OAG integration).

    Inputs: flight number, delay minutes (clamped 0..600; strings such as "40" are
    treated as 0, integral floats accepted), seat_prefs
    ``{seat: {"window_moments": "OPT_IN"?, "dnd": bool?}}`` (None -> demo
    defaults; invalid -> no seat actions + warning), optional local departure
    date "YYYY-MM-DD", and ``debug`` (adds per-sample data every 2 min).
    Output (schema "window-1"): schedule, up to MAX_MOMENTS ``moments`` (estimate
    windows with peak, crew_alert_at, score, confidence, reasons, delay_effect),
    ``seat_actions`` per seat, ``glare``, ``considered`` (why each candidate was
    or wasn't shown), ``data_sources`` (provenance incl. weather coverage),
    ``warnings``, ``degraded``, ``error``. Zero moments is a valid outcome.
    Failure: unknown flight -> ``supported: false``. Engine errors -> last good
    result for this flight/delay/date under the SAME configuration, else an
    exactly matching validated fallback snapshot, else empty moments; always the
    full window-1 shape, seat actions recomputed for the CURRENT seat_prefs, and
    ``degraded: true``. Never raises. No network.
    """
    try:
        s, err = _schedule_core(flight_number, delay_minutes, demo_date)
        if s is None:
            return {"schema_version": SCHEMA_VERSIONS["window"], "supported": False,
                    "flight": _normalize_flight(flight_number), "reason": err, "moments": [],
                    "seat_actions": {}, "degraded": False, "error": None}
        prefs, warnings = _clean_seat_prefs(seat_prefs)
    except Exception as exc:  # pragma: no cover - defensive
        return {"schema_version": SCHEMA_VERSIONS["window"], "supported": False, "moments": [],
                "seat_actions": {}, "degraded": True, "error": type(exc).__name__}
    try:
        data = _load_data_ctx(s.flight)
        result, core = _compute_result(s, data, prefs)
        out = copy.deepcopy(result)
        out["warnings"] = out["warnings"] + warnings          # request-specific, never cached
        if debug:
            out["debug"] = copy.deepcopy(core["debug"])
        return out
    except Exception as exc:
        try:
            return _degraded(s, prefs, warnings, f"Window engine error ({type(exc).__name__})")
        except Exception as exc2:  # pragma: no cover - defensive
            try:
                return _window_result(s, [], {}, degraded=True, error=f"Window engine error ({type(exc2).__name__})",
                                      warnings=warnings)
            except Exception:
                return {"schema_version": SCHEMA_VERSIONS["window"], "supported": True, "flight": s.flight,
                        "demo_date": s.departure_date.isoformat(), "delay_minutes": s.delay,
                        "schedule": get_flight_schedule(s.flight, s.delay, s.departure_date.isoformat()),
                        "moments": [], "delay_removed": [], "seat_actions": {}, "glare": [], "considered": [],
                        "data_sources": dict(_EMPTY_SOURCES), "estimates_note": ESTIMATES_NOTE,
                        "warnings": list(warnings), "degraded": True, "error": type(exc2).__name__}


# =============================================================================
# Weather refresh (the ONLY network call)
# =============================================================================

_REFRESH_SLOT = threading.BoundedSemaphore(1)   # at most ONE in-flight fetch worker per process


def _bounded_get_json(url: str, params: dict[str, str], timeout_s: float) -> Any:
    """GET + JSON decode with a hard wall-clock bound for the CALLER.

    A single short-lived worker thread performs the request with
    ``timeout=(timeout_s, timeout_s)`` and ``stream=True``, reading the body in chunks
    and aborting when the monotonic deadline passes, a cancel flag is set, or the body
    exceeds WEATHER_MAX_BYTES. The caller waits at most ``timeout_s`` (join timeout),
    then returns TimeoutError. The worker never writes files: only the caller publishes
    results, so a late worker cannot overwrite the cache. Limits: DNS resolution
    (getaddrinfo) cannot be interrupted, so a stalled worker may outlive the call until
    the OS gives up; while it is alive the slot stays taken and further refreshes fail
    fast with "refresh already in progress" (no unbounded thread accumulation).
    """
    if not _REFRESH_SLOT.acquire(blocking=False):
        raise RuntimeError("weather refresh already in progress")
    deadline = time.monotonic() + timeout_s
    cancel = threading.Event()
    box: dict[str, Any] = {}

    def work() -> None:
        try:
            import requests  # local import: no network library work at module import time
            with requests.get(url, params=params, timeout=(timeout_s, timeout_s), stream=True) as resp:
                resp.raise_for_status()
                buf = bytearray()
                for chunk in resp.iter_content(chunk_size=8192):
                    if cancel.is_set() or time.monotonic() > deadline:
                        raise TimeoutError("weather fetch exceeded its deadline")
                    buf += chunk
                    if len(buf) > WEATHER_MAX_BYTES:
                        raise ValueError("weather response too large")
            box["data"] = json.loads(bytes(buf).decode("utf-8"))
        except BaseException as exc:  # noqa: BLE001 - reported to the caller, never re-raised in the thread
            box["error"] = exc
        finally:
            _REFRESH_SLOT.release()

    worker = threading.Thread(target=work, name="weather-refresh", daemon=True)
    worker.start()
    worker.join(max(deadline - time.monotonic(), 0.0))
    if worker.is_alive():
        cancel.set()
        raise TimeoutError(f"weather fetch did not finish within {timeout_s:g} s")
    if "error" in box:
        raise box["error"]
    if time.monotonic() > deadline + WEATHER_DEADLINE_SLACK_S:
        raise TimeoutError(f"weather fetch did not finish within {timeout_s:g} s")
    return box.get("data")


def _associate_locations(pts: dict[str, tuple[float, float]], data: list[Any]) -> dict[str, dict]:
    """Map each requested point to a returned location BY COORDINATES (Open-Meteo does not
    document response order and returns grid-cell centres a few km from the request).
    Each returned item must be within WEATHER_GRID_MATCH_KM of exactly one requested point,
    one-to-one; otherwise the payload is rejected (raises ValueError)."""
    if len(data) != len(pts):
        raise ValueError("forecast location count does not match the request")
    keys = list(pts)
    taken: dict[str, dict] = {}
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("forecast location is not an object")
        la, lo = item.get("latitude"), item.get("longitude")
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in (la, lo)):
            raise ValueError("forecast location has no coordinates")
        d = {k: float(_haversine_km(np.array([pts[k][0]]), np.array([pts[k][1]]), la, lo)[0]) for k in keys}
        near = [k for k in keys if d[k] <= WEATHER_GRID_MATCH_KM]
        if len(near) != 1 or near[0] in taken:
            raise ValueError("forecast locations cannot be matched unambiguously to the request")
        taken[near[0]] = item
    return taken


@_strict_json
def refresh_weather_cache(demo_date: str | None = None, *, cache_path: str | Path | None = None,
                          timeout_s: float = WEATHER_TIMEOUT_S) -> dict:
    """Fetch cloud cover from Open-Meteo and write ``cached_weather.json``.

    Call at server startup and on /api/reset ONLY (never per request, never on
    the delay trigger). Fetches hourly low/mid/high cloud at each landmark and
    at the line-of-sight midpoint, for the day before to the day after
    ``demo_date``, in one request. The caller waits at most ``timeout_s`` seconds
    (see ``_bounded_get_json`` for the exact guarantee and its DNS limit).
    Output: ``{"schema_version", "ok", "weather": "live"|None, "forecast_for_date",
    "fetched_at_utc", "points", "coverage_complete", "missing_points", "written_to",
    "elapsed_s", "error"}``.
    Failure (bad arguments, offline, timeout, HTTP error, unmatched or invalid
    payload, write failure): existing cache left untouched, ``ok: false``. Never raises.
    """
    base = {"schema_version": SCHEMA_VERSIONS["weather_refresh"], "ok": False, "weather": None,
            "forecast_for_date": None, "fetched_at_utc": None, "points": [], "coverage_complete": False,
            "missing_points": [], "written_to": None, "elapsed_s": None, "error": None}
    started = time.monotonic()
    try:
        if cache_path is not None and not isinstance(cache_path, (str, os.PathLike)):
            return {**base, "error": "Invalid cache_path (expected a path)"}
        target = Path(cache_path) if cache_path is not None else WEATHER_CACHE_PATH
        if isinstance(timeout_s, bool) or not isinstance(timeout_s, (int, float)) \
                or not math.isfinite(float(timeout_s)) or not (0 < float(timeout_s) <= WEATHER_MAX_TIMEOUT_S):
            return {**base, "error": f"Invalid timeout_s (expected 0 < seconds <= {WEATHER_MAX_TIMEOUT_S})"}
        s, err = _schedule_core(DEMO_FLIGHT, 0, demo_date)
        if s is None:
            return {**base, "error": err}
        base["forecast_for_date"] = s.departure_date.isoformat()
        pts: dict[str, tuple[float, float]] = {}
        for fl in SCHEDULES:                          # union of points needed by every supported flight
            sf, _ = _schedule_core(fl, 0, demo_date)
            data_ctx = _load_data_ctx(fl)
            for k, v in _landmark_weather_points(_track_for(data_ctx, sf),
                                                 [dict(lm) for lm in data_ctx.landmarks]).items():
                pts.setdefault(k, v)
        if not pts:
            return {**base, "error": "No landmarks to forecast"}
        keys = list(pts)
        params = {"latitude": ",".join(f"{pts[k][0]:.4f}" for k in keys),
                  "longitude": ",".join(f"{pts[k][1]:.4f}" for k in keys),
                  "hourly": "cloud_cover_low,cloud_cover_mid,cloud_cover_high", "timezone": "GMT",
                  "start_date": (s.departure_date - timedelta(days=1)).isoformat(),
                  "end_date": (s.departure_date + timedelta(days=1)).isoformat()}
        data = _bounded_get_json(OPEN_METEO_URL, params, float(timeout_s))
        data = data if isinstance(data, list) else [data]
        matched = _associate_locations(pts, data)
        points = {}
        for k in keys:
            h = matched[k].get("hourly")
            if not isinstance(h, dict) or not isinstance(h.get("time"), list):
                continue
            times = [t if (isinstance(t, str) and t.endswith("Z")) else (f"{t}Z" if isinstance(t, str) else t)
                     for t in h["time"]]
            points[k] = {"lat": pts[k][0], "lon": pts[k][1],
                         "grid_lat": matched[k].get("latitude"), "grid_lon": matched[k].get("longitude"),
                         "hourly": {"time": times, "cloud_cover_low": h.get("cloud_cover_low"),
                                    "cloud_cover_mid": h.get("cloud_cover_mid"),
                                    "cloud_cover_high": h.get("cloud_cover_high")}}
        fetched = datetime.now(_UTC).strftime("%Y-%m-%dT%H:%M:%SZ")  # metadata only, never used in calculations
        payload = {"schema_version": SCHEMA_VERSIONS["weather_cache"], "source": OPEN_METEO_SOURCE,
                   "forecast_for_date": s.departure_date.isoformat(), "fetched_at_utc": fetched,
                   "note": "Fetched by refresh_weather_cache()", "points": points}
        valid = _validate_weather(payload)
        if valid is None:
            return {**base, "error": "Forecast payload failed validation", "elapsed_s": round(time.monotonic() - started, 2)}
        missing = [k for k in keys if k not in valid]
        _write_json_atomic(target, payload)
        return {**base, "ok": True, "weather": "live", "fetched_at_utc": fetched, "points": keys,
                "coverage_complete": not missing, "missing_points": missing, "written_to": str(target),
                "elapsed_s": round(time.monotonic() - started, 2)}
    except Exception as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        detail = f"{type(exc).__name__}{f' {status}' if status else ''}"
        return {**base, "error": f"Weather refresh failed ({detail}); existing cache kept",
                "elapsed_s": round(time.monotonic() - started, 2)}


# =============================================================================
# CLI
# =============================================================================

@_strict_json
def write_fallback_snapshots(path: str | Path | None = None) -> dict:
    """Write ``fallback_window_moments.json`` from FRESH engine computations.

    One data snapshot is used for all delays in FALLBACK_SNAPSHOT_DELAYS; each
    snapshot records the configuration hash and data digests it was computed from.
    Moments only (no seat actions); seat actions are always recomputed for the
    current request. Output ``{"ok", "written_to", "snapshots", "error"}``. Never raises.
    """
    try:
        if path is not None and not isinstance(path, (str, os.PathLike)):
            return {"ok": False, "error": "Invalid path"}
        target = Path(path) if path is not None else FALLBACK_PATH
        snaps = []
        for fl in SCHEDULES:
            data = _load_data_ctx(fl)
            for d in FALLBACK_SNAPSHOT_DELAYS:
                s, err = _schedule_core(fl, d, DEMO_DATE)
                if s is None:
                    return {"ok": False, "error": err}
                result, _ = _compute_result(s, data, {})
                snaps.append({"flight": s.flight, "demo_date": s.departure_date.isoformat(),
                              "delay_minutes": s.delay, "config_sig": data.config_sig,
                              "data_digests": data.digests(), "moments": result["moments"],
                              "data_sources": result["data_sources"]})
        _write_json_atomic(target, _json_safe({
            "schema_version": SCHEMA_VERSIONS["fallback"],
            "note": "Last-resort snapshot generated by spatial_and_flight.py --write-fallback from fresh "
                    "computations. Used only when the engine fails AND flight/date/delay AND config_sig match "
                    "exactly. Seat actions are always recomputed for the current request.",
            "snapshots": snaps}))
        return {"ok": True, "written_to": str(target), "snapshots": len(snaps), "error": None}
    except Exception as exc:
        return {"ok": False, "error": f"Writing fallback failed ({type(exc).__name__})"}


def _print_demo() -> None:
    def h(title: str) -> None:
        print("\n" + "=" * 78 + f"\n{title}\n" + "=" * 78)

    h("1. Schedule (CX524) at delay 0 and +40")
    for d in (0, 40):
        sc = get_flight_schedule("CX524", d)
        print(f"  delay {d:>3}: gate dep {sc['gate_departure']['display']} | takeoff {sc['takeoff']['display']} | "
              f"touchdown {sc['touchdown']['display']} | gate arr {sc['gate_arrival']['display']} "
              f"| block {sc['block_minutes']} min | UTC dep {sc['gate_departure']['utc']}")

    personas = get_demo_personas()
    h("2. Mrs. Kapoor (12K): prompt -> YES_SAME -> service plan")
    kap = personas["12K"]
    p = get_assistance_prompt(kap)
    print(f"  mode={p['mode']} | {p['headline']}\n  {p['subline']}")
    print(f"  options: {[(o['id'], o['preselected']) for o in p['options']]} | deadline {p['deadline']['display']}"
          f" | late={p['is_late']} | codes={p['reason_codes']}")
    print(f"  legacy shim on the unchanged fixture: active={get_offline_terminal_maps(0)['active']}")
    res = apply_assistance_response(kap, "CX524", {"option": "YES_SAME"})
    print(f"  YES_SAME -> request={res['request']} | events={[e['event'] for e in res['audit_events']]}")
    kap_after = {**copy.deepcopy(kap), "assistance": res["assistance"]}   # caller applies result to a copy
    for d in (0, 40):
        plan = build_assistance_service_plan(kap_after, "CX524", d)
        print(f"  plan delay {d}: active={plan['active']} simulated={plan['simulated']} note={plan['delay_note']}")
        for leg in plan["legs"]:
            orig = f" (was {leg['original_time']['display']})" if "original_time" in leg else ""
            print(f"    - {leg['label']:<28} {leg['time']['display']}{orig} [{leg['status']}] {leg['owner']}")
        if plan["crew_brief"]:
            print(f"    crew brief: {[l['line'] for l in plan['crew_brief']['lines']]}")

    h("3. Mr. Mathur (11A): expired temporary need -> NO")
    mat = personas["11A"]
    p = get_assistance_prompt(mat)
    print(f"  mode={p['mode']} | {p['headline']} | preselected={[o['id'] for o in p['options'] if o['preselected']]}")
    res = apply_assistance_response(mat, "CX524", {"option": "NO"})
    print(f"  NO -> need={res['assistance'].get('need') if res['assistance'] else None} | "
          f"events={[e['event'] for e in res['audit_events']]}")

    h("4. Window Moments: delay 0 vs +40 (default seat prefs + 11K DND example)")
    prefs = {**DEFAULT_SEAT_PREFS, "11K": {"dnd": True}}
    results = {d: get_oag_and_window_moments("CX524", d, prefs) for d in (0, 40)}
    for d, r in results.items():
        sched = r.get("schedule") or {}
        src = r.get("data_sources") or {}
        print(f"\n  --- delay {d}: touchdown {(sched.get('touchdown') or {}).get('display')} | sources "
              f"{src.get('track')}/{src.get('weather')} | degraded={r.get('degraded')} {r.get('error') or ''}")
        if not r.get("moments"):
            print("  (no moments met the score/confidence bar)")
        for m in r.get("moments", []):
            print(f"  * {m['title']} [{m['side']}] {m['window_start']['display']}-{m['window_end']['display']} "
                  f"peak {m['peak']['display']} alert {m['crew_alert_at']['display']} score {m['score']} "
                  f"{m['confidence']} lighting={m['lighting']} busy={m['crew_busy']}")
            print(f"      reasons: {m['reasons']} {m['confidence_notes']}")
            if m.get("delay_effect"):
                print(f"      delay effect: {m['delay_effect']}")
        for x in r.get("delay_removed", []):
            print(f"  - removed: {x['title']} [{x['side']}] {x['note']}")
        print("  considered: " + "; ".join(f"{c['id']} {c['score']} {c['confidence']}"
                                           f"{'' if c['emitted'] else ' (' + str(c['why_not']) + ')'}"
                                           for c in r.get("considered", [])))
    seats = sorted(set(results[0].get("seat_actions", {})) | set(results[40].get("seat_actions", {})))
    print(f"\n  {'seat':<5} | {'delay 0':<52} | delay +40")
    for seat in seats:
        a0 = "; ".join(f"{a['moment_id']}:{a['action']}" for a in results[0]["seat_actions"].get(seat, [])) or "-"
        a1 = "; ".join(f"{a['moment_id']}:{a['action']}" for a in results[40]["seat_actions"].get(seat, [])) or "-"
        print(f"  {seat:<5} | {a0:<52} | {a1}")


def _main(argv: list[str] | None = None) -> int:
    """CLI entry. Exit 0 on success (an empty Window Moments result is a success),
    1 on an operational failure (fetch/write/generation), 2 on bad arguments (argparse)."""
    ap = argparse.ArgumentParser(description="Cathay Horizon spatial & flight module (MAE #2)")
    group = ap.add_mutually_exclusive_group()
    group.add_argument("--generate-track", action="store_true", help="write data/cx524_track.csv (synthetic)")
    group.add_argument("--refresh-weather", action="store_true", help="try a live Open-Meteo fetch into the cache")
    group.add_argument("--write-fallback", action="store_true", help="write data/fallback_window_moments.json")
    ap.add_argument("--flight", default="CX524", help="flight for --generate-track (default CX524)")
    ap.add_argument("--out", type=Path, default=None,
                    help="destination for --generate-track/--refresh-weather/--write-fallback (default: data/)")
    args = ap.parse_args(argv)
    if args.out is not None and not (args.generate_track or args.refresh_weather or args.write_fallback):
        ap.error("--out requires --generate-track, --refresh-weather or --write-fallback")
    if args.generate_track:
        try:
            flight = _normalize_flight(args.flight)
            if flight not in SCHEDULES:
                print(json.dumps({"ok": False, "error": f"Unsupported flight {flight}"}))
                return 1
            rows = generate_synthetic_track(flight=flight)
            if not rows:
                print(json.dumps({"ok": False, "error": "Synthetic track generation failed"}))
                return 1
            default_csv, default_meta = _track_paths(flight)
            csv_path = args.out or default_csv
            meta_path = csv_path.with_name(csv_path.stem + ".meta.json") if args.out else default_meta
            _write_track_csv(rows, csv_path, meta_path, "synthetic",
                             f"Synthetic {flight} track from SYNTHETIC_ROUTES. TODO(team): replace with a real ADS-B track.")
        except OSError as exc:
            print(json.dumps({"ok": False, "error": f"Writing track failed ({type(exc).__name__})"}))
            return 1
        print(json.dumps({"ok": True, "rows": len(rows), "written_to": str(csv_path)}))
        return 0
    if args.refresh_weather:
        res = refresh_weather_cache(DEMO_DATE, cache_path=args.out)
        print(json.dumps(res, indent=2))
        return 0 if res.get("ok") else 1
    if args.write_fallback:
        res = write_fallback_snapshots(args.out)
        print(json.dumps(res, indent=2))
        return 0 if res.get("ok") else 1
    _print_demo()
    return 0


if __name__ == "__main__":
    sys.exit(_main())
