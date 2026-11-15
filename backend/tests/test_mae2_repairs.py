"""Regression tests for the MAE #2 repair pass (audit items F1-F4, B1-B12, A1-A23).

Offline: no test here touches the network (the Open-Meteo client is mocked; sockets are
blocked where the test is about network boundaries). Run: pytest backend/tests -q
"""
from __future__ import annotations

import concurrent.futures as cf
import copy
import json
import math
import os
import socket
import subprocess
import sys
import threading
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import spatial_and_flight as saf  # noqa: E402

UTC = timezone.utc
KEY = "CX524|2026-11-16"
WINDOW_KEYS = {"schema_version", "supported", "flight", "demo_date", "delay_minutes", "schedule", "moments",
               "delay_removed", "seat_actions", "glare", "considered", "data_sources", "estimates_note",
               "warnings", "degraded", "error"}
PY = sys.executable


@pytest.fixture(autouse=True)
def _fresh_cache():
    saf.clear_window_cache()
    yield
    saf.clear_window_cache()


def strict(obj) -> str:
    return json.dumps(obj, allow_nan=False)


def _utc(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _need(**kw):
    base = {"level": "WCHR", "duration_type": "LASTING", "temporary_until": None,
            "segments": ["CHECKIN_TO_GATE", "BOARDING", "ARRIVAL_TO_EXIT"], "communication": ["DEAF"],
            "own_device": None, "updated_on": "2026-09-01"}
    base.update(kw)
    return base


def _broken_ephem(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("ephemeris unavailable")
    monkeypatch.setattr(saf.ephem, "Observer", boom)


# =============================================================================
# F1 - module-owned dependency declarations
# =============================================================================

def test_f1_module_requirements_declare_runtime_and_dev_dependencies():
    runtime = (BACKEND / "requirements-mae2.txt").read_text()
    for pkg in ("ephem", "geographiclib", "numpy", "requests"):
        assert any(line.strip().startswith(pkg) for line in runtime.splitlines()), pkg
    assert "pytest" not in runtime and "fastapi" not in runtime     # test-only deps stay out of runtime
    dev = (BACKEND / "requirements-mae2-dev.txt").read_text()
    assert "-r requirements-mae2.txt" in dev and "pytest" in dev


# =============================================================================
# F2 - fallback validation and complete recovery schemas
# =============================================================================

def _valid_fallback() -> dict:
    return json.loads(saf.FALLBACK_PATH.read_text())


def _snap40(fb):
    return next(s for s in fb["snapshots"] if s["delay_minutes"] == 40)


def _corrupt(kind: str, fb: dict) -> str:
    snap = _snap40(fb)
    m = snap["moments"][0]
    if kind == "notes_null":
        m["notes"] = None
    elif kind == "no_title":
        del m["title"]
    elif kind == "empty_reasons":
        m["reasons"] = []
    elif kind == "reasons_null":
        m["reasons"] = None
    elif kind == "bad_utc":
        m["window_start"]["utc"] = "yesterday"
    elif kind == "no_display":
        del m["peak"]["display"]
    elif kind == "inverted":
        m["window_start"], m["window_end"] = m["window_end"], m["window_start"]
    elif kind == "score_nan":
        m["score"] = float("nan")
    elif kind == "score_str":
        m["score"] = "0.9"
    elif kind == "low_conf":
        m["confidence"] = "LOW"
    elif kind == "bad_alert":
        m["crew_alert_at"] = dict(m["window_start"])
    elif kind == "after_touchdown":
        for k in ("window_start", "peak", "window_end", "crew_alert_at"):
            m[k]["utc"] = (_utc(m[k]["utc"]) + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    elif kind == "old_schema":
        fb["schema_version"] = "window-fallback-1"
    elif kind == "config_mismatch":
        snap["config_sig"] = "0000000000000000"
    elif kind == "not_json":
        return "{definitely not json"
    return json.dumps(fb)          # NaN is written as a bare NaN token, as a hand-edited file might be


@pytest.mark.parametrize("kind", ["notes_null", "no_title", "empty_reasons", "reasons_null", "bad_utc", "no_display",
                                  "inverted", "score_nan", "score_str", "low_conf", "bad_alert", "after_touchdown",
                                  "old_schema", "config_mismatch", "not_json"])
def test_f2_corrupt_fallback_is_rejected_with_complete_schema(monkeypatch, tmp_path, kind):
    path = tmp_path / "fallback.json"
    path.write_text(_corrupt(kind, _valid_fallback()))
    monkeypatch.setattr(saf, "FALLBACK_PATH", path)
    _broken_ephem(monkeypatch)
    prefs = {"11A": {"window_moments": "OPT_IN"}, "11K": {"window_moments": "OPT_IN"}, "11D": {"dnd": True}}
    r = saf.get_oag_and_window_moments("CX524", 40, prefs)
    assert set(r) >= WINDOW_KEYS and r["degraded"] is True and r["error"]
    assert r["moments"] == [] and r["schedule"]["touchdown"]["display"] == "06:47 JST"
    assert set(r["seat_actions"]) == set(prefs) and all(v == [] for v in r["seat_actions"].values())
    assert any("no moments" in w.lower() for w in r["warnings"])
    strict(r)


def test_f2_valid_fallback_used_with_current_preferences(monkeypatch):
    _broken_ephem(monkeypatch)
    expected = _snap40(_valid_fallback())["moments"]
    r = saf.get_oag_and_window_moments("CX524", 40, {"11A": {"dnd": True, "window_moments": "OPT_IN"},
                                                    "11K": {"window_moments": "OPT_IN"}})
    assert set(r) >= WINDOW_KEYS and r["degraded"] is True
    assert [m["id"] for m in r["moments"]] == [m["id"] for m in expected]
    assert r["data_sources"]["fallback"] == "snapshot"
    for m in r["moments"]:
        a = next(x for x in r["seat_actions"]["11A"] if x["moment_id"] == m["id"])
        assert a["action"] in ("SUPPRESS_DND", "NOT_VISIBLE")
    strict(r)


def test_f2_cli_survives_corrupt_fallback_end_to_end(tmp_path):
    fb = _valid_fallback()
    for s in fb["snapshots"]:
        for m in s["moments"]:
            m["notes"] = None
    bad = tmp_path / "fb.json"
    bad.write_text(json.dumps(fb))
    code = ("import sys; sys.path.insert(0, %r)\n"
            "import spatial_and_flight as s\n"
            "def boom(*a, **k): raise RuntimeError('x')\n"
            "s.ephem.Observer = boom\n"
            "s.FALLBACK_PATH = s.Path(%r)\n"
            "sys.exit(s._main([]))\n") % (str(BACKEND), str(bad))
    out = subprocess.run([PY, "-c", code], capture_output=True, text=True, timeout=120)
    assert out.returncode == 0, out.stderr
    assert "degraded=True" in out.stdout and "Traceback" not in out.stderr


def test_f2_regenerated_fallback_carries_identity():
    fb = _valid_fallback()
    assert fb["schema_version"] == "window-fallback-2"
    cfg = saf._config_sig()
    for snap in fb["snapshots"]:
        assert snap["config_sig"] == cfg and set(snap["data_digests"]) == {"track_csv", "track_meta", "weather",
                                                                           "landmarks"}
        s, _ = saf._schedule_core(snap["flight"], snap["delay_minutes"], snap["demo_date"])
        assert all(saf._valid_fallback_moment(m, s) for m in snap["moments"])


# =============================================================================
# F3 - strict JSON from assistance functions
# =============================================================================

def test_f3_python_dates_numpy_and_nonfinite_values_become_strict_json():
    persona = {"seat": "12K", "assistance": {
        "consent": "CREW", "need": _need(updated_on=date(2026, 9, 1)),
        "history": [{"flight": "CX524", "date": date(2026, 3, 2), "level": "WCHR", "segments": ["BOARDING"]}],
        "requests": {"CX524|2026-01-01": {"status": "CONFIRMED", "level": "WCHR", "segments": ["BOARDING"],
                                          "late": float("nan"), "score": np.float64(math.inf),
                                          "n": np.int64(3), "when": datetime(2026, 1, 1, tzinfo=UTC),
                                          "blob": object()}}}}
    before = copy.deepcopy({k: v for k, v in persona.items()})
    outputs = [saf.get_assistance_prompt(persona)]
    for opt in saf.ASSIST_OPTIONS:
        r = saf.apply_assistance_response(persona, "CX524", {"option": opt, "level": "WCHS"})
        outputs.append(r)
        outputs.append(saf.build_assistance_service_plan({**persona, "assistance": r["assistance"]}, "CX524", 40))
    outputs.append(saf.record_flown_segment(persona["assistance"], "CX524", "2026-11-16"))
    outputs.append(saf.get_offline_terminal_maps(40, persona=persona))
    for o in outputs:
        strict(o)
    blob = strict(outputs)
    assert "object at 0x" not in blob                      # arbitrary objects are never stringified
    hist = outputs[1]["assistance"]["history"]
    assert hist[0]["date"] == "2026-03-02"
    assert persona["assistance"]["history"][0]["date"] == date(2026, 3, 2)   # input untouched
    assert persona["assistance"]["need"]["updated_on"] == before["assistance"]["need"]["updated_on"]


def test_f3_json_shaped_rejection_returns_identical_block():
    persona = {"seat": "12K", "assistance": {"consent": "CREW", "need": _need(), "history": [], "requests": {}}}
    r = saf.apply_assistance_response(persona, "CX524", {"option": "MAYBE"})
    assert r["error"] and r["assistance"] == persona["assistance"]
    strict(r)


# =============================================================================
# F4 - I/O helpers validate their own arguments
# =============================================================================

@pytest.mark.parametrize("kwargs", [{"cache_path": 123}, {"cache_path": ["x"]}, {"timeout_s": 0}, {"timeout_s": -1},
                                    {"timeout_s": float("nan")}, {"timeout_s": True}, {"timeout_s": "3"},
                                    {"timeout_s": 10_000}])
def test_f4_refresh_rejects_bad_arguments_without_raising(kwargs):
    r = saf.refresh_weather_cache("2026-11-16", **kwargs)
    assert r["ok"] is False and r["error"] and strict(r)


def test_f4_refresh_bad_date_and_unwritable_destination(monkeypatch, tmp_path):
    assert saf.refresh_weather_cache("not-a-date")["ok"] is False
    blocker = tmp_path / "file.txt"
    blocker.write_text("x")
    _install_open_meteo(monkeypatch, lambda keys: {k: (10, 5, 5) for k in keys})
    r = saf.refresh_weather_cache("2026-11-16", cache_path=blocker / "sub" / "w.json")
    assert r["ok"] is False and "existing cache kept" in r["error"]
    assert saf.write_fallback_snapshots(123)["ok"] is False
    assert saf.write_fallback_snapshots(blocker / "sub" / "f.json")["ok"] is False
    assert saf.import_adsb_track(123)["ok"] is False


# =============================================================================
# B1 / A12 - consent boundary before parsing residual memory
# =============================================================================

RESIDUAL_VARIANTS = [
    {"need": {"level": []}, "history": []},
    {"need": "garbage", "history": "garbage"},
    {"need": {"level": {"x": 1}, "segments": 5, "communication": 7, "updated_on": 12}, "history": [1, None, "x"]},
    {"need": {"level": "WCHR", "temporary_until": "never"}, "history": [{"date": []}]},
]


@pytest.mark.parametrize("residual", RESIDUAL_VARIANTS)
def test_b1_malformed_residual_memory_under_dont_remember(residual):
    current = {"status": "CONFIRMED", "level": "WCHR", "segments": ["BOARDING"], "confirmed_on": "2026-11-13"}
    with_req = {"seat": "14K", "assistance": {"consent": "DONT_REMEMBER", **residual, "requests": {KEY: current}}}
    without = {"seat": "14K", "assistance": {"consent": "DONT_REMEMBER", **residual, "requests": {}}}
    snap = copy.deepcopy(with_req)
    assert saf.get_assistance_prompt(with_req)["mode"] == "CONFIRMED"
    p = saf.get_assistance_prompt(without)
    assert p["mode"] == "OFFER" and "CONSENT_DONT_REMEMBER_HISTORY_IGNORED" in p["reason_codes"]
    assert "FORGET" not in [o["id"] for o in p["options"]]
    f = saf.apply_assistance_response(with_req, "CX524", {"option": "FORGET"})
    assert f["error"] is None and f["assistance"]["need"] is None and f["assistance"]["history"] == []
    assert f["assistance"]["requests"] == {KEY: current}
    y = saf.apply_assistance_response(without, "CX524", {"option": "YES_NEW", "level": "WCHC"})
    assert y["error"] is None and y["request"]["level"] == "WCHC"
    assert y["assistance"]["need"] == without["assistance"]["need"]           # nothing stored or rewritten
    assert saf.apply_assistance_response(without, "CX524", {"option": "YES_SAME"})["error"]
    rec = saf.record_flown_segment(with_req["assistance"], "CX524", "2026-11-16")
    assert rec["recorded"] is False
    plan = saf.build_assistance_service_plan(with_req)
    assert plan["active"] is True and plan["crew_brief"]["redacted"] is True
    assert plan["ground_brief"]["lines"][0]["line"] == saf.CREW_INSTRUCTIONS["WCHR"]["line"]
    assert with_req == snap
    strict([p, f, y, rec, plan])


@pytest.mark.parametrize("bad_need", [{"level": []}, {"level": "WCHR", "segments": 5, "communication": 9},
                                      {"level": "WCHR", "duration_type": ["TEMPORARY"]}])
def test_b1_malformed_need_under_crew_never_raises(bad_need):
    persona = {"seat": "12K", "assistance": {"consent": "CREW", "need": bad_need, "history": [], "requests": {}}}
    p = saf.get_assistance_prompt(persona)
    assert p["mode"] in ("OFFER", "CONFIRM_SAME") and p["error"] is None
    if p["mode"] == "CONFIRM_SAME":     # recoverable fields defaulted: all segments, LASTING, no comms
        r = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"})
        assert r["request"]["segments"] == list(saf.ASSIST_SEGMENTS)


def test_consent_by_option_matrix():
    hist = [{"flight": "CX524", "date": "2026-03-02", "level": "WCHR", "segments": ["BOARDING"]}]
    for consent in saf.CONSENT_LEVELS:
        for opt in saf.ASSIST_OPTIONS:
            persona = {"seat": "12K", "assistance": {"consent": consent, "need": _need(), "history": hist,
                                                     "requests": {}}}
            r = saf.apply_assistance_response(persona, "CX524", {"option": opt, "level": "WCHS"})
            strict(r)
            a = r["assistance"]
            if consent == "DONT_REMEMBER" and opt != "FORGET":
                assert a["need"] == persona["assistance"]["need"] and a["history"] == hist  # untouched, unused
                if opt == "YES_SAME":
                    assert r["error"] and r["request"] is None
            if opt == "FORGET":
                assert (a["consent"], a["need"], a["history"]) == ("DONT_REMEMBER", None, [])
            if opt in ("YES_NEW", "CHANGE") and consent != "DONT_REMEMBER":
                assert a["need"]["level"] == "WCHS"
            if opt == "YES_SAME" and consent != "DONT_REMEMBER":
                assert r["request"]["level"] == "WCHR"
            assert a["history"] == ([] if opt == "FORGET" else hist)              # never appended here


# =============================================================================
# B2 - history-only state keeps its Forget option
# =============================================================================

def test_b2_history_only_offer_includes_forget_and_erases_without_losing_request():
    mathur = saf.get_demo_personas()["11A"]
    r = saf.apply_assistance_response(mathur, "CX524", {"option": "NO"})
    assert r["assistance"]["need"] is None and r["assistance"]["history"]
    state = {**mathur, "assistance": r["assistance"]}
    nxt = dict(today="2026-11-20", demo_date="2026-11-30")
    p = saf.get_assistance_prompt(state, **nxt)
    assert p["mode"] == "OFFER" and [o["id"] for o in p["options"]] == ["YES_NEW", "NO", "FORGET"]
    c = saf.apply_assistance_response(state, "CX524", {"option": "YES_NEW", "level": "WCHR"}, **nxt)
    state2 = {**state, "assistance": c["assistance"]}
    f = saf.apply_assistance_response(state2, "CX524", {"option": "FORGET"}, **nxt)
    assert f["assistance"]["history"] == [] and f["assistance"]["need"] is None
    assert f["assistance"]["requests"] == {"CX524|2026-11-30": c["request"]}
    state3 = {**state, "assistance": f["assistance"]}
    assert saf.build_assistance_service_plan(state3, demo_date="2026-11-30")["active"] is True


# =============================================================================
# B3 - recorded tracks: offsets, airborne domain, short tracks
# =============================================================================

def _write_recorded(path: Path, rows: list[dict]) -> None:
    lines = ["# source: adsb", "min_since_takeoff,lat,lon,alt_m,gs_kmh"]
    lines += [f"{r['min_since_takeoff']},{r['lat']},{r['lon']},{r['alt_m']},{r['gs_kmh']}" for r in rows]
    path.write_text("\n".join(lines) + "\n")


def _use_track(monkeypatch, tmp_path, rows):
    p = tmp_path / "rec.csv"
    _write_recorded(p, rows)
    monkeypatch.setattr(saf, "TRACK_CSV_PATH", p)
    monkeypatch.setattr(saf, "TRACK_META_PATH", tmp_path / "none.meta.json")


def test_b3a_recorded_track_keeps_takeoff_relative_offsets(monkeypatch, tmp_path):
    rows = [r for r in saf.generate_synthetic_track() if r["min_since_takeoff"] >= 30]
    _use_track(monkeypatch, tmp_path, rows)
    r = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    assert r["data_sources"]["track"] == "recorded" and not r["degraded"]
    first = r["debug"]["samples"][0]
    takeoff = _utc(r["schedule"]["takeoff"]["utc"])
    assert _utc(first["t_utc"]) == takeoff + timedelta(minutes=30)
    assert first["lat"] == pytest.approx(rows[0]["lat"], abs=1e-4)
    assert any("starts 30 min after takeoff" in w for w in r["warnings"])


def test_b3b_overlong_recorded_track_is_limited_to_airborne_period(monkeypatch, tmp_path):
    rows = saf.generate_synthetic_track()
    last = rows[-1]
    extra = [{**last, "min_since_takeoff": last["min_since_takeoff"] + k, "lon": last["lon"] + 0.05 * k,
              "alt_m": 300} for k in range(1, 61)]
    _use_track(monkeypatch, tmp_path, rows + extra)
    r = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    td = _utc(r["schedule"]["touchdown"]["utc"])
    assert _utc(r["debug"]["samples"][-1]["t_utc"]) <= td
    assert any("past scheduled touchdown" in w for w in r["warnings"])
    for m in r["moments"]:
        ws, pk, we = (_utc(m[k]["utc"]) for k in ("window_start", "peak", "window_end"))
        assert _utc(r["schedule"]["takeoff"]["utc"]) <= ws <= pk <= we <= td


def test_b3b_wholly_post_touchdown_candidate_is_rejected_not_clamped():
    s, _ = saf._schedule_core("CX524", 0)
    t1 = s.touchdown.timestamp()
    c = {"id": "venus_right", "key": "venus", "kind": "SKY", "side": "RIGHT", "title": "Venus", "lighting": None,
         "start": t1 + 600, "end": t1 + 1200, "peak": t1 + 900, "score": 0.9, "confidence": "HIGH",
         "out_of_domain": True}
    kept, considered = saf._select([c])
    assert kept == [] and considered[0]["why_not"] == "Outside the scheduled airborne period"
    # boundary overlap is clipped and stays ordered
    c2 = {**c, "start": t1 - 600, "end": t1 + 600, "peak": t1 + 300, "out_of_domain": False,
          "icon": "star", "short": "Venus", "reasons": ["Right side"], "confidence_notes": [], "uncertainty": {}}
    m = saf._format_moment(c2, s, [])
    ws, pk, we = (_utc(m[k]["utc"]) for k in ("window_start", "peak", "window_end"))
    assert ws <= pk <= we == s.touchdown


@pytest.mark.parametrize("n_rows", [2, 3, 5, 6, 12])
def test_b3c_short_tracks_have_consistent_dimensions(n_rows):
    rows = saf.generate_synthetic_track()[:n_rows]
    tr = saf._resample_track(rows, "recorded", None)
    n = tr.t_min.size
    assert n >= 2 and tr.lat.size == tr.lon.size == tr.alt.size == tr.heading.size == tr.in_turn.size == n


def test_b3c_singleton_and_too_short_tracks_rejected_explicitly(monkeypatch, tmp_path):
    rows = saf.generate_synthetic_track()
    with pytest.raises(ValueError):
        saf._resample_track(rows[:1], "recorded", None)
    tiny = [rows[0], {**rows[1], "min_since_takeoff": 0.2}]
    parsed, src, note = saf._parse_track_bytes(
        ("min_since_takeoff,lat,lon,alt_m,gs_kmh\n" + "\n".join(
            f"{r['min_since_takeoff']},{r['lat']},{r['lon']},{r['alt_m']},{r['gs_kmh']}" for r in tiny)).encode(), None)
    assert parsed is None and "less than one sample" in note
    _use_track(monkeypatch, tmp_path, rows[:2])          # 2-point recorded track: valid, not an accident
    r = saf.get_oag_and_window_moments("CX524", 0)
    assert r["data_sources"]["track"] == "recorded" and not r["degraded"]


def test_b3c_circular_smoothing_wraps_and_keeps_length():
    out = saf._circular_smooth(np.array([359.0, 1.0, 359.0, 1.0, 0.0]), 2)
    assert out.size == 5 and all(min(x, 360 - x) < 1.0 for x in out)
    assert saf._circular_smooth(np.array([10.0, 20.0]), 2).size == 2
    long = np.linspace(0, 90, 40)
    ref = np.degrees(np.arctan2(np.convolve(np.sin(np.radians(long)), np.ones(5), "same"),
                                np.convolve(np.cos(np.radians(long)), np.ones(5), "same"))) % 360
    assert np.allclose(saf._circular_smooth(long, 2), ref)   # identical to the old kernel where it worked


# =============================================================================
# B4 / A14 - Monte Carlo shortcuts are equivalent to full recomputation
# =============================================================================

def _setup(delay):
    s, _ = saf._schedule_core("CX524", delay)
    data = saf._load_data_ctx("CX524")
    tr = saf._track_for(data, s)
    weather = saf._weather_for(data, s.departure_date)
    landmarks = [dict(lm) for lm in data.landmarks]
    required = {}
    for k in saf._landmark_weather_points(tr, landmarks):
        required.setdefault(k.split("_los_mid")[0], []).append(k)
    ctx = saf._Ctx(landmarks, weather, False, 0.0, required)
    epochs = s.takeoff.timestamp() + tr.t_min * 60.0
    nominal = saf._evaluate_run(ctx, tr, tr.lat, tr.lon, epochs, keep_series=True)
    return ctx, tr, epochs, nominal


def _same_events(a, b):
    assert set(a) == set(b)
    for k in a:
        for f in ("start", "end", "peak", "score"):
            assert a[k][f] == pytest.approx(b[k][f], abs=1e-6), (k, f)


@pytest.mark.parametrize("delay", [0, 40, 600])
def test_b4_shortcut_matches_full_computation_for_every_mc_run(delay):
    ctx, tr, epochs, nominal = _setup(delay)
    rng = np.random.default_rng(saf.MC_SEED)
    jit = rng.uniform(-saf.MC_TIME_JITTER_MIN, saf.MC_TIME_JITTER_MIN, saf.MC_RUNS)
    lat = rng.uniform(-saf.MC_LATERAL_KM, saf.MC_LATERAL_KM, saf.MC_RUNS)
    for j, l in zip(jit, lat):
        la, lo = saf._offset_track(tr.lat, tr.lon, tr.heading, float(l))
        ep = epochs + float(j) * 60
        fast = saf._evaluate_run(ctx, tr, la, lo, ep, ref=nominal["series"])["events"]
        full = saf._evaluate_run(ctx, tr, la, lo, ep)["events"]
        _same_events(fast, full)


def test_b4_venus_holes_in_nominal_reference_are_recomputed():
    ctx, tr, epochs, nominal = _setup(0)
    ref = dict(nominal["series"])
    v = np.array(ref["venus_alt"], dtype=float)
    finite = np.flatnonzero(np.isfinite(v))
    assert finite.size > 10
    holes = v.copy()
    holes[finite[1:]] = np.nan                  # nominal "never computed" Venus at these samples
    ref["venus_alt"] = holes
    full = saf._evaluate_run(ctx, tr, tr.lat, tr.lon, epochs)["events"]
    fast = saf._evaluate_run(ctx, tr, tr.lat, tr.lon, epochs, ref=ref)["events"]
    assert "venus_right" in full
    _same_events(fast, full)


# =============================================================================
# B5 - weather coverage is propagated, not assumed complete
# =============================================================================

def _weather_payload(source="open-meteo", ffd="2026-11-16", values=None, drop=(), mutate=None):
    hours = [f"2026-11-{d}T{h:02d}:00Z" for d in (15, 16, 17) for h in range(24)]
    data = saf._load_data_ctx("CX524")
    s, _ = saf._schedule_core("CX524", 0)
    pts = saf._landmark_weather_points(saf._track_for(data, s), [dict(x) for x in data.landmarks])
    points = {}
    for k, (la, lo) in pts.items():
        if k in drop:
            continue
        lo_v, mi_v, hi_v = (values or {}).get(k, (10, 5, 5))
        points[k] = {"lat": la, "lon": lo, "hourly": {"time": list(hours), "cloud_cover_low": [lo_v] * 72,
                                                      "cloud_cover_mid": [mi_v] * 72, "cloud_cover_high": [hi_v] * 72}}
    if mutate:
        mutate(points)
    return {"schema_version": "weather-cache-1", "source": source, "forecast_for_date": ffd,
            "fetched_at_utc": "2026-11-14T08:00:00Z", "points": points}


def _use_weather(monkeypatch, tmp_path, payload):
    p = tmp_path / "w.json"
    p.write_text(json.dumps(payload) if not isinstance(payload, str) else payload)
    monkeypatch.setattr(saf, "WEATHER_CACHE_PATH", p)
    return p


def test_b5_all_valid_live_coverage_complete(monkeypatch, tmp_path):
    _use_weather(monkeypatch, tmp_path, _weather_payload())
    r = saf.get_oag_and_window_moments("CX524", 40)
    cov = r["data_sources"]["weather_coverage"]["fuji"]
    assert r["data_sources"]["weather"] == "live" and cov["complete"] and cov["missing_points"] == []
    assert set(cov["required_points"]) == {"fuji", "fuji_los_mid"}


def _null_los(points):
    h = points["fuji_los_mid"]["hourly"]
    h["cloud_cover_mid"] = [None] * len(h["time"])


def _unequal(points):
    points["fuji_los_mid"]["hourly"]["cloud_cover_high"].pop()


def _gap_around_pass(points):
    for k in points:
        h = points[k]["hourly"]
        for i, t in enumerate(h["time"]):
            if "2026-11-15T16" <= t <= "2026-11-16T02":
                h["cloud_cover_mid"][i] = None


def _bad_values(points):
    h = points["fuji_los_mid"]["hourly"]
    h["cloud_cover_mid"] = [150] * 36 + ["x"] * 36


def _empty(points):
    for key in ("time", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"):
        points["fuji_los_mid"]["hourly"][key] = []


@pytest.mark.parametrize("label,kwargs", [
    ("missing_point", {"drop": ("fuji_los_mid",)}),
    ("all_null_point", {"mutate": _null_los}),
    ("unequal_lengths", {"mutate": _unequal}),
    ("nulls_around_pass", {"mutate": _gap_around_pass}),
    ("out_of_range_values", {"mutate": _bad_values}),
    ("empty_arrays", {"mutate": _empty}),
])
def test_b5_incomplete_live_coverage_is_reported_and_conservative(monkeypatch, tmp_path, label, kwargs):
    _use_weather(monkeypatch, tmp_path, _weather_payload(**kwargs))
    r = saf.get_oag_and_window_moments("CX524", 40)
    cov = r["data_sources"]["weather_coverage"]["fuji"]
    assert r["data_sources"]["weather"] == "live" and cov["complete"] is False
    assert any("Forecast incomplete for Mt. Fuji" in w for w in r["warnings"])
    fuji = [m for m in r["moments"] if m["id"].startswith("fuji")]
    assert not fuji or all(any("incomplete" in n.lower() or "assumed" in n.lower()
                               for n in m["confidence_notes"]) for m in fuji)


def test_b5_singleton_hour_and_partial_nulls_away_from_pass_still_complete(monkeypatch, tmp_path):
    def far_nulls(points):
        h = points["fuji"]["hourly"]
        for i, t in enumerate(h["time"]):
            if t.startswith("2026-11-17"):
                h["cloud_cover_low"][i] = None
    _use_weather(monkeypatch, tmp_path, _weather_payload(mutate=far_nulls))
    assert saf.get_oag_and_window_moments("CX524", 40)["data_sources"]["weather_coverage"]["fuji"]["complete"]

    def singleton(points):
        for k in points:
            h = points[k]["hourly"]
            idx = h["time"].index("2026-11-15T21:00Z")
            for key in h:
                h[key] = [h[key][idx]]
    _use_weather(monkeypatch, tmp_path, _weather_payload(mutate=singleton))
    saf.clear_window_cache()
    r = saf.get_oag_and_window_moments("CX524", 40)
    assert r["data_sources"]["weather_coverage"]["fuji"]["complete"] and not r["degraded"]


def test_b5_stale_or_out_of_range_forecast(monkeypatch, tmp_path):
    _use_weather(monkeypatch, tmp_path, _weather_payload(ffd="2026-11-10"))
    assert saf.get_oag_and_window_moments("CX524", 40)["data_sources"]["weather"] == "sample"

    def shift_days(points):
        for k in points:
            points[k]["hourly"]["time"] = [t.replace("2026-11-1", "2026-11-0") for t in points[k]["hourly"]["time"]]
    _use_weather(monkeypatch, tmp_path, _weather_payload(mutate=shift_days))
    saf.clear_window_cache()
    r = saf.get_oag_and_window_moments("CX524", 40)
    assert r["data_sources"]["weather_coverage"]["fuji"]["complete"] is False


def test_b5_committed_sample_never_live_and_missing_file_assumed(monkeypatch, tmp_path):
    r = saf.get_oag_and_window_moments("CX524", 40)
    assert r["data_sources"]["weather"] == "sample"
    _use_weather(monkeypatch, tmp_path, "{corrupt")
    saf.clear_window_cache()
    assert saf.get_oag_and_window_moments("CX524", 40)["data_sources"]["weather"] == "assumed"


# ---- Open-Meteo client mock (realistic: list, grid coordinates, streamed body) -------

class _Resp:
    def __init__(self, body: bytes, status=200, delay_per_chunk=0.0, chunk=4096):
        self.body, self.status, self.delay, self.chunk = body, status, delay_per_chunk, chunk

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def raise_for_status(self):
        if self.status >= 400:
            import requests
            err = requests.HTTPError(f"{self.status}")
            err.response = self
            raise err

    @property
    def status_code(self):
        return self.status

    def iter_content(self, chunk_size=8192):
        for i in range(0, len(self.body), self.chunk):
            if self.delay:
                time.sleep(self.delay)
            yield self.body[i:i + self.chunk]


def _om_items(params, values_by_index, offset=(0.03, -0.03), order=None):
    lats = [float(x) for x in params["latitude"].split(",")]
    lons = [float(x) for x in params["longitude"].split(",")]
    hours = [f"2026-11-{d}T{h:02d}:00" for d in (15, 16, 17) for h in range(24)]
    items = []
    for i, (la, lo) in enumerate(zip(lats, lons)):
        low, mid, high = values_by_index[i]
        items.append({"latitude": round(la + offset[0], 3), "longitude": round(lo + offset[1], 3),
                      "utc_offset_seconds": 0, "hourly": {"time": hours, "cloud_cover_low": [low] * 72,
                                                          "cloud_cover_mid": [mid] * 72,
                                                          "cloud_cover_high": [high] * 72}})
    return [items[i] for i in (order or range(len(items)))]


def _install_open_meteo(monkeypatch, values_for_keys=None, *, order=None, status=200, delay_per_chunk=0.0,
                        pre_delay=0.0, transform=None, calls=None):
    import requests

    def fake_get(url, params=None, timeout=None, stream=False):
        if calls is not None:
            calls.append({"timeout": timeout, "stream": stream, "params": params})
        if pre_delay:
            time.sleep(pre_delay)
        n = len(params["latitude"].split(","))
        vals = [(10, 5, 5), (80, 70, 70)][:n] if values_for_keys is None else values_for_keys
        if callable(vals):
            vals = list(vals(range(n)).values())
        items = _om_items(params, vals, order=order)
        if transform:
            items = transform(items)
        return _Resp(json.dumps(items).encode(), status=status, delay_per_chunk=delay_per_chunk)

    monkeypatch.setattr(requests, "get", fake_get)


def _wait_refresh_slot():
    assert saf._REFRESH_SLOT.acquire(timeout=15)
    saf._REFRESH_SLOT.release()


def test_open_meteo_association_by_coordinates_not_order(monkeypatch, tmp_path):
    calls = []
    _install_open_meteo(monkeypatch, [(10, 5, 5), (80, 70, 70)], order=[1, 0], calls=calls)
    target = tmp_path / "w.json"
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] and r["coverage_complete"] and calls[0]["stream"] is True
    saved = json.loads(target.read_text())["points"]
    assert saved["fuji"]["hourly"]["cloud_cover_mid"][0] == 5            # fuji got ITS values despite reorder
    assert saved["fuji_los_mid"]["hourly"]["cloud_cover_mid"][0] == 70
    assert abs(saved["fuji"]["grid_lat"] - saved["fuji"]["lat"]) < 0.1


@pytest.mark.parametrize("transform,why", [
    (lambda items: items[:1], "count"),
    (lambda items: items + [dict(items[0])], "count"),
    (lambda items: [items[0], {**items[1], "latitude": items[0]["latitude"], "longitude": items[0]["longitude"]}],
     "matched"),
    (lambda items: [{**i, "latitude": i["latitude"] + 1.0} for i in items], "matched"),
    (lambda items: [{k: v for k, v in i.items() if k != "latitude"} for i in items], "coordinates"),
])
def test_open_meteo_misassociation_is_rejected_and_cache_kept(monkeypatch, tmp_path, transform, why):
    target = tmp_path / "w.json"
    target.write_text('{"keep": true}')
    _install_open_meteo(monkeypatch, transform=transform)
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] is False and target.read_text() == '{"keep": true}'


def test_open_meteo_partial_nulls_written_but_reported(monkeypatch, tmp_path):
    def null_los(items):
        for i in items:
            if abs(i["latitude"] - 35.16) < 0.05:
                i["hourly"]["cloud_cover_mid"] = [None] * 72
        return items
    _install_open_meteo(monkeypatch, transform=null_los)
    target = tmp_path / "w.json"
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] and r["coverage_complete"] is False and r["missing_points"] == ["fuji_los_mid"]


def test_open_meteo_http_error_keeps_cache(monkeypatch, tmp_path):
    target = tmp_path / "w.json"
    target.write_text("old")
    _install_open_meteo(monkeypatch, status=503)
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] is False and "HTTPError 503" in r["error"] and target.read_text() == "old"


