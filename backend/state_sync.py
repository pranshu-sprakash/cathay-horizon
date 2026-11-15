"""
state_sync.py - glue between spatial_and_flight (MAE #2) and the server's shared state.

Owned by MAE #2. ``main.py`` (CS Lead) calls these helpers. They mutate the CS Lead's
``state`` dict in place, the same convention as ``agent_engine.py``, while
``spatial_and_flight`` itself stays pure.

What it adds to the state (additive keys unless noted):
* ``flight.schedule``                - get_flight_schedule() for the current delay
* ``window_moments``                 - full computed Window Moments result (no hardcoded times)
* ``flight.window_moment`` / ``flight.window_moment_detail`` - REPLACED with computed values
* ``personas[*].window_moment_action`` - REPLACED with the computed per-seat action line
* ``personas[*].window_moment_label`` - short crew-card label, or None
* ``personas[*].assistance_prompt`` / ``assistance_plan`` - consent-first assistance memory
  (the plan is a SIMULATED record; nothing contacts an airline or airport)

No network access: weather is read from the local cache only.
"""
from __future__ import annotations

import copy
from datetime import datetime
from typing import Any, Dict, List, Optional

import spatial_and_flight as saf

# Memory item (CS Lead's 3-way consent matrix) that governs each persona's assistance memory.
ASSIST_MEMORY_ITEM_IDS: Dict[str, str] = {"12K": "kapoor_wheelchair"}
# Server consent spelling -> module consent spelling.
CONSENT_TO_ASSIST: Dict[str, str] = {"SHARE_WITH_CREW": "CREW", "CREW": "CREW",
                                      "SERVICE_ONLY": "SERVICE_ONLY", "DONT_REMEMBER": "DONT_REMEMBER"}
# Crew cards whose content depends on this module (window label / assistance plan / window text).
# On startup only these are rebuilt, so hand-authored cards for other seats are preserved.
SEATS_WITH_COMPUTED_CREW_CARDS = ("11A", "12K", "11D")
ACTION_PRIORITY = ("WAKE_GENTLY", "SUPPRESS_DND", "NOTIFY_IF_AWAKE", "NOT_VISIBLE", "NO_WINDOW")
NO_MOMENT_TEXT = "No high-confidence Window Moment on this flight (computed)"
_GUARDRAIL_TEXT = {
    "ASSIST_RESPONSE_REJECTED": "Guardrail #1: response rejected; nothing changed.",
    "ASSIST_MEMORY_ERASED": "Guardrail #4 Passed: assistance memory erased; only this trip's request kept.",
    "CREW_BRIEF_REDACTED_SERVICE_ONLY": "Guardrail #2 Passed: crew sees 'Assistance arranged' only.",
    "TEMP_NEED_RESOLVED": "Guardrail #1 Passed: temporary need cleared at the passenger's request.",
}
_DEFAULT_GUARDRAIL = ("Guardrail #1 & #5 Passed: explicit one-tap answer; functional need only, "
                      "no reason or diagnosis stored (simulated service record).")


def _now_hkt() -> str:
    return datetime.now().strftime("%H:%M:%S HKT")


def _flight(state: Dict[str, Any]) -> tuple[str, int]:
    flight = state.get("flight", {})
    return str(flight.get("flight_number") or saf.DEMO_FLIGHT), flight.get("delay_minutes", 0)


def _seat_ids(key: str, persona: Dict[str, Any]) -> List[str]:
    """Physical seats for a persona ('14G/14K' -> ['14G', '14K'])."""
    raw = str(persona.get("seat") or key)
    return [s.strip().upper() for s in raw.split("/") if s.strip()] or [key]


