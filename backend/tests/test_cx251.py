"""CX251 (HKG -> LHR) support, added when merging with the CS Lead's backend. Offline."""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import ephem
import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import spatial_and_flight as saf  # noqa: E402

UTC = timezone.utc
PREFS = {"11A": {"window_moments": "OPT_IN"}, "11D": {"dnd": True}, "11K": {"dnd": True}, "12K": {},
         "14G": {}, "14K": {}}


@pytest.fixture(autouse=True)
def _fresh():
    saf.clear_window_cache()
    yield
    saf.clear_window_cache()


def _utc(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def test_cx251_schedule_overnight_to_gmt():
    s0 = saf.get_flight_schedule("CX251", 0)
    assert s0["supported"] and s0["origin"] == "HKG" and s0["dest"] == "LHR"
    assert s0["gate_departure"] == {"utc": "2026-11-16T15:00:00Z", "display": "23:00 HKT"}
    assert s0["gate_arrival"] == {"utc": "2026-11-17T05:40:00Z", "display": "05:40 GMT"}
    assert s0["takeoff"]["display"] == "23:15 HKT" and s0["touchdown"]["display"] == "05:32 GMT"
    assert s0["block_minutes"] == 880 and s0["runway_minutes"] == 857
    s40 = saf.get_flight_schedule("CX251", 40)
    assert s40["gate_departure"]["display"] == "23:40 HKT" and s40["gate_arrival"]["display"] == "06:20 GMT"
    assert saf.DEMO_FLIGHT == "CX251"


def test_cx251_committed_track_matches_schedule():
    csv, meta = saf._track_paths("CX251")
    assert csv.name == "cx251_track.csv" and csv.exists() and meta.exists()
    rows, source, note = saf._load_track_file(csv, meta)
    assert note is None and source == "synthetic"
    assert rows[-1]["min_since_takeoff"] == 857
    assert (rows[0]["lat"], rows[0]["lon"]) == saf.SYNTHETIC_WAYPOINTS_CX251[0]
    assert (rows[-1]["lat"], rows[-1]["lon"]) == saf.SYNTHETIC_WAYPOINTS_CX251[-1]


@pytest.mark.parametrize("delay", [0, 40, 600])
def test_cx251_window_moments_contract(delay):
    r = saf.get_oag_and_window_moments("CX251", delay, PREFS, debug=True)
    assert r["supported"] and not r["degraded"] and r["flight"] == "CX251"
    assert not any("Track file missing" in w for w in r["warnings"])
    json.dumps(r, allow_nan=False)
    t0, t1 = _utc(r["schedule"]["takeoff"]["utc"]), _utc(r["schedule"]["touchdown"]["utc"])
    mid = t0 + (t1 - t0) / 2
    for m in r["moments"]:
        ws, pk, we = (_utc(m[k]["utc"]) for k in ("window_start", "peak", "window_end"))
        assert t0 <= ws <= pk <= we <= t1
        assert m["peak"]["display"].endswith("GMT" if pk >= mid else "HKT")
    assert all(a["action"] == "NO_WINDOW" for a in r["seat_actions"]["11D"])   # centre seat
    assert r["debug"]["samples"][-1]["lon"] == pytest.approx(-0.4, abs=0.2)     # ends at LHR


def test_cx251_no_sunrise_before_landing_on_demo_date_independent_check():
    """The CS Lead's hardcoded story was an '05:55 GMT English Channel sunrise'. Independent
    PyEphem check (not the production pipeline): at 11 km over the Channel on 17 Nov the sun
    is still ~13 deg below the horizon at 05:55 GMT, so the engine must not invent a sunrise."""
    obs = ephem.Observer()
    obs.lat, obs.lon, obs.elevation, obs.pressure = "50.5", "-0.5", 11000, 0
    obs.date = "2026/11/17 05:55"
    alt = math.degrees(ephem.Sun(obs).alt)
    assert -15 < alt < -11
    for delay in (0, 40):
        r = saf.get_oag_and_window_moments("CX251", delay, PREFS)
        assert not any(m["id"].startswith("sunrise") for m in r["moments"])
        assert not any(c["id"].startswith("sunrise") for c in r["considered"])


def test_cx251_seat_actions_follow_side_and_preferences():
    r = saf.get_oag_and_window_moments("CX251", 40, PREFS)
    for m in r["moments"]:
        a11 = next(a for a in r["seat_actions"]["11A"] if a["moment_id"] == m["id"])
        k11 = next(a for a in r["seat_actions"]["11K"] if a["moment_id"] == m["id"])
        if m["side"] == "LEFT":
            assert a11["action"] in ("WAKE_GENTLY", "NOTIFY_IF_AWAKE") and k11["action"] == "NOT_VISIBLE"
        else:
            assert a11["action"] == "NOT_VISIBLE" and k11["action"] == "SUPPRESS_DND"


def test_cx251_assistance_identity_deadline_and_delay_shift():
    kap = saf.get_demo_personas()["12K"]
    p = saf.get_assistance_prompt(kap, "CX251")
    assert p["request_key"] == "CX251|2026-11-16" and p["mode"] == "CONFIRM_SAME"
    assert p["deadline"] == {"utc": "2026-11-14T15:00:00Z", "display": "14 Nov 23:00 HKT"}
    assert p["is_late"] is False                                   # DEMO_TODAY 2026-11-14 00:00 HKT
    r = saf.apply_assistance_response(kap, "CX251", {"option": "YES_SAME"})
    plan = saf.build_assistance_service_plan({**kap, "assistance": r["assistance"]}, "CX251", 40)
    arr = next(l for l in plan["legs"] if l["segment"] == "ARRIVAL_TO_EXIT")
    assert arr["time"]["display"] == "06:20 GMT" and arr["original_time"]["display"] == "05:40 GMT"
    assert plan["delay_note"] == "Arrival assistance notified of new time 06:20 GMT" and plan["simulated"]
    assert saf.build_assistance_service_plan({**kap, "assistance": r["assistance"]}, "CX524")["active"] is False


def test_fallback_snapshots_cover_both_flights():
    snaps = json.loads(saf.FALLBACK_PATH.read_text())["snapshots"]
    assert {(s["flight"], s["delay_minutes"]) for s in snaps} == {("CX524", 0), ("CX524", 40),
                                                                  ("CX251", 0), ("CX251", 40)}