def test_bounded_refresh_slow_trickle_and_no_late_write(monkeypatch, tmp_path):
    target = tmp_path / "w.json"
    _install_open_meteo(monkeypatch, delay_per_chunk=0.4)        # ~4 chunks -> ~1.6 s body
    t0 = time.monotonic()
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target, timeout_s=0.6)
    elapsed = time.monotonic() - t0
    assert r["ok"] is False and "Timeout" in r["error"] and elapsed < 1.6
    _wait_refresh_slot()
    assert not target.exists()                                    # the worker never publishes


def test_bounded_refresh_hanging_connect_and_single_worker(monkeypatch, tmp_path):
    target = tmp_path / "w.json"
    _install_open_meteo(monkeypatch, pre_delay=2.0)               # request "connects" slowly, then succeeds
    t0 = time.monotonic()
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target, timeout_s=0.5)
    assert r["ok"] is False and time.monotonic() - t0 < 1.2
    r2 = saf.refresh_weather_cache("2026-11-16", cache_path=target, timeout_s=0.5)
    assert r2["ok"] is False and "RuntimeError" in r2["error"]   # no second concurrent worker
    _wait_refresh_slot()
    time.sleep(0.1)
    assert not target.exists()                                    # late success is discarded, not written


# =============================================================================
# B6 - atomic writes
# =============================================================================