def seat_prefs_from_state(state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Current Window Moments preferences from the personas' own fields."""
    prefs: Dict[str, Dict[str, Any]] = {}
    for key, p in state.get("personas", {}).items():
        for seat in _seat_ids(key, p):
            prefs[seat] = {"window_moments": "OPT_IN" if p.get("window_moment_opt_in") else None,
                           "dnd": bool(p.get("do_not_disturb"))}
    return prefs


def _best_action(actions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    ranked = [a for a in actions if a.get("action") in ACTION_PRIORITY]
    return min(ranked, key=lambda a: ACTION_PRIORITY.index(a["action"])) if ranked else None


def _persona_action(key: str, persona: Dict[str, Any], window: Dict[str, Any]) -> tuple[str, Optional[str]]:
    """(window_moment_action line, crew-card label | None) for one persona."""
    moments = {m["id"]: m for m in window.get("moments", [])}
    actions: List[Dict[str, Any]] = []
    for seat in _seat_ids(key, persona):
        actions += window.get("seat_actions", {}).get(seat, [])
    best = _best_action(actions)
    if not moments or best is None:
        return (("Rest prioritised - " if persona.get("do_not_disturb") else "") + NO_MOMENT_TEXT), None
    m = moments.get(best["moment_id"], {})
    when = (m.get("peak") or {}).get("display", "")
    timed = best["action"] in ("WAKE_GENTLY", "NOTIFY_IF_AWAKE")
    line = f"{best['line']} ({when}, estimate)" if (when and timed) else best["line"]
    label = None
    if best["action"] == "WAKE_GENTLY":
        label = f"Wake: {m.get('short_title', m.get('title', ''))} {when}".strip()
    elif best["action"] == "NOTIFY_IF_AWAKE":
        label = f"If awake: {m.get('short_title', m.get('title', ''))} {when}".strip()
    return line, label


def _flight_summary(window: Dict[str, Any], state: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    moments = window.get("moments", [])
    if not moments:
        return NO_MOMENT_TEXT, {"title": NO_MOMENT_TEXT, "time_gmt": None, "side": None,
                                "conflict_resolution": {}, "computed": True, "moments": []}
    lead = max(moments, key=lambda m: (m.get("score", 0), m["id"]))
    when = lead["peak"]["display"]
    side = "Left Side (Seats A)" if lead["side"] == "LEFT" else "Right Side (Seats K)"
    conflict = {}
    for key, p in state.get("personas", {}).items():
        for seat in _seat_ids(key, p):
            act = next((a for a in window.get("seat_actions", {}).get(seat, [])
                        if a["moment_id"] == lead["id"]), None)
            if act:
                conflict[seat] = act["action"]
    headline = f"{lead['title']} ({lead['side'].title()} side, ~{when} estimate)"
    detail = {"title": lead["title"], "time_gmt": when, "side": side, "conflict_resolution": conflict,
              "confidence": lead.get("confidence"), "window_start": lead["window_start"]["display"],
              "window_end": lead["window_end"]["display"], "reasons": list(lead.get("reasons", [])),
              "computed": True, "moments": [m["id"] for m in moments]}
    return headline, detail


def apply_spatial_and_assistance(state: Dict[str, Any]) -> Dict[str, Any]:
    """Recompute schedule, Window Moments and assistance prompt/plan for the current
    flight/delay and write them into ``state``. Safe to call repeatedly (idempotent)."""
    flight_no, delay = _flight(state)
    flight = state.setdefault("flight", {})
    sched = saf.get_flight_schedule(flight_no, delay)
    flight["schedule"] = sched
    if not sched.get("supported"):
        return state
    window = saf.get_oag_and_window_moments(flight_no, delay, seat_prefs_from_state(state))
    state["window_moments"] = window
    flight["window_moment"], flight["window_moment_detail"] = _flight_summary(window, state)
    for key, p in state.get("personas", {}).items():
        p["window_moment_action"], p["window_moment_label"] = _persona_action(key, p, window)
        p["assistance_prompt"] = saf.get_assistance_prompt(p, flight_no, delay)
        p["assistance_plan"] = saf.build_assistance_service_plan(p, flight_no, delay)
    return state


def _audit_entries(seat: str, events: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    stamp = int(datetime.now().timestamp())
    return [{"id": f"audit_assist_{seat}_{e['event'].lower()}_{stamp}_{i}", "timestamp": _now_hkt(),
             "feature": "A3_ASSIST_MEMORY", "persona_seat": seat,
             "action": f"{e['event']}: {e['detail']}",
             "status": "BLOCKED" if e["event"] == "ASSIST_RESPONSE_REJECTED" else "APPROVED",
             "guardrail": _GUARDRAIL_TEXT.get(e["event"], _DEFAULT_GUARDRAIL)}
            for i, e in enumerate(events)]


def _set_memory_item_consent(persona: Dict[str, Any], seat_key: str, consent: str) -> None:
    item_id = ASSIST_MEMORY_ITEM_IDS.get(seat_key)
    for item in persona.get("memory_items", []):
        if item.get("id") == item_id:
            item["consent"] = consent


def apply_assistance_answer(state: Dict[str, Any], seat_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Apply an explicit one-tap assistance answer for ``seat_key`` (8th endpoint).

    Payload keys: option (YES_SAME | YES_NEW | CHANGE | NO | FORGET) and optionally
    level, segments, duration_type, temporary_until. Invalid answers change nothing
    (a BLOCKED audit entry is logged). Free text is ignored."""
    persona = state.get("personas", {}).get(seat_key)
    if persona is None:
        return state
    flight_no, _ = _flight(state)
    response = {k: payload[k] for k in ("option", "level", "segments", "duration_type", "temporary_until")
                if k in payload}
    result = saf.apply_assistance_response(persona, flight_no, response)
    if result["error"] is None:
        persona["assistance"] = result["assistance"]
        if response.get("option") == "FORGET":
            _set_memory_item_consent(persona, seat_key, "DONT_REMEMBER")
    state.setdefault("agent_audit_log", [])[:0] = _audit_entries(seat_key, result["audit_events"])
    state["last_assistance_response"] = {"seat": seat_key, "error": result["error"],
                                         "request": result["request"], "simulated": True}
    return apply_spatial_and_assistance(state)


def on_memory_consent_change(state: Dict[str, Any], seat_key: str, item_id: str, new_consent: str) -> Dict[str, Any]:
    """Keep assistance memory in step with the 3-way consent matrix.

    DONT_REMEMBER means zero retention (Guardrail #4), so it erases the stored need and
    history (FORGET) while keeping this trip's existing request. CREW and SERVICE_ONLY
    only change who may see the details."""
    if ASSIST_MEMORY_ITEM_IDS.get(seat_key) != item_id:
        return state
    persona = state.get("personas", {}).get(seat_key)
    if persona is None or not isinstance(persona.get("assistance"), dict):
        return state
    target = CONSENT_TO_ASSIST.get(str(new_consent).upper())
    if target is None:
        return state
    if target == "DONT_REMEMBER":
        return apply_assistance_answer(state, seat_key, {"option": "FORGET"})
    block = copy.deepcopy(persona["assistance"])
    if block.get("consent") == "DONT_REMEMBER":
        block["need"], block["history"] = None, []      # never resurrect erased memory
    block["consent"] = target
    persona["assistance"] = block
    return apply_spatial_and_assistance(state)
