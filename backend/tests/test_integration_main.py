"""Integration tests: the CS Lead's main.py (all 8 endpoints) + agent_engine.py + state_sync.py
+ spatial_and_flight.py, through FastAPI's TestClient. Offline: sockets are blocked and no
GEMINI_API_KEY is set, so agent_engine uses its deterministic fallbacks."""
from __future__ import annotations

import json
import socket
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import spatial_and_flight as saf  # noqa: E402

REMOVED_FIELDS = ("departure_assist_map", "arrival_assist_map", "assist_profile")


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("CATHAY_REFRESH_WEATHER", raising=False)
    attempts = []

    def deny(*a, **k):
        attempts.append(a[:1])
        raise OSError("network disabled in test")

    monkeypatch.setattr(socket.socket, "connect", deny)
    monkeypatch.setattr(socket, "getaddrinfo", deny)
    saf.clear_window_cache()
    with TestClient(main.app) as c:
        c.post("/api/reset")
        yield c
    assert attempts == [], "integration path attempted network access"


def _personas(state):
    return state["personas"]


def test_state_has_computed_window_moments_and_no_hardcoded_story(client):
    s = client.get("/api/state").json()
    json.dumps(s, allow_nan=False)
    assert s["flight"]["flight_number"] == "CX251"
    assert s["flight"]["schedule"]["gate_arrival"]["display"] == "05:40 GMT"
    assert s["window_moments"]["schema_version"] == "window-1" and not s["window_moments"]["degraded"]
    assert s["flight"]["window_moment_detail"]["computed"] is True
    blob = json.dumps({k: v for k, v in s.items() if k != "skybook_history"})
    assert "05:55" not in blob and "English Channel Sunrise" not in blob
    for p in _personas(s).values():
        assert not any(f in p for f in REMOVED_FIELDS)
        assert p["assistance_prompt"]["schema_version"] == "assist-1"
    assert _personas(s)["12K"]["assistance_prompt"]["mode"] == "CONFIRM_SAME"
    assert _personas(s)["12K"]["assistance_plan"]["active"] is False      # never auto-confirmed
    assert _personas(s)["12K"]["crew_card"]["discreet_instruction"] == saf.CREW_INSTRUCTIONS["DEAF"]["line"]
    assert all(a["action"] == "NO_WINDOW" for a in s["window_moments"]["seat_actions"]["11D"])


def test_trigger_delay_recomputes_everything_without_old_assist_fields(client):
    s = client.post("/api/trigger-delay", json={}).json()
    assert s["flight"]["delay_minutes"] == 40
    assert s["flight"]["schedule"]["gate_arrival"]["display"] == "06:20 GMT"
    assert s["window_moments"]["delay_minutes"] == 40
    for m in s["window_moments"]["moments"]:
        assert m["window_end"]["utc"] <= s["flight"]["schedule"]["touchdown"]["utc"]
    assert any(e["status"] == "BLOCKED" and e["persona_seat"] == "14G/14K" for e in s["agent_audit_log"])
    assert "05:55" not in json.dumps(s["flight"])


def test_assist_response_confirm_then_delay_shifts_simulated_legs(client):
    s = client.post("/api/assist-response", json={"seat": "12K", "option": "YES_SAME"}).json()
    p = _personas(s)["12K"]
    assert p["assistance_prompt"]["mode"] == "CONFIRMED" and p["assistance_plan"]["active"]
    assert p["assistance_plan"]["simulated"] is True
    assert {"icon": "Accessibility", "label": "Wheelchair Assist"} in p["crew_card"]["tier1_icons"]
    assert s["cabin_brief_summary"]["assist_count"] == 1
    assert s["agent_audit_log"][0]["feature"] == "A3_ASSIST_MEMORY"
    d = client.post("/api/trigger-delay", json={}).json()
    plan = _personas(d)["12K"]["assistance_plan"]
    arr = next(l for l in plan["legs"] if l["segment"] == "ARRIVAL_TO_EXIT")
    assert arr["status"] == "UPDATED" and arr["time"]["display"] == "06:20 GMT"
    assert arr["original_time"]["display"] == "05:40 GMT"
    assert plan["delay_note"] == "Arrival assistance notified of new time 06:20 GMT"