def test_b6_concurrent_writers_and_readers_only_see_complete_documents(tmp_path):
    target = tmp_path / "doc.json"
    payloads = [{"writer": i, "blob": "x" * 20000} for i in range(6)]
    saf._write_json_atomic(target, payloads[0])
    barrier = threading.Barrier(len(payloads) + 1)
    stop = threading.Event()
    bad = []

    def writer(p):
        barrier.wait()
        for _ in range(25):
            saf._write_json_atomic(target, p)

    def reader():
        barrier.wait()
        while not stop.is_set():
            try:
                doc = json.loads(target.read_text())
                if doc not in payloads:
                    bad.append(doc)
            except (ValueError, OSError) as exc:
                bad.append(repr(exc))

    threads = [threading.Thread(target=writer, args=(p,)) for p in payloads]
    rt = threading.Thread(target=reader)
    for t in threads + [rt]:
        t.start()
    for t in threads:
        t.join()
    stop.set()
    rt.join()
    assert bad == [] and json.loads(target.read_text()) in payloads
    assert [p.name for p in tmp_path.iterdir()] == ["doc.json"]            # no temp files left behind
    assert (target.stat().st_mode & 0o777) == 0o644


def test_b6_multiprocess_writers(tmp_path):
    target = tmp_path / "doc.json"
    code = ("import sys; sys.path.insert(0, %r); import spatial_and_flight as s\n"
            "for i in range(40): s._write_json_atomic(s.Path(%r), {'pid': sys.argv[1], 'i': i})\n") % (
        str(BACKEND), str(target))
    procs = [subprocess.Popen([PY, "-c", code, str(n)]) for n in range(3)]
    assert all(p.wait(timeout=60) == 0 for p in procs)
    doc = json.loads(target.read_text())
    assert doc["i"] == 39 and [p.name for p in tmp_path.iterdir()] == ["doc.json"]


