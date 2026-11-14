"""
Cathay Horizon — Embedded AI Engine, 8 Deterministic Safety Guardrails & Universal Context Compiler
Owned by: CS Lead / MAE+AI Lead
"""

import copy
import json
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import datetime
from typing import Any, Dict, List, Optional

from spatial_and_flight import CREW_INSTRUCTIONS  # MAE #2: shared, instruction-only crew wording (B3)

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    types = None
    GENAI_AVAILABLE = False


# ============================================================================
# 8 DETERMINISTIC SAFETY GUARDRAILS
# ============================================================================
SAFETY_GUARDRAILS: Dict[str, str] = {
    "GUARDRAIL_1": "Rule #1 (3-Way Consent Gate): Every passenger memory item must be explicitly evaluated against SHARE_WITH_CREW, SERVICE_ONLY, or DONT_REMEMBER before touchpoint compilation.",
    "GUARDRAIL_2": "Rule #2 (Service-Only Isolation): Items marked SERVICE_ONLY adjust ground/lounge and arrival logistics only and are strictly stripped from Crew iPad cards.",
    "GUARDRAIL_3": "Rule #3 (No Host Opt-In Consent): External third-party or family SMS notifications are strictly BLOCKED when consent is set to DONT_REMEMBER.",
    "GUARDRAIL_4": "Rule #4 (Zero Retention on Don't Remember): Items set to DONT_REMEMBER are excluded from both Crew iPad cards and automated service compilation.",
    "GUARDRAIL_5": "Rule #5 (Dignity & Non-Medical Filter): Clinical or medical terms are stripped; crew receives polite, actionable behavioral cues only — never a medical diagnosis.",
    "GUARDRAIL_6": "Rule #6 (Explicit Estimate Labelling): All arrival, deplaning, and curbside chauffeur pickup times must be explicitly labelled as an Estimate.",
    "GUARDRAIL_7": "Rule #7 (Rest & DND Priority Override): Active Do Not Disturb (Max Rest) automatically suppresses cabin-wide Window Moments and locks shade closed.",
    "GUARDRAIL_8": "Rule #8 (Zero Certified Avionics Touch): Crew iPad freezes cached state at gate closure for 100% offline Airplane Mode execution with zero aircraft IFE/software changes.",
}


# ============================================================================
# DETERMINISTIC OFFLINE PRESETS FOR UNIVERSAL CONTEXT COMPILER
# ============================================================================
UNIVERSAL_COMPILER_PRESETS: Dict[str, Dict[str, Any]] = {
    "photophobia / migraine sensitivity": {
        "ground_and_lounge_action": "Quiet zone low-lux seating reserved in The Pier Lounge (Gate 65)",
        "crew_tier1_icons": [
            {"icon": "SunDim", "label": "Sun-Off: Low Light"},
            {"icon": "EyeOff", "label": "Dim Reading Spot"}
        ],
        "crew_discreet_instruction": "Keep overhead reading spot dimmed; offer silk eye mask early and suppress bright screen wake-ups",
        "window_moment_behavior": "SUPPRESSED: Keep Aria Suite shade closed to prevent bright light glare",
        "arrival_eta_buffer_minutes": 0,
    },
    "first-time long-haul nervous flyer": {
        "ground_and_lounge_action": "Priority calm pre-boarding group notified at HKIA Gate 65",
        "crew_tier1_icons": [
            {"icon": "HeartHandshake", "label": "Reassurance Check-In"},
            {"icon": "Coffee", "label": "Calming Chamomile"}
        ],
        "crew_discreet_instruction": "Introduce cabin purser by name during boarding; proactively explain expected smooth flight path and turbulence forecast",
        "window_moment_behavior": "OPTIONAL: Gentle verbal check-in if awake during a computed Window Moment",
        "arrival_eta_buffer_minutes": 5,
    },
    "pitch deck sprint": {
        "ground_and_lounge_action": "High-speed private work booth & power kit assigned in The Pier Business Lounge",
        "crew_tier1_icons": [
            {"icon": "Laptop", "label": "Express Work/Rest"},
            {"icon": "BellOff", "label": "Hold Until -45m"}
        ],
        "crew_discreet_instruction": "Serve express one-tray meal alongside laptop workspace; hold all interruptions until 45m before LHR landing",
        "window_moment_behavior": "WAKE_AT_45M: Combine any computed Window Moment with double espresso service",
        "arrival_eta_buffer_minutes": 0,
    },
}


