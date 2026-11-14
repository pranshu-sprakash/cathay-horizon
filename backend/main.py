"""
Cathay Horizon — Master FastAPI Server (Port 8000)
Owned by: CS Lead
Serves all 8 endpoints with zero-422 flexible payload handling:
1. GET  /api/state
2. POST /api/toggle-privacy
3. POST /api/trigger-delay
4. POST /api/accept-lounge
5. POST /api/toggle-offline
6. POST /api/submit-feedback
7. POST /api/reset
8. POST /api/assist-response   (MAE #2 merge: one-tap assistance memory answers)
"""

import copy
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent_engine import (
    build_prioritised_crew_cards,
    compile_universal_memory_item,
    compute_arrival_and_pickup_eta,
    run_delay_agent,
)
import spatial_and_flight
import state_sync  # MAE #2: computed schedule, Window Moments & assistance memory -> shared state

app = FastAPI(
    title="Cathay Horizon API",
    description="Cathay remembers, so you never ask twice — CX251 (HKG -> LHR)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INITIAL_STATE_PATH = Path(__file__).resolve().parent / "initial_state.json"
STATE: Dict[str, Any] = {}

CONSENT_CYCLE = ["SHARE_WITH_CREW", "SERVICE_ONLY", "DONT_REMEMBER"]


def _now_hkt() -> str:
    return datetime.now().strftime("%H:%M:%S HKT")


def _normalize_seat(seat_raw: str) -> str:
    if not seat_raw:
        return "11A"
    s = str(seat_raw).strip().upper()
    if s in ("14G/14K", "14G", "14K"):
        return "14K"
    return s if s in STATE.get("personas", {}) else "11A"


def _normalize_consent(val: str) -> str:
    v = str(val).strip().upper()
    if v in ("CREW", "SHARE_WITH_CREW"):
        return "SHARE_WITH_CREW"
    if v in ("SERVICE", "SERVICE_ONLY"):
        return "SERVICE_ONLY"
    if v in ("DONT_REMEMBER", "DON'T_REMEMBER", "PRIVATE", "NONE"):
        return "DONT_REMEMBER"
    return "SHARE_WITH_CREW"


def load_initial_state() -> Dict[str, Any]:
    """Loads `initial_state.json` cleanly from disk into memory."""
    global STATE
    if INITIAL_STATE_PATH.exists():
        with open(INITIAL_STATE_PATH, "r", encoding="utf-8") as f:
            STATE = json.load(f)
    else:
        STATE = {}
    if STATE:
        state_sync.apply_spatial_and_assistance(STATE)   # computed, offline (local data files only)
        for seat in state_sync.SEATS_WITH_COMPUTED_CREW_CARDS:
            build_prioritised_crew_cards(STATE, target_seat=seat)
    return STATE


@app.on_event("startup")
def on_startup() -> None:
    # Optional pre-flight weather refresh (the module's ONLY network call, bounded to 3 s).
    # Off by default so the demo stays offline and the committed sample cache is not rewritten.
    if os.environ.get("CATHAY_REFRESH_WEATHER") == "1":
        spatial_and_flight.refresh_weather_cache()
    load_initial_state()


# Ensure STATE is loaded even when imported directly in tests
load_initial_state()


# ============================================================================
# 1. GET /api/state
# ============================================================================
@app.get("/api/state")
def get_state() -> Dict[str, Any]:
    if not STATE:
        load_initial_state()
    return STATE


# ============================================================================
# 2. POST /api/toggle-privacy
# ============================================================================
@app.post("/api/toggle-privacy")
def toggle_privacy(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """
    Cycles or sets a memory item's 3-way consent between:
      SHARE_WITH_CREW | SERVICE_ONLY | DONT_REMEMBER
    OR updates the 6-tap Rhythm Quiz answers (`quiz_step` / `selection`),
    and immediately rebuilds the passenger's Crew Card preview & audit log.
    """
    global STATE
    if not STATE:
        load_initial_state()

    seat = _normalize_seat(
        payload.get("seat") or payload.get("persona_seat") or "11A"
    )
    persona = STATE["personas"].get(seat)
    if not persona:
        return STATE

    # Case A: Updating 6-tap Rhythm Quiz answer
    quiz_step = payload.get("quiz_step") or payload.get("step")
    quiz_id = payload.get("quiz_id")
    if quiz_step is not None or quiz_id is not None or payload.get("action_type") == "update_quiz":
        selection = payload.get("selection") or payload.get("value")
        for ans in persona.get("rhythm_quiz_answers", []):
            if (quiz_step is not None and ans.get("step") == int(quiz_step)) or (
                quiz_id is not None and ans.get("id") == quiz_id
            ):
                if selection:
                    ans["selection"] = selection
                ans["completed"] = True
        persona["rhythm_quiz_completed"] = True
        build_prioritised_crew_cards(STATE, target_seat=seat)
        STATE.setdefault("agent_audit_log", []).insert(
            0,
            {
                "id": f"audit_quiz_{int(datetime.now().timestamp())}",
                "timestamp": _now_hkt(),
                "feature": "A1_RHYTHM_QUIZ",
                "persona_seat": seat,
                "action": f"Updated 6-Tap Rhythm Quiz preference for {persona.get('name')}",
                "status": "APPROVED",
                "guardrail": "Guardrail #1 Passed: Rhythm preference synced to passenger memory profile.",
            },
        )
        return STATE

    # Case B: Toggling or setting 3-Way Consent on a memory item
    pref_id = payload.get("pref_id") or payload.get("item_id") or payload.get("id")
    requested_consent = payload.get("consent_level") or payload.get("consent")

    memory_items = persona.get("memory_items", [])
    target_item = None
    if pref_id:
        target_item = next((i for i in memory_items if i.get("id") == pref_id), None)
    if target_item is None and memory_items:
        target_item = memory_items[0]

    if target_item is not None:
        current_consent = _normalize_consent(target_item.get("consent", "SHARE_WITH_CREW"))
        if requested_consent:
            new_consent = _normalize_consent(requested_consent)
        else:
            idx = CONSENT_CYCLE.index(current_consent) if current_consent in CONSENT_CYCLE else 0
            new_consent = CONSENT_CYCLE[(idx + 1) % len(CONSENT_CYCLE)]

        target_item["consent"] = new_consent

        # Keep Lee Family top-level external_sms_consent in sync if toggled
        if target_item.get("id") == "lee_external_sms":
            persona["external_sms_consent"] = new_consent

        # MAE #2: keep assistance memory in step with its consent item (DONT_REMEMBER erases it)
        state_sync.on_memory_consent_change(STATE, seat, target_item.get("id"), new_consent)

        # Immediately rebuild the passenger's Crew Card preview
        build_prioritised_crew_cards(STATE, target_seat=seat)

        guardrail_msg = (
            "Guardrail #4 Active: Item set to DONT_REMEMBER — stripped from Crew iPad & Service logistics."
            if new_consent == "DONT_REMEMBER"
            else (
                "Guardrail #2 Active: Item set to SERVICE_ONLY — stripped from Crew iPad; active for ground/arrival only."
                if new_consent == "SERVICE_ONLY"
                else "Guardrail #1 & #5 Passed: Item shared with Crew iPad using dignified behavioral phrasing."
            )
        )
        STATE.setdefault("agent_audit_log", []).insert(
            0,
            {
                "id": f"audit_consent_{int(datetime.now().timestamp())}",
                "timestamp": _now_hkt(),
                "feature": "A2_CONSENT_TOGGLE",
                "persona_seat": seat,
                "action": f"Updated '{target_item.get('label', '')[:42]}' consent -> {new_consent}",
                "status": "BLOCKED" if new_consent == "DONT_REMEMBER" else "APPROVED",
                "guardrail": guardrail_msg,
            },
        )

    return STATE


# ============================================================================
# 3. POST /api/trigger-delay
# ============================================================================
@app.post("/api/trigger-delay")
def trigger_delay(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """Triggers the +40m CX251 delay re-plan across all 4 personas and 8 Guardrails."""
    global STATE
    if not STATE:
        load_initial_state()
    STATE = run_delay_agent(STATE)
    # MAE #2: recompute schedule, Window Moments and assistance legs for the new delay
    state_sync.apply_spatial_and_assistance(STATE)
    build_prioritised_crew_cards(STATE)
    return STATE


# ============================================================================
# 4. POST /api/accept-lounge
# ============================================================================
@app.post("/api/accept-lounge")
def accept_lounge(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """
    Mr. Mathur (11A) accepts the Pier Lounge Dinner offer:
    - Sets `lounge_dine_accepted = True` for 11A
    - Adds +65m protected rest
    - Updates 11A's Crew Card to 'Dined in Pier Lounge — Direct to Bed Turn-down'
    - Updates catering & cabin brief counts
    """
    global STATE
    if not STATE:
        load_initial_state()

    p11a = STATE["personas"]["11A"]
    p11a["lounge_dine_accepted"] = True
    p11a["lounge_offer_pending"] = False
    p11a["protected_rest_bonus_minutes"] = 65

    if "delay_lounge_offer" in p11a:
        p11a["delay_lounge_offer"]["accepted"] = True
        p11a["delay_lounge_offer"]["offer_pending"] = False

    # Update 11A Crew Card explicitly
    window_label = p11a.get("window_moment_label")  # computed by state_sync (None if no moment)
    p11a["crew_card"]["tier1_icons"] = [
        {"icon": "BedDouble", "label": "Dined in Lounge -> Bed"},
        {"icon": "Moon", "label": "+65m Protected Sleep"},
    ] + ([{"icon": "Sunrise", "label": window_label}] if window_label else [])
    p11a["crew_card"]["tier2_line"] = (
        "Mr. R. Mathur (Diamond) • EN • Dined in Pier Lounge — Direct to Bed Turn-down"
    )
    p11a["crew_card"]["tier3_details"] = [
        "Dined in Pier Lounge — Direct to Bed Turn-down at takeoff (+65m protected rest).",
        "Onboard main dinner meal released back to catering inventory (1 Express Dine -> 0).",
        f"Window Moments opt-in: {p11a.get('window_moment_action', 'No Window Moment computed')}",
    ]
    p11a["crew_card_status"] = "Dined in Pier Lounge — Direct to Bed Turn-down"

    # Update Skybook rest hours protected (+65m)
    if STATE.get("skybook_history"):
        STATE["skybook_history"][0]["rest_hours_protected"] = 9.6

    # Update Cabin Brief & Catering counts
    build_prioritised_crew_cards(STATE, target_seat="11A")
    STATE["cabin_brief_summary"]["catering_meals_reallocated"] = 1
    STATE["cabin_brief_summary"]["resting_count"] = 3
    STATE["cabin_brief_summary"]["express_dine_count"] = 0
    STATE["cabin_brief_summary"]["lounge_dined_count"] = 1

    STATE.setdefault("agent_audit_log", []).insert(
        0,
        {
            "id": f"audit_lounge_11a_{int(datetime.now().timestamp())}",
            "timestamp": _now_hkt(),
            "feature": "A5_PIER_LOUNGE_DINING_SHIFT",
            "persona_seat": "11A",
            "action": "11A accepted Pier Lounge Dinner -> +65m onboard sleep unlocked; Crew Card set to 'Dined in Pier Lounge — Direct to Bed Turn-down'",
            "status": "APPROVED",
            "guardrail": "Guardrail #1 & #8 Passed: Catering count decremented by 1; Crew iPad updated prior to Gate 65 closure.",
        },
    )
    return STATE


# ============================================================================
# 5. POST /api/toggle-offline
# ============================================================================
@app.post("/api/toggle-offline")
def toggle_offline(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """Toggles `flight.in_air_offline` to demonstrate Gate Closure / Airplane Mode."""
    global STATE
    if not STATE:
        load_initial_state()

    flight = STATE["flight"]
    if "in_air_offline" in payload:
        flight["in_air_offline"] = bool(payload["in_air_offline"])
    else:
        flight["in_air_offline"] = not bool(flight.get("in_air_offline", False))

    is_offline = flight["in_air_offline"]
    STATE.setdefault("agent_audit_log", []).insert(
        0,
        {
            "id": f"audit_offline_{int(datetime.now().timestamp())}",
            "timestamp": _now_hkt(),
            "feature": "B1_AIRPLANE_MODE_SYNC",
            "persona_seat": "CABIN",
            "action": (
                "Gate 65 Closed -> Airplane Mode ON (Crew iPad running 100% on local cached snapshot)"
                if is_offline
                else "Ground Connectivity Restored -> Live Cloud Sync Active"
            ),
            "status": "APPROVED",
            "guardrail": "Guardrail #8 Passed: Zero certified aircraft avionics/IFE dependencies; offline deterministic fallback engaged.",
        },
    )
    return STATE


# ============================================================================
# 6. POST /api/submit-feedback
# ============================================================================
@app.post("/api/submit-feedback")
def submit_feedback(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """
    Multi-purpose feedback & compiler endpoint:
    - Triggers `compile_universal_memory_item` when `action_type` (or `type`) == "compile_memory"
    - Handles Crew 1-Tap Quick-Note (B7) when `action_type` == "crew_note" or `note_text` provided
    - Handles Memory Moment approval/dismissal (B4) when `action_type` == "memory_moment"
    - Handles Post-Flight rating/feedback submission
    """
    global STATE
    if not STATE:
        load_initial_state()

    action_type = (
        payload.get("action_type")
        or payload.get("type")
        or ("compile_memory" if ("raw_text" in payload or "raw_label" in payload) else "feedback")
    )

    # Branch 1: Universal Context Compiler
    if action_type == "compile_memory":
        seat = _normalize_seat(payload.get("seat") or payload.get("persona_seat") or "11A")
        raw_text = (
            payload.get("raw_text")
            or payload.get("raw_label")
            or payload.get("text")
            or "Photophobia / Migraine Sensitivity"
        )
        consent_level = (
            payload.get("consent_level")
            or payload.get("consent")
            or "SHARE_WITH_CREW"
        )
        STATE = compile_universal_memory_item(STATE, seat, raw_text, consent_level)
        return STATE

    # Branch 2: B7 Crew Quick-Note (1-Tap Crew Observation -> Post-Flight Passenger Confirmation)
    if action_type == "crew_note" or "note_text" in payload:
        seat = _normalize_seat(payload.get("seat") or "11A")
        persona = STATE["personas"].get(seat, STATE["personas"]["11A"])
        note_text = payload.get(
            "note_text",
            "Preferred extra buckwheat pillow & jasmine tea before landing",
        )
        confirmed = payload.get("passenger_confirmed", True)
        persona["crew_quick_note"] = {
            "sent": True,
            "note_text": note_text,
            "passenger_confirmed": bool(confirmed),
        }
        STATE.setdefault("agent_audit_log", []).insert(
            0,
            {
                "id": f"audit_b7_{int(datetime.now().timestamp())}",
                "timestamp": _now_hkt(),
                "feature": "B7_CREW_QUICK_NOTE",
                "persona_seat": seat,
                "action": f"Crew logged 1-tap note for {seat}: '{note_text}' (Queued for passenger opt-in after landing)",
                "status": "APPROVED",
                "guardrail": "Guardrail #1 Passed: Crew observation staged; never committed to permanent profile without passenger confirmation.",
            },
        )
        return STATE

    # Branch 3: B4 Memory Moment Crew Approval / Dismissal (14G/14K Lee Family)
    if action_type == "memory_moment":
        seat = _normalize_seat(payload.get("seat") or "14K")
        persona = STATE["personas"].get(seat, STATE["personas"]["14K"])
        decision = str(payload.get("decision", "APPROVED")).upper()
        if persona.get("crew_card", {}).get("memory_moment"):
            persona["crew_card"]["memory_moment"]["status"] = decision
        STATE["cabin_brief_summary"]["memory_moments_pending"] = 0
        STATE.setdefault("agent_audit_log", []).insert(
            0,
            {
                "id": f"audit_b4_{int(datetime.now().timestamp())}",
                "timestamp": _now_hkt(),
                "feature": "B4_MEMORY_MOMENT_ACTION",
                "persona_seat": "14G/14K",
                "action": f"Crew {decision.lower()} proactive descent ear-pressure care (warm milk/water 30m prior) for Lee Family",
                "status": "APPROVED",
                "guardrail": "Guardrail #1 Passed: Consented returning-family memory delivered without passenger asking twice.",
            },
        )
        return STATE

    # Branch 4: Post-Flight Rating / General Feedback
    seat = _normalize_seat(payload.get("seat") or "11A")
    rating = payload.get("rating", 5)
    comment = payload.get("comment", "Seamless journey — Cathay remembered every detail.")
    STATE["last_feedback"] = {
        "seat": seat,
        "rating": rating,
        "comment": comment,
        "timestamp": _now_hkt(),
    }
    STATE.setdefault("agent_audit_log", []).insert(
        0,
        {
            "id": f"audit_feedback_{int(datetime.now().timestamp())}",
            "timestamp": _now_hkt(),
            "feature": "POST_FLIGHT_FEEDBACK",
            "persona_seat": seat,
            "action": f"Post-flight feedback recorded ({rating}/5 stars): '{comment}'",
            "status": "APPROVED",
            "guardrail": "Guardrail #1 Passed: Passenger-verified memory ledger updated for future Skybook.",
        },
    )
    return STATE


# ============================================================================
# 7. POST /api/reset
# ============================================================================
@app.post("/api/reset")
def reset_state(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """Reloads `initial_state.json` cleanly from disk."""
    return load_initial_state()


# ============================================================================
# 8. POST /api/assist-response  (MAE #2 merge)
# ============================================================================
@app.post("/api/assist-response")
def assist_response(payload: Dict[str, Any] = Body(default={})) -> Dict[str, Any]:
    """
    Applies an explicit one-tap assistance answer (nothing is ever auto-submitted):
      {"seat": "12K", "option": "YES_SAME" | "YES_NEW" | "CHANGE" | "NO" | "FORGET",
       "level"?: "WCHR" | "WCHS" | "WCHC", "segments"?: [...], "duration_type"?: "LASTING" | "TEMPORARY",
       "temporary_until"?: "YYYY-MM-DD"}
    Updates personas[seat].assistance / assistance_prompt / assistance_plan (simulated record)
    and the audit log. Invalid answers change nothing and log a BLOCKED entry.
    """
    global STATE
    if not STATE:
        load_initial_state()
    seat = _normalize_seat(payload.get("seat") or payload.get("persona_seat") or "12K")
    state_sync.apply_assistance_answer(STATE, seat, payload)
    build_prioritised_crew_cards(STATE, target_seat=seat)
    return STATE


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