def test_b6_failure_before_replace_keeps_old_file(monkeypatch, tmp_path):
    target = tmp_path / "doc.json"
    target.write_text('{"old": 1}')

    def fail(*a, **k):
        raise OSError("disk full")
    monkeypatch.setattr(saf.os, "replace", fail)
    with pytest.raises(OSError):
        saf._write_json_atomic(target, {"new": 1})
    assert target.read_text() == '{"old": 1}' and [p.name for p in tmp_path.iterdir()] == ["doc.json"]
    _install_open_meteo(monkeypatch)
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] is False and target.read_text() == '{"old": 1}'


def test_b6_track_sidecar_bound_to_its_csv(monkeypatch, tmp_path):
    csv_path, meta = tmp_path / "t.csv", tmp_path / "t.meta.json"
    rows = saf.generate_synthetic_track()
    saf._write_track_csv(rows, csv_path, meta, "adsb", "test")
    assert saf._load_track_file(csv_path, meta)[1] == "recorded"
    csv_path.write_text(csv_path.read_text().replace("# source: adsb", "# source: other"))
    rows2, src, note = saf._load_track_file(csv_path, meta)
    assert src == "synthetic" and "sidecar ignored" in note


# =============================================================================
# B7 - configuration identity for caches, last-good and fallback
# =============================================================================