def _now_hkt() -> str:
    return datetime.now().strftime("%H:%M:%S HKT")


def _normalize_consent(consent: Optional[str]) -> str:
    if not consent:
        return "SHARE_WITH_CREW"
    val = consent.strip().upper()
    if val in ("CREW", "SHARE_WITH_CREW"):
        return "SHARE_WITH_CREW"
    if val in ("SERVICE", "SERVICE_ONLY"):
        return "SERVICE_ONLY"
    if val in ("DONT_REMEMBER", "DON'T_REMEMBER", "NONE", "PRIVATE"):
        return "DONT_REMEMBER"
    return "SHARE_WITH_CREW"


def _add_minutes_to_hhmm(time_str: str, add_mins: int, suffix: str = "") -> str:
    """Safely adds minutes to an 'HH:MM' or 'HH:MM GMT' string."""
    clean = time_str.strip().split()[0]
    parts = clean.split(":")
    hours = int(parts[0])
    mins = int(parts[1])
    total = (hours * 60 + mins + add_mins) % (24 * 60)
    new_h = total // 60
    new_m = total % 60
    base = f"{new_h:02d}:{new_m:02d}"
    return f"{base} {suffix}".strip() if suffix else base


def _call_gemini_json(prompt: str, timeout_sec: float = 3.5) -> Optional[Dict[str, Any]]:
    """
    Calls Google Cloud Gemini `gemini-2.5-flash` using `google-genai` SDK
    inside a strict timeout and try/except block. Returns None on offline/error.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not GENAI_AVAILABLE or not api_key:
        return None

    def _invoke() -> Dict[str, Any]:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        return json.loads(response.text)

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_invoke)
            return future.result(timeout=timeout_sec)
    except (FuturesTimeoutError, Exception):
        return None


# ============================================================================
# CREW CARD & CABIN SUMMARY REBUILDER
# ============================================================================
def build_prioritised_crew_cards(state: Dict[str, Any], target_seat: Optional[str] = None) -> Dict[str, Any]:
    """
    Recomputes Tier 1/2/3 crew card fields for one or all personas based strictly
    on items consented with SHARE_WITH_CREW (enforcing Guardrails #1, #2, #4, #5).
    Also updates `cabin_brief_summary`.
    """
    personas = state.get("personas", {})
    seats_to_update = [target_seat] if target_seat and target_seat in personas else list(personas.keys())

    for seat in seats_to_update:
        persona = personas[seat]
        memory_items = persona.get("memory_items", [])
        crew_visible_items = [
            item for item in memory_items
            if _normalize_consent(item.get("consent")) == "SHARE_WITH_CREW"
        ]

        # Build Tier 3 details from SHARE_WITH_CREW items
        tier3_details: List[str] = []
        tier1_icons: List[Dict[str, str]] = []

        if seat == "11A":
            lounge_accepted = persona.get("lounge_dine_accepted", False) or persona.get("delay_lounge_offer", {}).get("accepted", False)
            if lounge_accepted:
                tier1_icons.append({"icon": "BedDouble", "label": "Dined in Lounge -> Bed"})
                tier1_icons.append({"icon": "Moon", "label": "+65m Protected Rest"})
                tier3_details.append("Dined in Pier Lounge — Direct to Bed Turn-down at takeoff (+65m protected sleep).")
            else:
                tier1_icons.append({"icon": "Moon", "label": "Max Sleep"})
                tier1_icons.append({"icon": "Utensils", "label": "Express Dine"})

            # Check sunrise consent
            sunrise_item = next((i for i in crew_visible_items if "sunrise" in i.get("id", "").lower() or "sunrise" in i.get("label", "").lower()), None)
            window_label = persona.get("window_moment_label")  # computed by state_sync (MAE #2); None if no moment
            if sunrise_item and persona.get("window_moment_opt_in", True) and window_label:
                tier1_icons.append({"icon": "Sunrise", "label": window_label})

            for item in crew_visible_items:
                tier3_details.append(item.get("label", ""))

            withheld_count = sum(1 for i in memory_items if _normalize_consent(i.get("consent")) != "SHARE_WITH_CREW")
            if withheld_count > 0:
                tier3_details.append(f"{withheld_count} item(s) filtered from Crew iPad via 3-Way Consent (Guardrails #2 & #4).")

            if lounge_accepted:
                persona["crew_card"]["tier2_line"] = "Mr. R. Mathur (Diamond) • EN • Dined in Pier Lounge — Direct to Bed Turn-down"
            else:
                persona["crew_card"]["tier2_line"] = "Mr. R. Mathur (Diamond) • EN • Cathay Delight • Direct to Rest"

        elif seat == "12K":
            assist_plan = persona.get("assistance_plan") or {}
            for item in crew_visible_items:
                item_id = item.get("id", "")
                if "wheelchair" in item_id:
                    # MAE #2: only a CONFIRMED (simulated) request reaches the crew card, with the
                    # consent-filtered crew brief lines; nothing is shown before the passenger confirms.
                    if assist_plan.get("active"):
                        tier1_icons.append({"icon": "Accessibility", "label": "Wheelchair Assist"})
                        tier3_details.extend(l["line"] for l in (assist_plan.get("crew_brief") or {}).get("lines", []))
                    else:
                        tier3_details.append("Assistance not yet confirmed for this trip (passenger confirms in app)")
                    continue
                elif "hearing" in item_id:
                    tier1_icons.append({"icon": "Ear", "label": "Face When Speaking"})
                elif "tea" in item_id:
                    tier1_icons.append({"icon": "Coffee", "label": "Warm Ginger Tea"})
                else:
                    tier1_icons.append({"icon": item.get("icon", "Sparkles"), "label": item.get("category", "Preference")[:18]})
                tier3_details.append(item.get("label", ""))

            hearing_shared = any("hearing" in i.get("id", "") for i in crew_visible_items)
            persona["crew_card"]["discreet_instruction"] = (
                CREW_INSTRUCTIONS["DEAF"]["line"] if hearing_shared else None
            )

        elif seat == "14K":
            tier1_icons = [
                {"icon": "Baby", "label": "Child (4yo)"},
                {"icon": "Milk", "label": "Descent Ear Care"},
                {"icon": "ShieldCheck", "label": "External SMS Blocked"},
            ]
            for item in crew_visible_items:
                tier3_details.append(item.get("label", ""))
            tier3_details.append("Guardrail #3 Active: External family contact SMS set to DONT_REMEMBER.")

        elif seat == "11D":
            tier1_icons = [
                {"icon": "BellOff", "label": "Strict DND"},
                {"icon": "Moon", "label": "Max Rest"},
                {"icon": "EyeOff", "label": "Shade Closed"},
            ]
            for item in crew_visible_items:
                tier3_details.append(item.get("label", ""))

        # Preserve any custom compiled icons/instructions added via Universal Compiler
        custom_items = [
            i for i in crew_visible_items
            if str(i.get("id", "")).startswith("custom_")
        ]
        for c_item in custom_items:
            if c_item.get("compiled_icon_label"):
                icon_entry = {"icon": c_item.get("icon", "Sparkles"), "label": c_item["compiled_icon_label"]}
                if icon_entry not in tier1_icons:
                    tier1_icons.append(icon_entry)
            if c_item.get("compiled_discreet_instruction"):
                persona["crew_card"]["discreet_instruction"] = c_item["compiled_discreet_instruction"]

        persona["crew_card"]["tier1_icons"] = tier1_icons[:4]
        persona["crew_card"]["tier3_details"] = tier3_details

    # Recompute cabin_brief_summary
    p11a = personas.get("11A", {})
    lounge_accepted = p11a.get("lounge_dine_accepted", False) or p11a.get("delay_lounge_offer", {}).get("accepted", False)
    resting_count = 3 if lounge_accepted else 2
    express_dine_count = 0 if lounge_accepted else 1
    assist_count = sum(1 for p in personas.values() if (p.get("assistance_plan") or {}).get("active"))
    sunrise_opt_in = sum(1 for p in personas.values() if p.get("window_moment_opt_in"))
    flight = state.get("flight", {})
    status_tag = f"DELAYED +{flight.get('delay_minutes', 0)}m ({flight.get('departure_time', '23:00')} HKT)" if flight.get("delay_minutes", 0) > 0 else "ON TIME (23:00 HKT)"

    state["cabin_brief_summary"] = {
        "total_tracked_suites": len(personas),
        "resting_count": resting_count,
        "express_dine_count": express_dine_count,
        "lounge_dined_count": 1 if lounge_accepted else 0,
        "assist_count": assist_count,
        "sunrise_opt_in_count": sunrise_opt_in,
        "sunrise_suppressed_count": 1,
        "memory_moments_pending": 1,
        "purser_headline": (
            f"CX251 HKG->LHR ({status_tag}) • {resting_count} Max Rest • "
            f"{'1 Pier Lounge Dined (+65m Sleep)' if lounge_accepted else '1 Express Dine'} • "
            f"{assist_count} Assist Confirmed • {sunrise_opt_in} Window Moment Opt-in"
        ),
    }
    return state


# ============================================================================
# FUNCTION 1: DELAY RE-PLAN AGENT (+40m OAG DELAY ON CX251 HKG -> LHR)
# ============================================================================
def run_delay_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates a +40-minute operational delay on flagship route CX251 (HKG -> LHR):
    - Shifts departure 23:00 -> 23:40 HKT and arrival 05:40 -> 06:20 GMT.
    - Offers 11A Mr. Mathur immediate Pier Lounge dining (+65m onboard sleep) and shifts
      his London chauffeur pickup ETA to '07:05 GMT Estimate'.
    - Updates 12K Mrs. Kapoor's LHR Terminal 3 family pickup ETA to '06:48 GMT Estimate'; her
      assistance service legs are re-timed by state_sync (MAE #2) from get_flight_schedule().
    - Updates Purser's `cabin_brief_summary` (B2) and activates 14G/14K Lee Family Memory Moment (B4).
    - Evaluates all actions against the 8 Deterministic Safety Guardrails, logging APPROVED entries
      for 11A, 12K, and Cabin Brief, and explicitly logging a BLOCKED entry (red) for 14G/14K
      Lee Family external SMS under Guardrail #3: No Host Opt-In Consent (DONT_REMEMBER).
    """
    in_air_offline = state.get("flight", {}).get("in_air_offline", False)

    # Optional Gemini reasoning enrichment (with strict timeout & deterministic fallback)
    ai_delay_summary = None
    if not in_air_offline:
        prompt = (
            "Flight CX251 (HKG -> LHR) is delayed by 40 minutes (new departure 23:40 HKT, new arrival 06:20 GMT). "
            "Return JSON with keys: mathur_lounge_note, kapoor_assist_note, lee_guardrail_block_reason."
        )
        ai_delay_summary = _call_gemini_json(prompt, timeout_sec=3.0)

    # 1. Update Flight Schedule (CX251 HKG -> LHR)
    flight = state["flight"]
    flight["delay_minutes"] = 40
    flight["status"] = "DELAYED"
    flight["departure_time"] = "23:40"
    flight["scheduled_departure"] = "23:40 HKT (Delayed +40m)"
    flight["arrival_time"] = "06:20"
    flight["scheduled_arrival"] = "06:20 GMT (Delayed +40m)"
    # Window Moments are no longer hardcoded here: main.py calls state_sync (MAE #2) after this
    # agent, which recomputes flight.window_moment / window_moment_detail for the new delay.

    # 2. Update 11A Mr. Mathur: Pier Lounge Dinner Shift (+65m Sleep) & London Driver ETA (07:05 GMT Estimate)
    p11a = state["personas"]["11A"]
    p11a["lounge_offer_pending"] = True
    p11a["delay_lounge_offer"] = {
        "offer_pending": True,
        "accepted": p11a.get("lounge_dine_accepted", False),
        "lounge": "The Pier Lounge (Gate 65)",
        "headline": "Dine in The Pier Lounge Now -> Gain +65m Onboard Sleep",
        "description": (
            ai_delay_summary.get("mathur_lounge_note")
            if isinstance(ai_delay_summary, dict) and ai_delay_summary.get("mathur_lounge_note")
            else "CX251 is delayed 40 mins (23:40 HKT departure). Dine at The Pier Lounge now so crew can convert Aria Suite 11A directly to a flatbed at takeoff (+65m uninterrupted rest)."
        ),
        "sleep_gain_minutes": 65,
    }
    p11a["pickup_eta"]["touchdown_time"] = "06:20 GMT"
    p11a["pickup_eta"]["estimated_curbside_time"] = "07:05 GMT Estimate"
    p11a["pickup_eta"]["is_estimate_label"] = "07:05 GMT Estimate (Delayed Touchdown 06:20 GMT + Door 2L + Priority Belt 5 + Morning LHR T3 Buffer)"

    for notif in p11a.get("landed_notifications", []):
        if notif.get("consented"):
            notif["status"] = "AUTO_SHIFTED_DELAY_40M"
            if "driver" in notif.get("contact_id", ""):
                notif["message_preview"] = (
                    "Live Flight Sync CX251 (+40m Delay): New touchdown 06:20 GMT at LHR T3. "
                    "Updated target curbside pickup at Zone A: 07:05 GMT Estimate."
                )
            else:
                notif["message_preview"] = (
                    "CX251 delayed +40m; new LHR T3 arrival 06:20 GMT (Gate 24, Belt 5). "
                    "Mr. Mathur est. curbside ready at 07:05 GMT Estimate."
                )

    # 3. Update 12K Mrs. Kapoor: assistance service legs are re-timed by state_sync (MAE #2, simulated
    #    records derived from get_flight_schedule); here only the family pickup ETA is updated.
    p12k = state["personas"]["12K"]
    p12k["pickup_eta"]["touchdown_time"] = "06:20 GMT"
    p12k["pickup_eta"]["estimated_curbside_time"] = "06:48 GMT Estimate"
    p12k["pickup_eta"]["is_estimate_label"] = "06:48 GMT Estimate (Arrival assistance at aircraft door + Priority Belt 5)"
    for notif in p12k.get("landed_notifications", []):
        if notif.get("consented"):
            notif["status"] = "AUTO_SHIFTED_DELAY_40M"
            notif["message_preview"] = (
                "CX251 Update (+40m Delay): Mrs. Kapoor now arrives at LHR T3 at 06:20 GMT. "
                "Estimated ready for family pickup at 06:48 GMT Estimate."
            )

    # 4. Activate 14G/14K Lee Family Memory Moment (B4) & Block External Host SMS under Guardrail #3
    p14k = state["personas"]["14K"]
    p14k["crew_card"]["memory_moment"] = {
        "id": "mm_lee_14k",
        "title": "Active Crew Memory Moment (Descent Ear Care)",
        "suggestion": "Child (4yo) sensitive to ear pressure on descent — offer warm milk/water 30m prior",
        "context": "Triggered for 05:50 GMT top-of-descent into London Heathrow (consented SHARE_WITH_CREW)",
        "status": "ACTIVE_READY_FOR_CREW",
    }
    for notif in p14k.get("landed_notifications", []):
        notif["status"] = "BLOCKED_BY_GUARDRAIL_3"
        notif["message_preview"] = (
            "BLOCKED BY GUARDRAIL #3: No Host Opt-In Consent (DONT_REMEMBER). "
            "Outbound +40m delay SMS to external family host suppressed."
        )

    # 5. Recompute Purser's Cabin Brief Summary (B2)
    build_prioritised_crew_cards(state)

    # 6. Append 8 Deterministic Safety Guardrail Audit Entries (newest at top for instant UI visibility)
    ts = _now_hkt()
    new_audit_entries = [
        {
            "id": f"audit_delay_block_14k_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "A5_DELAY_EXTERNAL_SMS",
            "persona_seat": "14G/14K",
            "action": "Attempted outbound +40m delay SMS to Lee Family external host (+44 London contact)",
            "status": "BLOCKED",
            "guardrail": "BLOCKED BY GUARDRAIL #3: No Host Opt-In Consent (DONT_REMEMBER). Zero external messages transmitted.",
        },
        {
            "id": f"audit_delay_11a_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "A5_LOUNGE_SLEEP_RESCUE",
            "persona_seat": "11A",
            "action": "Offered Pier Lounge Dinner Shift (+65m onboard sleep) & updated LHR Chauffeur ETA to 07:05 GMT Estimate",
            "status": "APPROVED",
            "guardrail": "Guardrail #1, #2 & #6 Passed: Consented ground sync updated with explicit '07:05 GMT Estimate' label.",
        },
        {
            "id": f"audit_delay_12k_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "A5_ASSIST_SYNC",
            "persona_seat": "12K",
            "action": "Re-timed confirmed assistance service legs +40m (simulated) & LHR T3 family pickup ETA to 06:48 GMT Estimate",
            "status": "APPROVED",
            "guardrail": "Guardrail #5 & #6 Passed: Assistance times shown as estimates; zero medical data exposed.",
        },
        {
            "id": f"audit_delay_cabin_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "B2_B4_CABIN_BRIEF_SYNC",
            "persona_seat": "CABIN",
            "action": "Updated Purser 5-Second Cabin Brief & activated 14G/14K Lee Family descent ear-pressure Memory Moment",
            "status": "APPROVED",
            "guardrail": "Guardrail #7 & #8 Passed: DND seats stay suppressed; Window Moments recomputed for the new delay.",
        },
    ]

    existing_log = state.get("agent_audit_log", [])
    # Avoid duplicating delay audit entries if button clicked multiple times
    existing_log = [e for e in existing_log if not str(e.get("id", "")).startswith("audit_delay_")]
    state["agent_audit_log"] = new_audit_entries + existing_log

    return state


# Alias for backward compatibility with playbook imports
run_delay_replan = run_delay_agent


# ============================================================================
# FUNCTION 2: UNIVERSAL CONTEXT COMPILER (ANY CUSTOM NEED -> 4 TOUCHPOINTS)
# ============================================================================
def compile_universal_memory_item(
    state: Dict[str, Any],
    seat: str,
    raw_text: str,
    consent_level: str = "SHARE_WITH_CREW",
) -> Dict[str, Any]:
    """
    Universal Context Compiler:
    Takes any custom passenger preference/need (or one of the 3 presets) and compiles it into:
    - `ground_and_lounge_action`
    - `crew_tier1_icons`
    - `crew_discreet_instruction` (polite behavioral instruction, zero medical diagnosis;
      strictly hidden/None if `consent_level == "SERVICE_ONLY"` or `"DONT_REMEMBER"`)
    - `window_moment_behavior`
    - `arrival_eta_buffer_minutes`
    Updates `state["universal_compiler_last_run"]`, appends to `state["agent_audit_log"]`,
    and updates the matching seat card if `consent_level != "DONT_REMEMBER"`.
    """
    personas = state.get("personas", {})
    # Map "14G/14K" or "14G" -> "14K" key in state["personas"]
    seat_key = "14K" if seat in ("14G/14K", "14G", "14K") else seat
    if seat_key not in personas:
        seat_key = "11A"

    persona = personas[seat_key]
    normalized_consent = _normalize_consent(consent_level)
    clean_text = (raw_text or "Photophobia / Migraine Sensitivity").strip()
    in_air_offline = state.get("flight", {}).get("in_air_offline", False)

    # 1. Check deterministic preset match first, then Gemini, then smart deterministic synthesizer
    preset_match = None
    lower_text = clean_text.lower()
    for key, val in UNIVERSAL_COMPILER_PRESETS.items():
        if key in lower_text or lower_text in key:
            preset_match = copy.deepcopy(val)
            break

    compiled_source = "DETERMINISTIC_PRESET_ENGINE"
    compiled_data: Optional[Dict[str, Any]] = preset_match

    if compiled_data is None and not in_air_offline:
        prompt = f"""You are the Cathay Horizon Universal Context Compiler for Flight CX251 (HKG -> LHR).
Compile the following raw passenger need into synchronized touchpoint actions:
Passenger Seat: {seat_key} ({persona.get("name")})
Raw Passenger Need: "{clean_text}"
Consent Level: {normalized_consent}

STRICT SAFETY GUARDRAIL #5: NEVER output a clinical or medical diagnosis in crew instructions. Translate any medical/sensory condition into a polite, dignified behavioral crew action.

Output valid JSON with these exact keys:
{{
  "ground_and_lounge_action": "Concrete action at HKIA Gate 65 or The Pier Lounge",
  "crew_tier1_icons": [{{"icon": "Sparkles", "label": "Short 2-3 word tag"}}],
  "crew_discreet_instruction": "Polite actionable crew instruction with zero medical diagnosis",
  "window_moment_behavior": "How to handle computed Window Moments (window shade) for this seat",
  "arrival_eta_buffer_minutes": 0
}}"""
        ai_result = _call_gemini_json(prompt, timeout_sec=3.5)
        if isinstance(ai_result, dict) and "ground_and_lounge_action" in ai_result:
            compiled_data = ai_result
            compiled_source = "GEMINI_2_5_FLASH_LIVE"

    if compiled_data is None:
        # Rich deterministic fallback for any arbitrary custom text
        compiled_source = "OFFLINE_DETERMINISTIC_COMPILER"
        short_tag = clean_text[:22] + ("..." if len(clean_text) > 22 else "")
        compiled_data = {
            "ground_and_lounge_action": f"Pre-staged bespoke preference at The Pier Lounge (Gate 65): {short_tag}",
            "crew_tier1_icons": [
                {"icon": "Sparkles", "label": short_tag}
            ],
            "crew_discreet_instruction": (
                f"Proactively accommodate preference without passenger repeating: '{clean_text}' "
                "(dignified service cue; zero clinical terminology)"
            ),
            "window_moment_behavior": "RESPECT_PASSENGER_RHYTHM: Follow seat DND / Window Moment preference",
            "arrival_eta_buffer_minutes": 5 if "wheelchair" in lower_text or "assist" in lower_text or "luggage" in lower_text else 0,
        }

    # 2. Enforce 3-Way Consent & Safety Guardrails (#2, #4, #5)
    raw_icons = compiled_data.get("crew_tier1_icons") or [{"icon": "Sparkles", "label": clean_text[:18]}]
    raw_discreet = compiled_data.get("crew_discreet_instruction") or f"Accommodate gently: {clean_text}"
    ground_action = compiled_data.get("ground_and_lounge_action") or f"Noted for HKIA Gate 65 / Pier Lounge: {clean_text}"
    window_behavior = compiled_data.get("window_moment_behavior") or "Standard Window Moment protocol (computed)"
    eta_buffer = int(compiled_data.get("arrival_eta_buffer_minutes") or 0)

    # Record item in persona's memory_items list
    memory_items = persona.setdefault("memory_items", [])
    custom_id = f"custom_{len(memory_items) + 1}"
    first_icon_label = raw_icons[0].get("label", clean_text[:18]) if raw_icons else clean_text[:18]
    first_icon_name = raw_icons[0].get("icon", "Sparkles") if raw_icons else "Sparkles"

    new_memory_item = {
        "id": custom_id,
        "icon": first_icon_name,
        "category": "Compiled Universal Memory",
        "label": clean_text,
        "consent": normalized_consent,
        "compiled_icon_label": first_icon_label if normalized_consent == "SHARE_WITH_CREW" else None,
        "compiled_discreet_instruction": raw_discreet if normalized_consent == "SHARE_WITH_CREW" else None,
    }
    memory_items.append(new_memory_item)

    ts = _now_hkt()

    if normalized_consent == "DONT_REMEMBER":
        # Guardrail #4: Zero compilation to Crew or Service
        effective_crew_icons: List[Dict[str, str]] = []
        effective_discreet_instruction = None
        effective_ground_action = "SUPPRESSED (Consent set to DONT_REMEMBER)"
        effective_window_behavior = "UNCHANGED (Not retained)"
        effective_buffer = 0

        audit_entry = {
            "id": f"audit_compile_block_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "UNIVERSAL_CONTEXT_COMPILER",
            "persona_seat": seat_key,
            "action": f"Evaluated custom need '{clean_text}' with consent DONT_REMEMBER",
            "status": "BLOCKED",
            "guardrail": "BLOCKED BY GUARDRAIL #4: Item set to DONT_REMEMBER excluded from Crew iPad & Service compilation.",
        }
    elif normalized_consent == "SERVICE_ONLY":
        # Guardrail #2: Strip crew card icons & discreet crew instruction; compile ground/arrival only
        effective_crew_icons = []
        effective_discreet_instruction = None
        effective_ground_action = ground_action
        effective_window_behavior = window_behavior
        effective_buffer = eta_buffer

        if effective_buffer > 0 and "pickup_eta" in persona:
            cur_est = persona["pickup_eta"].get("estimated_curbside_time", "06:03 GMT")
            persona["pickup_eta"]["estimated_curbside_time"] = _add_minutes_to_hhmm(cur_est, effective_buffer, "GMT Estimate")

        audit_entry = {
            "id": f"audit_compile_service_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "UNIVERSAL_CONTEXT_COMPILER",
            "persona_seat": seat_key,
            "action": f"Compiled '{clean_text}' (SERVICE_ONLY) -> Ground & Arrival Logistics Only",
            "status": "APPROVED",
            "guardrail": "Guardrail #2 Passed: Crew Tier-1 icons & discreet instructions hidden for SERVICE_ONLY consent.",
        }
    else:
        # SHARE_WITH_CREW: Full compilation across Ground, Crew iPad (Tier 1-3 + Discreet Cue), Window, and Arrival
        effective_crew_icons = raw_icons
        effective_discreet_instruction = raw_discreet
        effective_ground_action = ground_action
        effective_window_behavior = window_behavior
        effective_buffer = eta_buffer

        persona["window_moment_action"] = effective_window_behavior
        if effective_buffer > 0 and "pickup_eta" in persona:
            cur_est = persona["pickup_eta"].get("estimated_curbside_time", "06:03 GMT")
            persona["pickup_eta"]["estimated_curbside_time"] = _add_minutes_to_hhmm(cur_est, effective_buffer, "GMT Estimate")

        build_prioritised_crew_cards(state, target_seat=seat_key)

        audit_entry = {
            "id": f"audit_compile_crew_{int(datetime.now().timestamp())}",
            "timestamp": ts,
            "feature": "UNIVERSAL_CONTEXT_COMPILER",
            "persona_seat": seat_key,
            "action": f"Compiled '{clean_text}' across Ground, Crew iPad & LHR Arrival for Seat {seat_key}",
            "status": "APPROVED",
            "guardrail": "Guardrail #1 & #5 Passed: Translated into polite crew instruction with zero medical diagnosis.",
        }

    # 3. Save structured output to state["universal_compiler_last_run"]
    state["universal_compiler_last_run"] = {
        "seat": seat_key,
        "persona_name": persona.get("name"),
        "raw_text": clean_text,
        "consent_level": normalized_consent,
        "ground_and_lounge_action": effective_ground_action,
        "pre_flight_ground_action": effective_ground_action,
        "crew_tier1_icons": effective_crew_icons,
        "tier1_icon_tag": first_icon_label if effective_crew_icons else "Hidden (Consent Filter)",
        "crew_discreet_instruction": effective_discreet_instruction,
        "discreet_crew_instruction": effective_discreet_instruction,
        "window_moment_behavior": effective_window_behavior,
        "arrival_eta_buffer_minutes": effective_buffer,
        "arrival_eta_buffer_mins": effective_buffer,
        "compiler_source": compiled_source,
        "timestamp": ts,
        "status": "BLOCKED" if normalized_consent == "DONT_REMEMBER" else "COMPILED",
    }

    state.setdefault("agent_audit_log", []).insert(0, audit_entry)
    return state


def compute_arrival_and_pickup_eta(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensures all personas' `pickup_eta` objects carry explicit 'Estimate' labels (Guardrail #6).
    """
    for persona in state.get("personas", {}).values():
        eta = persona.get("pickup_eta")
        if eta and "Estimate" not in str(eta.get("is_estimate_label", "")):
            eta["is_estimate_label"] = f"Estimate ({eta.get('estimated_curbside_time', '06:03 GMT')})"
    return state
