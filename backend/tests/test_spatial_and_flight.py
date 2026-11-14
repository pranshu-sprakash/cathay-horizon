"""Tests for backend/spatial_and_flight.py (MAE #2). Run offline: pytest backend/tests -q"""
from __future__ import annotations

import copy
import json
import math
import os
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import spatial_and_flight as saf  # noqa: E402

UTC = timezone.utc
BANNED_WORDS = ("disabled", "impaired", "condition", "diagnos", "injur", "ankle")


@pytest.fixture(autouse=True)
def _fresh_cache():
    saf.clear_window_cache()
    yield
    saf.clear_window_cache()


def _utc(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _persona(assistance=None, seat="12K", **extra):
    p = {"seat": seat, **extra}
    if assistance is not None:
        p["assistance"] = assistance
    return p


def _need(level="WCHR", dtype="LASTING", until=None, updated="2026-09-01", comms=None, own_device=None,
          segments=None):
    return {"level": level, "duration_type": dtype, "temporary_until": until,
            "segments": segments or ["CHECKIN_TO_GATE", "BOARDING", "ARRIVAL_TO_EXIT"],
            "communication": comms or [], "own_device": own_device, "updated_on": updated}


def _block(consent="CREW", need=None, history=None, requests=None):
    return {"consent": consent, "need": need, "history": history or [], "requests": requests or {}}


KEY = "CX524|2026-11-16"


# =============================================================================
# Shared schedule
# =============================================================================

def test_schedule_delay_shifts_all_times_by_exactly_40():
    s0 = saf.get_flight_schedule("CX524", 0)
    s40 = saf.get_flight_schedule("CX524", 40)
    for k in ("gate_departure", "takeoff", "touchdown", "gate_arrival"):
        assert _utc(s40[k]["utc"]) - _utc(s0[k]["utc"]) == timedelta(minutes=40)
    assert s0["gate_departure"]["display"] == "01:05 HKT"
    assert s0["gate_arrival"]["display"] == "06:15 JST"
    assert s40["gate_arrival"]["display"] == "06:55 JST"
    assert s0["takeoff"]["display"] == "01:20 HKT" and s0["touchdown"]["display"] == "06:07 JST"
    assert s0["block_minutes"] == 250 and s0["times_are_estimates"] is True
    assert s40["scheduled"]["departure"] == s0["gate_departure"]
    assert s40["estimated"]["arrival"] == s40["gate_arrival"]


def test_schedule_date_change_hkt_to_utc():
    s = saf.get_flight_schedule("CX524", 0)
    assert s["gate_departure"]["utc"] == "2026-11-15T17:05:00Z"
    assert s["gate_arrival"]["utc"] == "2026-11-15T21:15:00Z"   # 06:15 JST on 16 Nov
    assert s["departure_date"] == "2026-11-16"


def test_schedule_unknown_flight_and_bad_inputs():
    r = saf.get_flight_schedule("XX999", 0)
    assert r["supported"] is False and r["reason"] and r["schema_version"]
    assert saf.get_flight_schedule("CX524", 0, "not-a-date")["supported"] is False
    assert saf.get_flight_schedule(None, 0)["supported"] is False
    for bad in (-5, "40", 12.5, True, None, float("nan")):
        assert saf.get_flight_schedule("CX524", bad)["delay_minutes"] == 0
    assert saf.get_flight_schedule("CX524", 9999)["delay_minutes"] == 600
    assert saf.get_flight_schedule("cx 524", 40.0)["delay_minutes"] == 40


# =============================================================================
# Function 1: the 17 specified edge cases
# =============================================================================

def test_ec01_first_time_passenger_offer():
    p = saf.get_assistance_prompt({"seat": "20A"})
    assert p["mode"] == "OFFER" and p["headline"] == "Need assistance at the airport?"
    assert [o["id"] for o in p["options"]] == ["YES_NEW", "NO"]
    assert not any(o["preselected"] for o in p["options"])


def test_ec02_lasting_prefilled_not_submitted():
    persona = _persona(_block(need=_need(), history=[{"flight": "CX524", "date": "2026-03-02", "level": "WCHR",
                                                       "segments": ["CHECKIN_TO_GATE"]}]))
    before = copy.deepcopy(persona)
    p = saf.get_assistance_prompt(persona)
    assert p["mode"] == "CONFIRM_SAME"
    assert [o["id"] for o in p["options"] if o["preselected"]] == ["YES_SAME"]
    assert "NOT_AUTO_SUBMITTED" in p["reason_codes"] and "LASTING_NEED_PREFILLED" in p["reason_codes"]
    assert any(e["event"] == "NOT_AUTO_SUBMITTED" for e in p["audit_events"])
    assert persona == before and persona["assistance"]["requests"] == {}
    assert p["subline"].startswith("Same as your last trip (CX524, 2 Mar)")


def test_ec03_temporary_future_until_confirm_same():
    p = saf.get_assistance_prompt(_persona(_block(need=_need(dtype="TEMPORARY", until="2026-12-31"))))
    assert p["mode"] == "CONFIRM_SAME" and "TEMP_NEED_STILL_ACTIVE" in p["reason_codes"]


def test_ec04_temporary_expired_asks_fresh_and_no_clears_need():
    persona = _persona(_block(need=_need("WCHS", "TEMPORARY", "2026-05-15")))
    p = saf.get_assistance_prompt(persona)
    assert p["mode"] == "CONFIRM_STILL_NEEDED"
    assert p["headline"] == "Last time you needed a wheelchair. Need one this trip?"
    assert not any(o["preselected"] for o in p["options"])
    assert {"YES_SAME", "CHANGE", "NO"} <= {o["id"] for o in p["options"]}
    r = saf.apply_assistance_response(persona, "CX524", {"option": "NO"})
    assert r["error"] is None and r["assistance"]["need"] is None
    assert r["request"]["status"] == "DECLINED_THIS_TRIP"
    assert "TEMP_NEED_RESOLVED" in [e["event"] for e in r["audit_events"]]


def test_ec05_temporary_no_end_date_last_trip_45_days_ago():
    hist = [{"flight": "CX524", "date": "2026-09-30", "level": "WCHR", "segments": ["BOARDING"]}]  # 45 d before 14 Nov
    p = saf.get_assistance_prompt(_persona(_block(need=_need(dtype="TEMPORARY"), history=hist)))
    assert p["mode"] == "CONFIRM_STILL_NEEDED" and not any(o["preselected"] for o in p["options"])


def test_ec06_lasting_no_declines_this_trip_only():
    persona = _persona(_block(need=_need()))
    r = saf.apply_assistance_response(persona, "CX524", {"option": "NO"})
    assert r["request"]["status"] == "DECLINED_THIS_TRIP"
    assert r["assistance"]["need"] == persona["assistance"]["need"]
    assert "LASTING_NEED_KEPT_DECLINED_THIS_TRIP" in [e["event"] for e in r["audit_events"]]
    after = {**persona, "assistance": r["assistance"]}
    assert saf.get_assistance_prompt(after)["mode"] == "DECLINED"
    nxt = saf.get_assistance_prompt(after, "CX524", today="2026-11-20", demo_date="2026-11-30")
    assert nxt["mode"] == "CONFIRM_SAME"


def test_ec07_lasting_updated_400_days_ago_is_stale():
    updated = (datetime(2026, 11, 14) - timedelta(days=400)).date().isoformat()
    p = saf.get_assistance_prompt(_persona(_block(need=_need(updated=updated))))
    assert p["mode"] == "CONFIRM_SAME" and p["stale"] is True
    assert p["subline"].endswith("Please check this is still right")
    assert [o["id"] for o in p["options"] if o["preselected"]] == ["YES_SAME"]


def test_ec08_dont_remember_ignores_history_and_stores_nothing():
    hist = [{"flight": "CX524", "date": "2026-03-02", "level": "WCHR", "segments": ["BOARDING"]}]
    persona = _persona(_block("DONT_REMEMBER", None, hist), seat="14K")
    p = saf.get_assistance_prompt(persona)
    assert p["mode"] == "OFFER" and "CONSENT_DONT_REMEMBER_HISTORY_IGNORED" in p["reason_codes"]
    assert "FORGET" not in [o["id"] for o in p["options"]]
    r = saf.apply_assistance_response(persona, "CX524", {"option": "YES_NEW", "level": "WCHC"})
    assert r["error"] is None and r["request"]["status"] == "CONFIRMED" and r["request"]["level"] == "WCHC"
    assert r["assistance"]["need"] is None
    assert r["assistance"]["history"] == hist            # untouched, not appended, not reused
    assert r["assistance"]["consent"] == "DONT_REMEMBER"


def test_ec09_forget_erases_memory_keeps_confirmed_request():
    other = {"status": "CONFIRMED", "level": "WCHR", "segments": ["BOARDING"], "confirmed_on": "2026-01-01"}
    current = {"status": "CONFIRMED", "level": "WCHR", "segments": ["BOARDING"], "confirmed_on": "2026-11-13",
               "late": False}
    persona = _persona(_block(need=_need(comms=["DEAF"]),
                              history=[{"flight": "CX524", "date": "2026-03-02", "level": "WCHR", "segments": []}],
                              requests={KEY: current, "CX524|2026-01-05": other}))
    r = saf.apply_assistance_response(persona, "CX524", {"option": "FORGET"})
    a = r["assistance"]
    assert a["consent"] == "DONT_REMEMBER" and a["need"] is None and a["history"] == []
    assert a["requests"] == {KEY: current} and r["request"] == current
    assert "ASSIST_MEMORY_ERASED" in [e["event"] for e in r["audit_events"]]
    after = {**persona, "assistance": a}
    plan = saf.build_assistance_service_plan(after)
    assert plan["active"] is True and plan["crew_brief"]["redacted"] is True


def test_ec10_change_wchr_to_wchs_temporary():
    persona = _persona(_block(need=_need(comms=["DEAF"])))
    resp = {"option": "CHANGE", "level": "WCHS", "segments": ["BOARDING", "ARRIVAL_TO_EXIT"],
            "duration_type": "TEMPORARY", "temporary_until": "2027-01-31"}
    r = saf.apply_assistance_response(persona, "CX524", resp)
    assert r["error"] is None
    assert r["request"] == {"status": "CONFIRMED", "level": "WCHS", "segments": ["BOARDING", "ARRIVAL_TO_EXIT"],
                            "confirmed_on": "2026-11-14", "late": False, "simulated": True}
    n = r["assistance"]["need"]
    assert (n["level"], n["duration_type"], n["temporary_until"], n["updated_on"]) == \
        ("WCHS", "TEMPORARY", "2027-01-31", "2026-11-14")
    assert n["communication"] == ["DEAF"]
    so = saf.apply_assistance_response(_persona(_block("SERVICE_ONLY", _need())), "CX524", resp)
    assert so["assistance"]["need"]["level"] == "WCHS"     # SERVICE_ONLY still remembers (consent allows)


def test_ec11_request_after_deadline_is_late():
    persona = _persona(_block(need=_need()))
    p = saf.get_assistance_prompt(persona, today="2026-11-15")
    assert p["is_late"] is True
    r = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"}, today="2026-11-15")
    assert r["request"]["late"] is True and r["request"]["note"] == "Subject to availability"
    assert "ASSIST_REQUEST_LATE" in [e["event"] for e in r["audit_events"]]
    assert saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"})["request"]["late"] is False


def test_ec12_already_confirmed_and_yes_same_idempotent():
    persona = _persona(_block(need=_need()))
    r1 = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"})
    p2 = {**persona, "assistance": r1["assistance"]}
    prompt = saf.get_assistance_prompt(p2)
    assert prompt["mode"] == "CONFIRMED" and "CHANGE" in [o["id"] for o in prompt["options"]]
    assert prompt["summary"]["level_label"] == "I can walk short distances"
    r2 = saf.apply_assistance_response(p2, "CX524", {"option": "YES_SAME"}, today="2026-11-15")
    assert r2 == {**r1}  # same request (original confirmed_on/late kept), same block, same events
    assert len(r2["assistance"]["requests"]) == 1


def test_ec13_invalid_option_or_level_rejected_input_unchanged():
    persona = _persona(_block(need=_need()))
    before = copy.deepcopy(persona)
    for resp in ({"option": "MAYBE"}, {"option": "YES_NEW", "level": "XXXX"}, None,
                 {"option": "CHANGE", "level": "WCHR", "segments": ["SPACE"]},
                 {"option": "CHANGE", "level": "WCHR", "duration_type": "TEMPORARY", "temporary_until": "2020-01-01"},
                 {"option": "CHANGE", "level": "WCHR", "duration_type": "TEMPORARY", "temporary_until": "soon"},
                 {"option": "CHANGE", "level": "WCHR", "duration_type": "FOREVER"}):
        r = saf.apply_assistance_response(persona, "CX524", resp)
        assert r["error"] and r["assistance"] == before["assistance"]
        assert [e["event"] for e in r["audit_events"]] == ["ASSIST_RESPONSE_REJECTED"]
    assert persona == before


def test_ec14_service_plan_delay_40_updates_legs():
    persona = _persona(_block(need=_need(), requests={KEY: {"status": "CONFIRMED", "level": "WCHR",
                                                            "segments": list(saf.ASSIST_SEGMENTS)}}))
    plan = saf.build_assistance_service_plan(persona, "CX524", 40)
    assert plan["active"] and plan["simulated"] is True
    assert all(leg["status"] == "UPDATED" and "original_time" in leg for leg in plan["legs"])
    arr = next(leg for leg in plan["legs"] if leg["segment"] == "ARRIVAL_TO_EXIT")
    assert arr["time"]["display"] == "06:55 JST" and arr["original_time"]["display"] == "06:15 JST"
    assert plan["delay_note"] == "Arrival assistance notified of new time 06:55 JST"
    checkin = next(leg for leg in plan["legs"] if leg["segment"] == "CHECKIN_TO_GATE")
    assert checkin["time"]["display"] == "23:45 HKT" and checkin["owner"] == "Airport assistance"
    plan0 = saf.build_assistance_service_plan(persona, "CX524", 0)
    assert all(leg["status"] == "CONFIRMED" and "original_time" not in leg for leg in plan0["legs"])
    assert plan0["delay_note"] is None


def test_ec15_service_only_crew_brief_redacted():
    req = {KEY: {"status": "CONFIRMED", "level": "WCHC", "segments": ["BOARDING"]}}
    for consent in ("SERVICE_ONLY", "DONT_REMEMBER"):
        persona = _persona(_block(consent, _need("WCHC", comms=["DEAF", "BLND"]), requests=req))
        plan = saf.build_assistance_service_plan(persona)
        assert plan["crew_brief"] == {"redacted": True, "lines": [{"icon": "assist_arranged",
                                                                   "line": "Assistance arranged"}]}
        assert plan["ground_brief"]["lines"][0]["line"] == saf.CREW_INSTRUCTIONS["WCHC"]["line"]
        assert "CREW_BRIEF_REDACTED_SERVICE_ONLY" in [e["event"] for e in plan["audit_events"]]
        assert "Face passenger" not in json.dumps(plan)
    crew = saf.build_assistance_service_plan(_persona(_block("CREW", _need("WCHC", comms=["DEAF", "BLND"]),
                                                             requests=req)))
    lines = [x["line"] for x in crew["crew_brief"]["lines"]]
    assert lines == ["Needs help to and from seat", "Face passenger directly when speaking",
                     "Offer arm and describe surroundings"]


def test_ec16_own_device_contact_cathay():
    persona = _persona(_block(need=_need(own_device="POWERED_CHAIR")))
    p = saf.get_assistance_prompt(persona)
    assert p["mode"] == "CONTACT_CATHAY" and p["contact_cathay"] is True
    r = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"})
    assert r["error"] and r["contact_cathay"] is True and r["assistance"] == persona["assistance"]


def test_ec17_inputs_never_mutated_by_any_call():
    personas = [saf.get_demo_personas()[k] for k in ("11A", "12K", "14G", "11D")]
    personas.append(_persona(_block(need=_need(own_device="X"))))
    responses = [{"option": o, "level": "WCHS", "segments": ["BOARDING"]} for o in saf.ASSIST_OPTIONS]
    for persona in personas:
        snap = copy.deepcopy(persona)
        saf.get_assistance_prompt(persona)
        for resp in responses:
            rc = copy.deepcopy(resp)
            r = saf.apply_assistance_response(persona, "CX524", resp)
            assert resp == rc
            if r["assistance"] is not None:      # output is a new object, not an alias of the input
                r["assistance"]["mutated"] = True
            saf.build_assistance_service_plan({**persona, "assistance": r["assistance"]}, "CX524", 40)
        saf.build_assistance_service_plan(persona, "CX524", 40)
        saf.record_flown_segment(persona.get("assistance"), "CX524", "2026-11-16")
        assert persona == snap
    assert saf.DEMO_PERSONAS == saf.get_demo_personas()


# =============================================================================
# Function 1: resolved gaps and integration risks
# =============================================================================

def test_temporary_no_end_date_recent_history_confirm_same():
    hist = [{"flight": "CX524", "date": "2026-11-04", "level": "WCHR", "segments": ["BOARDING"]}]
    p = saf.get_assistance_prompt(_persona(_block(need=_need(dtype="TEMPORARY"), history=hist)))
    assert p["mode"] == "CONFIRM_SAME" and "TEMP_NEED_STILL_ACTIVE" in p["reason_codes"]
    assert [o["id"] for o in p["options"] if o["preselected"]] == ["YES_SAME"]


def test_temporary_no_end_date_without_usable_history_asks_fresh():
    for hist in ([], [{"flight": "CX524", "date": "2027-01-01"}], [{"flight": "CX524", "date": "garbage"}]):
        p = saf.get_assistance_prompt(_persona(_block(need=_need(dtype="TEMPORARY"), history=hist)))
        assert p["mode"] == "CONFIRM_STILL_NEEDED", hist


def test_dont_remember_blocks_reuse_on_direct_calls():
    residual = _persona(_block("DONT_REMEMBER", _need(comms=["DEAF"]),
                               [{"flight": "CX524", "date": "2026-03-02", "level": "WCHR", "segments": []}]))
    r = saf.apply_assistance_response(residual, "CX524", {"option": "YES_SAME"})
    assert r["error"] and r["request"] is None and r["assistance"] == residual["assistance"]
    assert saf.get_assistance_prompt(residual)["mode"] == "OFFER"
    rec = saf.record_flown_segment({**residual["assistance"],
                                    "requests": {KEY: {"status": "CONFIRMED", "level": "WCHR", "segments": []}}},
                                   "CX524", "2026-11-16")
    assert rec["recorded"] is False and len(rec["assistance"]["history"]) == 1
    # After FORGET, YES_SAME cannot resurrect anything
    f = saf.apply_assistance_response(_persona(_block(need=_need())), "CX524", {"option": "FORGET"})
    again = saf.apply_assistance_response({"seat": "12K", "assistance": f["assistance"]}, "CX524",
                                          {"option": "YES_SAME"})
    assert again["error"] and again["request"] is None


def test_record_flown_segment_appends_once():
    block = _block(need=_need(), requests={KEY: {"status": "CONFIRMED", "level": "WCHR", "segments": ["BOARDING"]}})
    r = saf.record_flown_segment(block, "CX524", "2026-11-16")
    assert r["recorded"] is True and r["assistance"]["history"][-1] == {
        "flight": "CX524", "date": "2026-11-16", "level": "WCHR", "segments": ["BOARDING"]}
    r2 = saf.record_flown_segment(r["assistance"], "CX524", "2026-11-16")
    assert r2["recorded"] is False and len(r2["assistance"]["history"]) == 1
    assert block["history"] == []
    assert saf.record_flown_segment(block, "CX524", "bad")["error"]


def test_trip_identity_uses_scheduled_date_even_if_delay_crosses_midnight(monkeypatch):
    monkeypatch.setitem(saf.SCHEDULES, "CX999", {"origin": "HKG", "dest": "NRT", "dep_local": "23:30",
                                                 "dep_tz": 8, "arr_local": "04:30", "arr_tz": 9})
    persona = _persona(_block(need=_need()))
    r = saf.apply_assistance_response(persona, "CX999", {"option": "YES_SAME"})
    assert r["request_key"] == "CX999|2026-11-16"
    after = {**persona, "assistance": r["assistance"]}
    assert saf.get_assistance_prompt(after, "CX999", delay_minutes=90)["mode"] == "CONFIRMED"
    plan = saf.build_assistance_service_plan(after, "CX999", 90)   # departs 01:00 on the 17th
    assert plan["active"] is True and plan["request_key"] == "CX999|2026-11-16"
    assert saf.get_flight_schedule("CX999", 90)["gate_departure"]["utc"] == "2026-11-16T17:00:00Z"


def test_deadline_uses_scheduled_departure_and_documented_today_convention():
    persona = _persona(_block(need=_need()))
    p0 = saf.get_assistance_prompt(persona, delay_minutes=0)
    p300 = saf.get_assistance_prompt(persona, delay_minutes=300)
    assert p0["deadline"] == p300["deadline"] and p0["deadline"]["utc"] == "2026-11-13T17:05:00Z"
    assert p0["deadline"]["display"] == "14 Nov 01:05 HKT"
    assert p0["reminder_at"]["utc"] == "2026-11-12T17:05:00Z"
    assert saf.get_assistance_prompt(persona, today="2026-11-14")["is_late"] is False   # date-only = 00:00 HKT
    assert saf.get_assistance_prompt(persona, today="2026-11-14T02:00:00+08:00")["is_late"] is True
    a = saf.apply_assistance_response(persona, "CX524", {"option": "YES_SAME"}, today="2026-11-14T02:00:00+08:00")
    assert a["request"]["late"] is True
    assert saf.get_assistance_prompt(persona, today="yesterday")["mode"] == "UNAVAILABLE"


def test_no_banned_words_and_no_private_details_in_audit():
    outputs = []
    for seat, persona in saf.get_demo_personas().items():
        outputs.append(saf.get_assistance_prompt(persona))
        for opt in saf.ASSIST_OPTIONS:
            r = saf.apply_assistance_response(persona, "CX524", {"option": opt, "level": "WCHR"})
            outputs.append(r)
            outputs.append(saf.build_assistance_service_plan({**persona, "assistance": r["assistance"]}, "CX524", 40))
    outputs.append(saf.get_offline_terminal_maps(40))
    blob = json.dumps(outputs).lower()
    for w in BANNED_WORDS:
        assert w not in blob, w
    events = [e for o in outputs for e in o.get("audit_events", [])]
    assert events and all(set(e) == {"event", "seat", "flight", "detail"} for e in events)
    detail_blob = json.dumps([e["detail"] for e in events])
    for private in ("WCHR", "WCHS", "WCHC", "DEAF", "BLND", "Face passenger"):
        assert private not in detail_blob


def test_crew_instruction_constants_shared_wording():
    assert saf.CREW_INSTRUCTIONS["DEAF"]["line"] == "Face passenger directly when speaking"
    assert saf.CREW_INSTRUCTIONS["BLND"]["line"] == "Offer arm and describe surroundings"
    assert saf.CREW_INSTRUCTIONS["WCHR"]["line"] == "Can walk short distances; wheelchair for longer distances"


def test_demo_fixtures_and_legacy_shim():
    personas = saf.get_demo_personas()
    kap = personas["12K"]
    assert kap["assistance"]["requests"] == {}
    shim = saf.get_offline_terminal_maps(40)
    assert shim["deprecated"] is True and shim["active"] is False   # pristine fixture: nothing confirmed
    assert "svg" not in json.dumps(shim).lower() and "qr" not in json.dumps(shim).lower()
    r = saf.apply_assistance_response(kap, "CX524", {"option": "YES_SAME"})
    confirmed = {**kap, "assistance": r["assistance"]}
    assert saf.get_offline_terminal_maps(40, persona=confirmed)["active"] is True
    assert saf.DEMO_PERSONAS["12K"]["assistance"]["requests"] == {}
    mat = saf.get_assistance_prompt(personas["11A"])
    assert mat["mode"] == "CONFIRM_STILL_NEEDED"
    assert saf.get_assistance_prompt(personas["14G"])["mode"] == "OFFER"
    assert saf.get_assistance_prompt(personas["11D"])["mode"] == "OFFER"
    assert "assistance" not in personas["11D"]


def test_assistance_unknown_flight_never_raises():
    assert saf.get_assistance_prompt({}, "ZZ1")["mode"] == "UNAVAILABLE"
    assert saf.apply_assistance_response({}, "ZZ1", {"option": "NO"})["error"]
    assert saf.build_assistance_service_plan({}, "ZZ1")["active"] is False
    assert saf.get_assistance_prompt(None)["mode"] == "OFFER"
    assert saf.apply_assistance_response(None, "CX524", {"option": "NO"})["error"]


# =============================================================================
# Function 2: astronomy and geometry
# =============================================================================

# Independent reference: National Astronomical Observatory of Japan (NAOJ),
# "Sunrise/sunset times, Tokyo, November 2026" (eco.mtk.nao.ac.jp/koyomi/dni/2026/s1311.html):
# sunrise 16 Nov 2026 = 06:17 JST (published to the minute) for 35.6581 N, 139.7414 E, elevation 0 m,
# upper limb with standard refraction. timeanddate.com also lists 06:17 for Tokyo that day.
# TODO(team): update if DEMO_DATE changes.
NAOJ_TOKYO_SUNRISE_JST = "2026-11-16T06:17:00+09:00"


def _sunrise(lat, lon, elev, threshold):
    start = datetime(2026, 11, 15, 20, 0, tzinfo=UTC).timestamp()
    ep = start + np.arange(0, 3 * 3600, saf.SAMPLE_SECONDS, dtype=float)
    alt, _ = saf._altaz_series(saf.ephem.Sun, lat, lon, elev, ep)
    t, _ = saf._first_crossing(ep, alt, threshold)
    return t


def test_astronomy_ground_sunrise_matches_naoj():
    assert saf.DEMO_DATE == "2026-11-16"
    t = _sunrise(35.68, 139.77, 0.0, -saf.SUN_HORIZON_DEG)
    ref = datetime.fromisoformat(NAOJ_TOKYO_SUNRISE_JST).timestamp()
    assert abs(t - ref) <= 120, (t - ref) / 60


def test_dip_makes_sunrise_earlier_at_altitude():
    assert 3.0 < float(saf.horizon_dip_deg(11000)) < 3.2
    ground = _sunrise(35.68, 139.77, 0.0, -saf.SUN_HORIZON_DEG)
    high = _sunrise(35.68, 139.77, 11000.0, -(saf.SUN_HORIZON_DEG + float(saf.horizon_dip_deg(11000))))
    assert 10 <= (ground - high) / 60 <= 35


def test_side_geometry():
    assert saf.side_of(0, 90) == "LEFT"
    assert saf.side_of(180, 90) == "RIGHT"
    assert saf.side_of(90, 90) is None
    _, _, off = saf._side_offset(np.array([180.0]), np.array([90.0]))
    assert float(off[0]) == 0.0
    af = saf._angle_factor(np.array([0.0, 50.0, 55.0, 70.0]))
    assert af[0] == 1.0 and af[1] == pytest.approx(0.5) and 0 < af[2] < 0.5 and af[3] == 0.0


def test_elevation_angle_fuji_from_cruise():
    e = float(saf.elevation_angle_deg(3776, 10000, 80_000))
    assert -6 <= e <= -3


def test_range_and_cloud_factors():
    rf = saf._range_factor(np.array([50, 80, 150, 250, 300]))
    assert list(np.round(rf, 2)) == [1.0, 1.0, 0.4, 0.0, 0.0]
    assert list(saf._cloud_factor(np.array([10, 30, 60, 61]))) == [1.0, 0.6, 0.6, 0.0]


# =============================================================================
# Function 2: track data
# =============================================================================

def test_synthetic_track_matches_schedule_runway_time():
    rows = saf.generate_synthetic_track()
    sched = saf.get_flight_schedule("CX524", 0)
    assert rows[-1]["min_since_takeoff"] == sched["runway_minutes"] == 227
    t = [r["min_since_takeoff"] for r in rows]
    assert t == sorted(t) and len(set(t)) == len(t)
    assert max(r["alt_m"] for r in rows) == saf.CRUISE_ALT_M
    assert (rows[0]["lat"], rows[0]["lon"]) == saf.SYNTHETIC_WAYPOINTS[0]
    assert (rows[-1]["lat"], rows[-1]["lon"]) == saf.SYNTHETIC_WAYPOINTS[-1]
    assert saf.generate_synthetic_track(waypoints=[(0, 0)]) == []


def test_committed_track_file_is_synthetic_generator_output():
    rows, source, problem = saf._load_track_file(saf.TRACK_CSV_PATH, saf.TRACK_META_PATH)
    assert problem is None and source == "synthetic" and len(rows) == 228


def test_missing_or_invalid_track_falls_back_to_synthetic(monkeypatch, tmp_path):
    monkeypatch.setattr(saf, "TRACK_CSV_PATH", tmp_path / "missing.csv")
    r = saf.get_oag_and_window_moments("CX524", 0)
    assert r["data_sources"]["track"] == "synthetic" and not r["degraded"]
    assert any("missing" in w.lower() for w in r["warnings"])
    bad = tmp_path / "bad.csv"
    bad.write_text("min_since_takeoff,lat,lon,alt_m,gs_kmh\n0,22,113,0,400\n0,23,114,100,400\n")
    monkeypatch.setattr(saf, "TRACK_CSV_PATH", bad)
    saf.clear_window_cache()
    r2 = saf.get_oag_and_window_moments("CX524", 0)
    assert r2["data_sources"]["track"] == "synthetic" and not r2["degraded"]


def test_import_adsb_track_and_recorded_label(monkeypatch, tmp_path):
    src = tmp_path / "adsb.csv"
    lines = ["timestamp,latitude,longitude,altitude,speed"]
    t0 = 1_763_225_000
    lines.append(f"{t0 - 120},22.30,113.90,0,10")                  # ground point (dropped)
    rows = saf.generate_synthetic_track()
    for r in rows:
        if 60 <= r["min_since_takeoff"] <= 70:                        # leave a 60-min ocean gap
            continue
        alt_ft = max(r["alt_m"] / 0.3048, 150)
        lines.append(f"{t0 + r['min_since_takeoff'] * 60:.0f},{r['lat']},{r['lon']},{alt_ft:.0f},{max(r['gs_kmh'] / 1.852, 60):.0f}")
    lines.append(lines[-1])                                           # duplicate (dropped)
    src.write_text("\n".join(lines) + "\n")
    out = tmp_path / "track.csv"
    res = saf.import_adsb_track(src, out)
    assert res["ok"] and res["dropped_ground"] == 1 and res["gaps_filled"] >= 9
    assert res["points"][0]["min_since_takeoff"] == 0.0
    assert abs(res["points"][-1]["min_since_takeoff"] - 227) < 0.01
    assert res["points"][100]["alt_m"] == pytest.approx(11000, abs=1)
    assert json.loads((tmp_path / "track.meta.json").read_text())["source"] == "adsb"
    monkeypatch.setattr(saf, "TRACK_CSV_PATH", out)
    monkeypatch.setattr(saf, "TRACK_META_PATH", tmp_path / "track.meta.json")
    r = saf.get_oag_and_window_moments("CX524", 0)
    assert r["data_sources"]["track"] == "recorded" and not r["degraded"]
    assert saf.import_adsb_track(tmp_path / "nope.csv")["ok"] is False


# =============================================================================
# Function 2: engine outputs
# =============================================================================

def test_window_moments_basic_contract():
    for d in (0, 40, 600):
        r = saf.get_oag_and_window_moments("CX524", d)
        assert r["schema_version"] == "window-1" and r["supported"] and not r["degraded"]
        assert len(r["moments"]) <= saf.MAX_MOMENTS
        for m in r["moments"]:
            assert m["score"] >= saf.MIN_SCORE and m["confidence"] in ("HIGH", "MEDIUM")
            assert m["side"] in ("LEFT", "RIGHT") and m["reasons"]
            ws, pk, we = (_utc(m[k]["utc"]) for k in ("window_start", "peak", "window_end"))
            assert ws <= pk <= we
            assert _utc(m["crew_alert_at"]["utc"]) == ws - timedelta(minutes=saf.WAKE_LEAD_MIN)
            assert _utc(r["schedule"]["takeoff"]["utc"]) <= ws and we <= _utc(r["schedule"]["touchdown"]["utc"])
            if d == 0:
                assert m["delay_effect"] is None
        for seat, actions in r["seat_actions"].items():
            assert sum(a["action"] == "WAKE_GENTLY" for a in actions) <= saf.MAX_WAKES_PER_SEAT
        assert r["data_sources"]["weather"] == "sample"          # committed sample is never "live"
        assert r["estimates_note"]


def test_delay_comparison_reports_changes():
    r = saf.get_oag_and_window_moments("CX524", 40)
    base = saf.get_oag_and_window_moments("CX524", 0)
    base_ids = {m["id"] for m in base["moments"]}
    for m in r["moments"]:
        if m["id"] not in {c["id"] for c in base["considered"]}:
            assert m["delay_effect"] is not None
    for x in r["delay_removed"]:
        assert x["id"] in base_ids


def test_determinism_and_json_safety():
    a = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    saf.clear_window_cache()
    b = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    assert a == b
    for d in (0, 40, 600):
        json.dumps(saf.get_oag_and_window_moments("CX524", d, debug=True), allow_nan=False)
    json.dumps([saf.get_assistance_prompt(p) for p in saf.get_demo_personas().values()], allow_nan=False)


def test_debug_toggle_does_not_leak_into_cache():
    r1 = saf.get_oag_and_window_moments("CX524", 40)
    r2 = saf.get_oag_and_window_moments("CX524", 40, debug=True)
    r3 = saf.get_oag_and_window_moments("CX524", 40)
    assert "debug" not in r1 and "debug" not in r3 and r1 == r3
    samples = r2["debug"]["samples"]
    assert samples and {"t_utc", "heading", "sun_alt", "sun_side", "fuji_range_km", "fuji_rel_bearing",
                        "fuji_elev_deg", "fuji_lighting", "scores", "in_turn"} <= set(samples[0])
    step = (_utc(samples[1]["t_utc"]) - _utc(samples[0]["t_utc"])).total_seconds()
    assert step == saf.DEBUG_SAMPLE_EVERY_MIN * 60


def test_cached_results_are_defensive_copies():
    r1 = saf.get_oag_and_window_moments("CX524", 40)
    snap = copy.deepcopy(r1)
    r1["moments"].clear()
    r1["seat_actions"]["11A"] = "tampered"
    r1["schedule"]["touchdown"]["display"] = "never"
    assert saf.get_oag_and_window_moments("CX524", 40) == snap


def test_weather_fallback_assumed_when_cache_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(saf, "WEATHER_CACHE_PATH", tmp_path / "none.json")
    r = saf.get_oag_and_window_moments("CX524", 40)
    assert r["data_sources"]["weather"] == "assumed" and not r["degraded"]


def test_weather_status_live_only_for_fetched_matching_date(monkeypatch, tmp_path):
    payload = json.loads(saf.WEATHER_CACHE_PATH.read_text())
    payload["source"] = "open-meteo"
    live = tmp_path / "live.json"
    live.write_text(json.dumps(payload))
    monkeypatch.setattr(saf, "WEATHER_CACHE_PATH", live)
    assert saf.get_oag_and_window_moments("CX524", 40)["data_sources"]["weather"] == "live"
    assert saf.get_oag_and_window_moments("CX524", 40, demo_date="2026-11-20")["data_sources"]["weather"] == "sample"
    live.write_text("{not json")
    assert saf.get_oag_and_window_moments("CX524", 40)["data_sources"]["weather"] == "assumed"


def test_refresh_weather_cache_mocked(monkeypatch, tmp_path):
    import requests

    calls = []

    class Resp:  # realistic: streamed body, grid-cell coordinates a few km from the request
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def raise_for_status(self):
            pass

        def iter_content(self, chunk_size=8192):
            hours = [f"2026-11-{d}T{h:02d}:00" for d in (15, 16, 17) for h in range(24)]
            lats = [float(x) for x in self.params["latitude"].split(",")]
            lons = [float(x) for x in self.params["longitude"].split(",")]
            items = [{"latitude": la + 0.02, "longitude": lo - 0.02,
                      "hourly": {"time": hours, "cloud_cover_low": [70] * 72, "cloud_cover_mid": [5] * 72,
                                 "cloud_cover_high": [5] * 72}} for la, lo in zip(lats, lons)]
            blob = json.dumps(items[::-1]).encode()          # reversed order: association is by coordinates
            for i in range(0, len(blob), chunk_size):
                yield blob[i:i + chunk_size]

    def fake_get(url, params=None, timeout=None, stream=False):
        calls.append((url, params, timeout))
        r = Resp()
        r.params = params
        return r

    monkeypatch.setattr(requests, "get", fake_get)
    target = tmp_path / "w.json"
    r = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r["ok"] and r["weather"] == "live" and target.exists()
    assert calls[0][2] == (saf.WEATHER_TIMEOUT_S, saf.WEATHER_TIMEOUT_S) and "cloud_cover_mid" in calls[0][1]["hourly"]
    monkeypatch.setattr(saf, "WEATHER_CACHE_PATH", target)
    res = saf.get_oag_and_window_moments("CX524", 40)
    assert res["data_sources"]["weather"] == "live"
    fuji = [m for m in res["moments"] if m["id"].startswith("fuji")]
    assert all("Above a sea of clouds" in m["reasons"] for m in fuji)

    def boom(*a, **k):
        raise requests.ConnectionError("offline")

    monkeypatch.setattr(requests, "get", boom)
    before = target.read_text()
    r2 = saf.refresh_weather_cache("2026-11-16", cache_path=target)
    assert r2["ok"] is False and r2["error"] and target.read_text() == before


def test_no_network_during_ordinary_calls(monkeypatch):
    attempts = []

    def no_connect(self, *a, **k):
        attempts.append(a)
        raise OSError("network disabled in test")

    monkeypatch.setattr(socket.socket, "connect", no_connect)
    monkeypatch.setattr(socket, "create_connection", lambda *a, **k: no_connect(None, *a))
    for d in (0, 40, 600):
        assert not saf.get_oag_and_window_moments("CX524", d, debug=True)["degraded"]
    saf.get_flight_schedule("CX524", 40)
    for p in saf.get_demo_personas().values():
        saf.get_assistance_prompt(p)
        saf.build_assistance_service_plan(p, "CX524", 40)
    assert attempts == []


def test_dnd_precedence_on_visible_side():
    base = saf.get_oag_and_window_moments("CX524", 40, {})
    assert base["moments"], "expected at least one moment at +40 for this data snapshot"
    prefs = {}
    for m in base["moments"]:
        seat = "11A" if m["side"] == "LEFT" else "11K"
        prefs[seat] = {"dnd": True, "window_moments": "OPT_IN"}
    r = saf.get_oag_and_window_moments("CX524", 40, prefs)
    touchdown = _utc(r["schedule"]["touchdown"]["utc"])
    for m in r["moments"]:
        seat = "11A" if m["side"] == "LEFT" else "11K"
        act = next(a for a in r["seat_actions"][seat] if a["moment_id"] == m["id"])
        assert act["action"] == "SUPPRESS_DND" and "check shade closed" in act["line"]
        assert _utc(act["shade_closed_until"]["utc"]) == touchdown - timedelta(minutes=saf.SHADES_OPEN_BEFORE_TD_MIN)
    truthy = saf.get_oag_and_window_moments("CX524", 40, {s: {"dnd": "true", "window_moments": "OPT_IN"}
                                                         for s in prefs})
    assert all(a["action"] in ("SUPPRESS_DND", "NOT_VISIBLE") for acts in truthy["seat_actions"].values()
               for a in acts)


def test_centre_seat_no_window_and_opt_in_rules():
    r = saf.get_oag_and_window_moments("CX524", 40, {"11D": {"dnd": True}, "14G": {"window_moments": "OPT_IN"},
                                                     "12K": {}, "12A": {"window_moments": "YES"}})
    for seat in ("11D", "14G"):
        assert r["moments"] and all(a["action"] == "NO_WINDOW" for a in r["seat_actions"][seat])
    for seat in ("12K", "12A"):     # not opted in (only exactly "OPT_IN" counts) -> never woken
        assert all(a["action"] in ("NOTIFY_IF_AWAKE", "NOT_VISIBLE") for a in r["seat_actions"][seat])


def test_seat_action_rules_unit():
    s, _ = saf._schedule_core("CX524", 0)
    td = s.touchdown

    def mom(mid, side, score, alert_offset_min, busy):
        start = td - timedelta(minutes=alert_offset_min - saf.WAKE_LEAD_MIN)
        t = {"utc": saf._iso_utc(start), "display": ""}
        return {"id": mid, "type": "SKY", "title": mid, "short_title": mid, "side": side, "score": score,
                "crew_busy": busy, "window_start": t, "peak": t, "window_end": t, "crew_alert_at": t, "notes": []}

    moments = [mom("a", "LEFT", 0.5, 90, False), mom("b", "LEFT", 0.9, 60, False), mom("c", "LEFT", 0.8, 20, True)]
    acts = saf._seat_actions(moments, {"11A": {"dnd": False, "window_moments": True}}, s)["11A"]
    by = {a["moment_id"]: a for a in acts}
    assert by["b"]["action"] == "WAKE_GENTLY"                      # highest score keeps the single wake
    assert by["a"]["action"] == "NOTIFY_IF_AWAKE" and by["a"]["reason"] == "One wake per seat"
    assert by["c"]["action"] == "NOTIFY_IF_AWAKE" and by["c"]["reason"] == "Cabin landing preparation"
    wing = saf._seat_actions([{**moments[0], "type": "LANDMARK"}], {"11A": {"dnd": False, "window_moments": True}}, s)
    assert wing["11A"][0]["action"] == "WAKE_GENTLY"


def test_invalid_seat_prefs_produce_no_wakes():
    r = saf.get_oag_and_window_moments("CX524", 40, ["11A"])
    assert r["seat_actions"] == {} and r["warnings"] and not r["degraded"]
    r2 = saf.get_oag_and_window_moments("CX524", 40, {"11A": "OPT_IN"})
    assert all(a["action"] != "WAKE_GENTLY" for a in r2["seat_actions"]["11A"])


def test_unknown_flight_window_moments():
    r = saf.get_oag_and_window_moments("BA1", 0)
    assert r["supported"] is False and r["moments"] == [] and json.dumps(r)


def test_cold_and_cached_performance():
    t0 = time.perf_counter()
    saf.get_oag_and_window_moments("CX524", 40)        # cold: computes +40 AND the zero-delay comparison
    cold = time.perf_counter() - t0
    t1 = time.perf_counter()
    saf.get_oag_and_window_moments("CX524", 40)
    warm = time.perf_counter() - t1
    assert cold < 3.0, cold
    assert warm < 0.1, warm


def test_engine_failure_uses_fallback_snapshot_with_current_prefs(monkeypatch):
    def broken(*a, **k):
        raise RuntimeError("ephem exploded")

    monkeypatch.setattr(saf.ephem, "Observer", broken)
    prefs = {"11A": {"dnd": True, "window_moments": "OPT_IN"}, "11K": {"window_moments": "OPT_IN"}, "11D": {}}
    r = saf.get_oag_and_window_moments("CX524", 40, prefs)
    assert r["degraded"] is True and r["error"] and json.dumps(r, allow_nan=False)
    snap = json.loads(saf.FALLBACK_PATH.read_text())["snapshots"]
    expected = next(s for s in snap if s["delay_minutes"] == 40)["moments"]
    assert [m["id"] for m in r["moments"]] == [m["id"] for m in expected]
    assert set(r["seat_actions"]) == {"11A", "11K", "11D"}
    for m in r["moments"]:
        a11 = next(a for a in r["seat_actions"]["11A"] if a["moment_id"] == m["id"])
        assert a11["action"] in ("SUPPRESS_DND", "NOT_VISIBLE")      # never a replayed wake
    # No snapshot for this delay -> valid empty degraded result
    r2 = saf.get_oag_and_window_moments("CX524", 17, prefs)
    assert r2["degraded"] is True and r2["moments"] == [] and all(v == [] for v in r2["seat_actions"].values())
    # Other date -> no compatible snapshot either
    r3 = saf.get_oag_and_window_moments("CX524", 40, prefs, demo_date="2026-12-01")
    assert r3["degraded"] is True and r3["moments"] == []


def test_engine_failure_uses_last_good_result(monkeypatch, tmp_path):
    good = saf.get_oag_and_window_moments("CX524", 40, {"11A": {"window_moments": "OPT_IN"}})
    copy_path = tmp_path / "w.json"
    changed = json.loads(saf.WEATHER_CACHE_PATH.read_text())
    changed["fetched_at_utc"] = "2026-11-14T09:00:00Z"               # genuinely different data generation
    copy_path.write_text(json.dumps(changed))
    monkeypatch.setattr(saf, "WEATHER_CACHE_PATH", copy_path)      # new content digest forces recompute
    monkeypatch.setattr(saf.ephem, "Observer", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("x")))
    r = saf.get_oag_and_window_moments("CX524", 40, {"11A": {"dnd": True}})
    assert r["degraded"] is True and [m["id"] for m in r["moments"]] == [m["id"] for m in good["moments"]]
    assert all(a["action"] != "WAKE_GENTLY" for a in r["seat_actions"]["11A"])
    assert any("last good" in w.lower() for w in r["warnings"])