def test_b7_config_change_invalidates_and_revert_restores(monkeypatch):
    a = saf.get_oag_and_window_moments("CX524", 40)
    monkeypatch.setattr(saf, "TAXI_OUT_MIN", 25)
    b = saf.get_oag_and_window_moments("CX524", 40)
    assert b["schedule"]["takeoff"]["display"] == "02:10 HKT" != a["schedule"]["takeoff"]["display"]
    assert b["data_sources"]["config_sig"] != a["data_sources"]["config_sig"]
    monkeypatch.setattr(saf, "TAXI_OUT_MIN", 15)
    assert saf.get_oag_and_window_moments("CX524", 40) == a


def test_b7_last_good_and_fallback_rejected_under_new_configuration(monkeypatch):
    saf.get_oag_and_window_moments("CX524", 40)              # last-good stored under config A
    monkeypatch.setattr(saf, "TAXI_IN_MIN", 12)            # config B
    _broken_ephem(monkeypatch)
    r = saf.get_oag_and_window_moments("CX524", 40)
    assert r["degraded"] and r["moments"] == []
    assert any("different configuration" in w for w in r["warnings"])
    monkeypatch.setattr(saf, "TAXI_IN_MIN", 8)             # back to A: original cache entry is valid again
    good = saf.get_oag_and_window_moments("CX524", 40)
    assert not good["degraded"] and good["moments"]
    with saf._CACHE_LOCK:                                  # evict computed results, keep last-good only
        saf._CORE_CACHE.clear()
        saf._RESULT_CACHE.clear()
    r2 = saf.get_oag_and_window_moments("CX524", 40)
    assert r2["degraded"] and r2["moments"] == good["moments"]
    assert any("last good" in w.lower() for w in r2["warnings"])