def test_assist_response_invalid_changes_nothing(client):
    before = client.get("/api/state").json()["personas"]["12K"]["assistance"]
    s = client.post("/api/assist-response", json={"seat": "12K", "option": "YES_NEW", "level": "XXXX",
                                                   "note": "free text is ignored"}).json()
    assert _personas(s)["12K"]["assistance"] == before
    assert s["agent_audit_log"][0]["status"] == "BLOCKED"
    assert "free text" not in json.dumps(s["personas"]["12K"])


def test_mathur_expired_need_declined_is_resolved(client):
    s = client.get("/api/state").json()
    assert _personas(s)["11A"]["assistance_prompt"]["mode"] == "CONFIRM_STILL_NEEDED"
    s = client.post("/api/assist-response", json={"seat": "11A", "option": "NO"}).json()
    assert _personas(s)["11A"]["assistance"]["need"] is None
    assert _personas(s)["11A"]["assistance_prompt"]["mode"] == "DECLINED"


def test_consent_matrix_dont_remember_erases_assistance_memory(client):
    client.post("/api/assist-response", json={"seat": "12K", "option": "YES_SAME"})
    s = client.post("/api/toggle-privacy", json={"seat": "12K", "pref_id": "kapoor_wheelchair",
                                                 "consent_level": "DONT_REMEMBER"}).json()
    a = _personas(s)["12K"]["assistance"]
    assert a["consent"] == "DONT_REMEMBER" and a["need"] is None and a["history"] == []
    assert len(a["requests"]) == 1                                   # this trip's booking kept
    plan = _personas(s)["12K"]["assistance_plan"]
    assert plan["active"] and plan["crew_brief"]["redacted"] is True
    assert not any(i["label"] == "Wheelchair Assist" for i in _personas(s)["12K"]["crew_card"]["tier1_icons"])
    s2 = client.post("/api/toggle-privacy", json={"seat": "12K", "pref_id": "kapoor_wheelchair",
                                                  "consent_level": "SHARE_WITH_CREW"}).json()
    a2 = _personas(s2)["12K"]["assistance"]
    assert a2["consent"] == "CREW" and a2["need"] is None             # erased memory is not resurrected


def test_consent_matrix_service_only_redacts_crew_brief(client):
    client.post("/api/assist-response", json={"seat": "12K", "option": "YES_SAME"})
    s = client.post("/api/toggle-privacy", json={"seat": "12K", "pref_id": "kapoor_wheelchair",
                                                 "consent_level": "SERVICE_ONLY"}).json()
    p = _personas(s)["12K"]
    assert p["assistance"]["consent"] == "SERVICE_ONLY" and p["assistance"]["need"] is not None
    assert p["assistance_plan"]["crew_brief"] == {"redacted": True, "lines": [
        {"icon": "assist_arranged", "line": "Assistance arranged"}]}


def test_other_endpoints_still_work(client):
    s = client.post("/api/accept-lounge", json={}).json()
    assert _personas(s)["11A"]["lounge_dine_accepted"] is True
    assert "05:55" not in json.dumps(_personas(s)["11A"]["crew_card"])
    s = client.post("/api/toggle-offline", json={}).json()
    assert s["flight"]["in_air_offline"] is True
    s = client.post("/api/submit-feedback", json={"action_type": "compile_memory", "seat": "11A",
                                                  "raw_text": "pitch deck sprint"}).json()
    assert s["universal_compiler_last_run"]["status"] == "COMPILED"
    assert "05:55" not in json.dumps(s["universal_compiler_last_run"])
    s = client.post("/api/submit-feedback", json={"rating": 5}).json()
    assert s["last_feedback"]["rating"] == 5
    s = client.post("/api/toggle-privacy", json={"seat": "11A", "quiz_step": 1, "selection": "x"}).json()
    assert _personas(s)["11A"]["rhythm_quiz_completed"] is True
    s = client.post("/api/reset", json={}).json()
    assert s["flight"]["delay_minutes"] == 0 and not _personas(s)["11A"].get("lounge_dine_accepted")


def test_mock_state_matches_served_startup_state(client):
    served = client.post("/api/reset").json()
    mock = json.loads((BACKEND.parent / "frontend" / "public" / "mock_state.json").read_text())
    assert mock == served, "run: backend/.venv/bin/python scripts/export_state_snapshots.py --source"