def test_no_hardcoded_0535_in_module_source():
    src = Path(saf.__file__).read_text(encoding="utf-8")
    assert '"05:35' not in src and "05:35" not in src


def test_constants_have_named_todo_items():
    src = Path(saf.__file__).read_text(encoding="utf-8")
    for name in ("DEMO_DATE", "DEMO_TODAY", "SEAT_MAP", "SYNTHETIC_WAYPOINTS", "ASSIST_REQUEST_DEADLINE_HOURS",
                 "MATHUR_ASSIST_FIXTURE_ENABLED"):
        line = next(ln for ln in src.splitlines() if ln.startswith(name))
        idx = src.splitlines().index(line)
        window = "\n".join(src.splitlines()[max(idx - 1, 0): idx + 1])
        assert "TODO(team)" in window, name


# =============================================================================
# Import / launch arrangements
# =============================================================================

@pytest.mark.parametrize("cwd,stmt", [
    (BACKEND, "import spatial_and_flight as m"),                       # uvicorn main:app run from backend/
    (BACKEND.parent, "import backend.spatial_and_flight as m"),        # uvicorn backend.main:app from repo root
    (Path("/"), f"import sys; sys.path.insert(0, {str(BACKEND)!r}); import spatial_and_flight as m"),
])
def test_imports_cleanly_without_network_or_cwd(cwd, stmt):
    code = (f"{stmt}\nimport sys, json\n"
            "assert 'requests' not in sys.modules, 'requests imported at module import'\n"
            "r = m.get_oag_and_window_moments('CX524', 40)\n"
            "assert not r['degraded'], r.get('error')\n"
            "print(json.dumps(m.get_flight_schedule('CX524', 0)['touchdown']))")
    env = {**os.environ, "HTTPS_PROXY": "http://127.0.0.1:9", "HTTP_PROXY": "http://127.0.0.1:9"}
    out = subprocess.run([sys.executable, "-c", code], cwd=cwd, capture_output=True, text=True, timeout=60, env=env)
    assert out.returncode == 0, out.stderr
    assert "06:07 JST" in out.stdout