def test_b7_restart_equivalent_uses_disk_fallback_only_for_same_config(monkeypatch):
    _broken_ephem(monkeypatch)                              # fresh process: no caches at all
    r = saf.get_oag_and_window_moments("CX524", 0)
    assert r["degraded"] and r["data_sources"].get("fallback") == "snapshot"
    saf.clear_window_cache()
    monkeypatch.setitem(saf.SCHEDULES, "CX524", {**saf.SCHEDULES["CX524"], "arr_local": "06:20"})
    r2 = saf.get_oag_and_window_moments("CX524", 0)
    assert r2["degraded"] and r2["moments"] == []


# =============================================================================
# B8 / A6 - one data generation per response; no repeated parsing on warm polls
# =============================================================================

def test_b8_delayed_and_base_cores_use_the_same_snapshot(monkeypatch, tmp_path):
    w = _use_weather(monkeypatch, tmp_path, _weather_payload())
    seen = []
    real = saf._compute_core

    def spy(s, data):
        seen.append(data.sig)
        if len(seen) == 1:      # a refresh lands between the delayed and the base computation
            w.write_text(json.dumps(_weather_payload(values={"fuji": (90, 90, 90)})))
        return real(s, data)

    monkeypatch.setattr(saf, "_compute_core", spy)
    r = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    assert len(seen) == 2 and seen[0] == seen[1]
    gen_a = r["data_sources"]["data_digests"]["weather"]
    r2 = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    gen_b = r2["data_sources"]["data_digests"]["weather"]
    assert gen_a != gen_b and seen[-1][3] == gen_b == seen[-2][3]
    saf.clear_window_cache()
    monkeypatch.setattr(saf, "_compute_core", real)
    fresh = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    assert fresh["debug"] == r2["debug"] and fresh["moments"] == r2["moments"]


def test_a6_warm_polling_parses_weather_once(monkeypatch):
    count = {"n": 0}
    real = saf._parse_weather_bytes

    def counting(data):
        count["n"] += 1
        return real(data)

    monkeypatch.setattr(saf, "_parse_weather_bytes", counting)
    for _ in range(25):
        saf.get_oag_and_window_moments("CX524", 40)
    assert count["n"] == 1


# =============================================================================
# B9 - request warnings never leak through the cache
# =============================================================================

@pytest.mark.parametrize("order", [("bad", "good"), ("good", "bad")])
def test_b9_warning_isolation_both_orders(order):
    calls = {"bad": {"11A": "OPT_IN"}, "good": {"11A": {}}}
    results = {k: saf.get_oag_and_window_moments("CX524", 40, calls[k]) for k in order}
    results2 = {k: saf.get_oag_and_window_moments("CX524", 40, calls[k]) for k in order}   # warm
    for res in (results, results2):
        assert any("11A invalid" in w for w in res["bad"]["warnings"])
        assert not any("11A invalid" in w for w in res["good"]["warnings"])
        assert res["bad"]["seat_actions"] == res["good"]["seat_actions"]
    assert any("invalid" in w for w in saf.get_oag_and_window_moments("CX524", 40, ["x"])["warnings"])
    assert not any("invalid" in w for w in saf.get_oag_and_window_moments("CX524", 40, None)["warnings"])
    assert saf.get_oag_and_window_moments("CX524", 40, {})["seat_actions"] == {}


# =============================================================================
# B10 / A17 - threshold at full precision
# =============================================================================

@pytest.mark.parametrize("score,emitted", [(0.399, False), (0.3999999, False), (0.4, True), (0.401, True)])
def test_b10_min_score_full_precision(score, emitted):
    c = {"id": "x_left", "key": "x", "kind": "SKY", "side": "LEFT", "title": "x", "lighting": None,
         "start": 0.0, "end": 60.0, "peak": 30.0, "score": score, "confidence": "HIGH"}
    assert saf._select([c])[1][0]["emitted"] is emitted


# =============================================================================
# B11 / A23 - ADS-B timestamps
# =============================================================================

def test_b11_adsb_nonfinite_and_malformed_timestamps_dropped(tmp_path):
    rows = saf.generate_synthetic_track()[:40]
    t0 = 1_763_225_000
    lines = ["time,lat,lon,alt_ft,gs_kt"]
    good = []
    for r in rows:
        ts = t0 + r["min_since_takeoff"] * 60
        good.append(f"{ts:.0f},{r['lat']},{r['lon']},{max(r['alt_m'] / 0.3048, 200):.0f},{max(r['gs_kmh'] / 1.852, 80):.0f}")
    lines += good[:5] + ["nan,22.4,114.0,5000,300", "inf,22.4,114.0,5000,300", "-inf,22.4,114.0,5000,300",
                         "garbage,22.4,114.0,5000,300", ",22.4,114.0,5000,300"] + good[5:][::-1]   # out of order
    src = tmp_path / "a.csv"
    src.write_text("\n".join(lines) + "\n")
    res = saf.import_adsb_track(src)
    assert res["ok"] and res["dropped_invalid"] == 5 and res["rows"] == 40
    t = [p["min_since_takeoff"] for p in res["points"]]
    assert t == sorted(t) and t[-1] == pytest.approx(39.0)
    assert saf._parse_ts(str((t0 + 60) * 1000)) == t0 + 60               # milliseconds
    assert saf._parse_ts("2026-11-15T17:20:00Z") == datetime(2026, 11, 15, 17, 20, tzinfo=UTC).timestamp()
    assert saf._parse_ts("nan") is None and saf._parse_ts("1e400") is None


# =============================================================================
# B12 - CLI exit statuses
# =============================================================================

def _cli(*args, env_extra=None, timeout=180):
    env = {**os.environ, **(env_extra or {})}
    return subprocess.run([PY, str(BACKEND / "spatial_and_flight.py"), *args], capture_output=True, text=True,
                          timeout=timeout, env=env, cwd=str(BACKEND))


def test_b12_cli_exit_codes(tmp_path):
    dead_proxy = {"HTTPS_PROXY": "http://127.0.0.1:9", "HTTP_PROXY": "http://127.0.0.1:9",
                  "https_proxy": "http://127.0.0.1:9", "http_proxy": "http://127.0.0.1:9"}
    r = _cli("--refresh-weather", "--out", str(tmp_path / "w.json"), env_extra=dead_proxy)
    assert r.returncode == 1 and '"ok": false' in r.stdout and not (tmp_path / "w.json").exists()
    blocker = tmp_path / "f"
    blocker.write_text("x")
    assert _cli("--write-fallback", "--out", str(blocker / "x.json")).returncode == 1
    assert _cli("--generate-track", "--out", str(blocker / "x.csv")).returncode == 1
    ok = _cli("--generate-track", "--out", str(tmp_path / "t.csv"))
    assert ok.returncode == 0 and (tmp_path / "t.csv").exists() and (tmp_path / "t.meta.json").exists()
    fb = _cli("--write-fallback", "--out", str(tmp_path / "fb.json"))
    assert fb.returncode == 0 and json.loads((tmp_path / "fb.json").read_text())["snapshots"]
    assert _cli("--bogus").returncode == 2
    assert _cli("--out", str(tmp_path / "x")).returncode == 2
    assert _cli().returncode == 0


def test_b12_cli_refresh_success_in_process(monkeypatch, tmp_path, capsys):
    _install_open_meteo(monkeypatch)
    assert saf._main(["--refresh-weather", "--out", str(tmp_path / "w.json")]) == 0
    assert json.loads((tmp_path / "w.json").read_text())["source"] == "open-meteo"


def test_b12_empty_moments_is_not_a_failure():
    r = saf.get_oag_and_window_moments("CX524", 600)
    assert r["moments"] == [] and r["degraded"] is False and r["error"] is None


# =============================================================================
# A1-A3 - library semantics (installed versions)
# =============================================================================

def test_a1_pyephem_units_epoch_and_refraction():
    import ephem
    obs = ephem.Observer()
    obs.lat, obs.lon = math.radians(35.0), math.radians(139.0)
    assert str(obs.lat) == "35:00:00.0" and str(obs.lon) == "139:00:00.0"
    assert str(ephem.Date(saf._EPHEM_UNIX_EPOCH)) == "1970/1/1 00:00:00"
    ts = datetime(2026, 11, 15, 21, 0, tzinfo=UTC).timestamp()
    assert str(ephem.Date(float(saf._ephem_dates(np.array([ts]))[0]))) == "2026/11/15 21:00:00"
    obs.date = float(saf._ephem_dates(np.array([ts]))[0])
    sun = ephem.Sun()
    obs.pressure = 0
    sun.compute(obs)
    assert -6 < math.degrees(sun.alt) < 0                       # pre-dawn at 06:00 JST, as expected
    obs.date = float(saf._ephem_dates(np.array([ts + 5 * 3600]))[0])    # 11:00 JST, sun ~ +35 deg
    sun.compute(obs)
    airless = math.degrees(sun.alt)
    obs.pressure = 1010
    sun.compute(obs)
    refraction = math.degrees(sun.alt) - airless
    assert 25 < airless < 45 and 0.005 < refraction < 0.05       # pressure=0 disables ephem's refraction


def test_a2_moon_phase_is_percent_over_a_lunation():
    import ephem
    phases = [ephem.Moon(ephem.Date("2026/11/1") + d).phase for d in range(30)]
    assert all(0 <= p <= 100 for p in phases) and min(phases) < 3 and max(phases) > 97


def test_a3_geographiclib_masks_and_keys():
    from geographiclib.geodesic import Geodesic
    inv = Geodesic.WGS84.Inverse(22.3, 113.9, 35.7, 140.4, saf._INV_MASK)
    assert {"s12", "azi1"} <= set(inv) and 2_900_000 < inv["s12"] < 3_000_000
    ln = Geodesic.WGS84.InverseLine(22.3, 113.9, 35.7, 140.4)
    pos = ln.Position(ln.s13 / 2)
    assert {"lat2", "lon2"} <= set(pos) and ln.s13 == pytest.approx(inv["s12"])


def test_a4_numpy_convolve_same_behaviour_documented():
    assert np.convolve(np.ones(3), np.ones(5), mode="same").size == 5   # why the old smoother broke (B3c)


# =============================================================================
# A5 / A7 - concurrency and mutation isolation
# =============================================================================

def test_a5_concurrent_requests_match_serial_results():
    jobs = []
    prefs_variants = [None, {}, {"11A": {"window_moments": "OPT_IN"}}, {"11K": {"dnd": True}},
                      {"11A": {"dnd": True, "window_moments": "OPT_IN"}, "12K": {}}]
    for delay in (0, 40, 600):
        for i, prefs in enumerate(prefs_variants):
            jobs.append((delay, prefs, bool(i % 2)))
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        par = list(ex.map(lambda j: saf.get_oag_and_window_moments("CX524", j[0], j[1], debug=j[2]), jobs * 2))
    saf.clear_window_cache()
    ser = [saf.get_oag_and_window_moments("CX524", d, p, debug=g) for d, p, g in jobs * 2]
    assert par == ser
    for (d, p, g), r in zip(jobs * 2, par):
        assert ("debug" in r) is g
    assert all(len(c) <= saf.RESULT_CACHE_SIZE for c in (saf._CORE_CACHE, saf._RESULT_CACHE, saf._LAST_GOOD_CORE))


def test_a5_clear_cache_during_concurrent_requests():
    stop = threading.Event()

    def clearer():
        while not stop.is_set():
            saf.clear_window_cache()
            time.sleep(0.005)

    t = threading.Thread(target=clearer)
    t.start()
    try:
        with cf.ThreadPoolExecutor(max_workers=4) as ex:
            res = list(ex.map(lambda d: saf.get_oag_and_window_moments("CX524", d), [0, 40] * 4))
    finally:
        stop.set()
        t.join()
    assert all(not r["degraded"] for r in res)


def test_a7_nested_mutation_never_reaches_caches_or_fixtures(monkeypatch):
    r = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    snap = copy.deepcopy(r)
    r["moments"][0]["reasons"].append("tampered")
    r["debug"]["samples"][0]["scores"]["x"] = 1
    r["data_sources"]["weather_coverage"]["fuji"]["required_points"].append("x")
    r["seat_actions"]["11A"][0]["line"] = "tampered"
    assert saf.get_oag_and_window_moments("CX524", 40, debug=True) == snap
    saf.DEFAULT_SEAT_PREFS["11A"]["window_moments"] = "OPT_IN"
    p = saf.get_demo_personas()
    p["12K"]["assistance"]["need"]["level"] = "WCHC"
    assert saf.get_demo_personas()["12K"]["assistance"]["need"]["level"] == "WCHR"
    _broken_ephem(monkeypatch)
    d1 = saf.get_oag_and_window_moments("CX524", 40)        # last-good path
    d1["moments"][0]["title"] = "tampered"
    assert saf.get_oag_and_window_moments("CX524", 40)["moments"][0]["title"] != "tampered"


# =============================================================================
# A9, A13, A22 - assumption checks
# =============================================================================

def test_a9_landmark_ids_with_underscores_in_delay_effects():
    core = {"moments": [{"id": "mt_fuji_peak_left", "side": "LEFT", "lighting": "ALPENGLOW", "title": "x"}],
            "candidates": {}}
    base = {"moments": [], "candidates": {"mt_fuji_peak_right": {"key": "mt_fuji_peak", "side": "RIGHT",
                                                                 "lighting": "ALPENGLOW", "emitted": True,
                                                                 "why_not": None}}}
    eff, _ = saf._delay_effects(core, base)
    assert eff["mt_fuji_peak_left"] == "Delay moved this to the left side"


def test_a13_duplicate_yes_same_keeps_booking_metadata_but_change_is_new():
    persona = {"seat": "12K", "assistance": {"consent": "CREW", "need": _need(), "history": [], "requests": {}}}
    r1 = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"}, today="2026-11-13")
    p2 = {**persona, "assistance": r1["assistance"]}
    r2 = saf.apply_assistance_response(p2, "CX524", {"option": "YES_SAME"}, today="2026-11-15")
    assert r2["request"] == r1["request"] and r2["request"]["late"] is False
    r3 = saf.apply_assistance_response(p2, "CX524", {"option": "CHANGE", "level": "WCHC"}, today="2026-11-15")
    assert r3["request"]["late"] is True and r3["request"]["confirmed_on"] == "2026-11-15"


def _orbit_track(rate_deg_s=2.5, speed_ms=250.0):
    """Straight east 5 min, a sustained 360 deg left orbit at ``rate_deg_s``, straight 5 min."""
    from geographiclib.geodesic import Geodesic
    g = Geodesic.WGS84
    lat, lon, hdg, t, rows = 30.0, 130.0, 90.0, 0.0, []
    step = 10.0
    def push():
        rows.append({"min_since_takeoff": round(t / 60, 4), "lat": lat, "lon": lon, "alt_m": 11000, "gs_kmh": 900})
    push()
    phases = [(300.0, 0.0), (360.0 / rate_deg_s, -rate_deg_s), (300.0, 0.0)]
    for dur, rate in phases:
        for _ in range(int(round(dur / step))):
            hdg = (hdg + rate * step) % 360
            d = g.Direct(lat, lon, hdg, speed_ms * step)
            lat, lon, t = d["lat2"], d["lon2"], t + step
            push()
    return rows


def test_a22_sustained_turn_is_flagged_and_peaks_exclude_turn_samples():
    tr = saf._resample_track(_orbit_track(2.5), "recorded", None)
    assert tr.in_turn.any() and not tr.in_turn.all()
    assert not tr.in_turn[:8].any() and not tr.in_turn[-8:].any()      # straight legs are not turns
    gentle = saf._resample_track(_orbit_track(1.0), "recorded", None)
    assert not gentle.in_turn.any()                                     # below TURN_RATE_DEG_S
    score = np.where(tr.in_turn, 1.0, 0.5)
    b = saf._best_instance(score, np.ones(score.size, bool), tr.in_turn)
    assert b is not None and not tr.in_turn[b[2]] and b[3] == 0.5


def test_a22_sunrise_crossing_in_turn_is_suppressed_not_borrowed():
    ctx, tr, epochs, nominal = _setup(40)
    assert "sunrise_right" in nominal["events"]
    k = nominal["events"]["sunrise_right"]["peak_idx"]
    turned = copy.copy(tr)
    in_turn = tr.in_turn.copy()
    in_turn[max(k - 1, 0):k + 2] = True
    turned.in_turn = in_turn
    out = saf._evaluate_run(ctx, turned, tr.lat, tr.lon, epochs, keep_series=True)
    assert "sunrise_right" not in out["events"]
    assert out["blocked"]["sunrise_right"]["why_not"] == "Sunrise occurs during a turn"
    # unchanged non-turn result
    assert nominal["events"]["sunrise_right"]["peak"] == saf._evaluate_run(ctx, tr, tr.lat, tr.lon, epochs)[
        "events"]["sunrise_right"]["peak"]


# =============================================================================
# Network boundaries and launch paths
# =============================================================================

def test_no_network_in_default_cli_and_all_calls(monkeypatch, capsys):
    attempts = []

    def deny(*a, **k):
        attempts.append(a[:1])
        raise OSError("network disabled in test")

    monkeypatch.setattr(socket.socket, "connect", deny)
    monkeypatch.setattr(socket.socket, "connect_ex", deny)
    monkeypatch.setattr(socket, "create_connection", deny)
    monkeypatch.setattr(socket, "getaddrinfo", deny)
    assert saf._main([]) == 0
    for d in (0, 40, 600):
        saf.get_oag_and_window_moments("CX524", d, debug=True)
    assert attempts == [] and "Window Moments" in capsys.readouterr().out


def test_import_from_path_with_spaces(tmp_path):
    dest = tmp_path / "dir with spaces" / "backend"
    dest.mkdir(parents=True)
    (dest / "spatial_and_flight.py").write_text((BACKEND / "spatial_and_flight.py").read_text())
    (dest / "data").mkdir()
    for f in (BACKEND / "data").iterdir():
        (dest / "data" / f.name).write_bytes(f.read_bytes())
    code = ("import sys; sys.path.insert(0, %r); import spatial_and_flight as m\n"
            "r = m.get_oag_and_window_moments('CX524', 40)\n"
            "assert not r['degraded'] and r['data_sources']['track'] == 'synthetic', r\n") % str(dest)
    out = subprocess.run([PY, "-c", code], capture_output=True, text=True, timeout=120, cwd="/")
    assert out.returncode == 0, out.stderr


def test_a5_single_flight_computes_each_cold_key_once_and_survives_leader_failure(monkeypatch):
    calls = {"n": 0}
    real = saf._compute_core

    def spy(*a, **k):
        calls["n"] += 1
        return real(*a, **k)

    monkeypatch.setattr(saf, "_compute_core", spy)
    with cf.ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda _: saf.get_oag_and_window_moments("CX524", 40), range(8)))
    assert calls["n"] == 2 and all(r == res[0] for r in res)          # +40 core and its zero-delay core
    saf.clear_window_cache()
    state = {"failed": False}

    def flaky(*a, **k):
        if not state["failed"]:
            state["failed"] = True
            time.sleep(0.2)
            raise RuntimeError("leader failed")
        return real(*a, **k)

    monkeypatch.setattr(saf, "_compute_core", flaky)
    with cf.ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda _: saf.get_oag_and_window_moments("CX524", 0), range(4)))
    assert sum(r["degraded"] for r in res) == 1 and saf._INFLIGHT == {}
