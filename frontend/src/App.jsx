import React, { useState, useEffect, useCallback } from "react";
import {
  Plane,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Sparkles,
  WifiOff,
  RotateCcw,
  Sliders,
  UserCheck,
  MapPin,
  AlertTriangle,
} from "lucide-react";

// ============================================================================
// TEAMMATE COMPONENT SLOTS (UNCOMMENT WHEN ISDN DROPS FILES IN src/components/)
// ============================================================================
// import PreFlightPassengerExternal from "./components/PreFlightPassenger";
// import InFlightCrewPadExternal from "./components/InFlightCrewPad";
// import PostFlightArrivalExternal from "./components/PostFlightArrival";

const API_BASE = "http://" + window.location.hostname + ":8000";
const STORAGE_KEY = "cathay_horizon_cx251_state_cache";

const COMPILER_PRESETS = [
  "Photophobia / Migraine Sensitivity",
  "First-Time Long-Haul Nervous Flyer",
  "Pitch Deck Sprint — Do Not Disturb Until 45m Before Landing",
];

const EIGHT_GUARDRAILS_META = [
  {
    id: "Rule #1",
    title: "3-Way Consent Gate",
    desc: "Every memory item is evaluated against SHARE_WITH_CREW, SERVICE_ONLY, or DONT_REMEMBER.",
  },
  {
    id: "Rule #2",
    title: "Service-Only Isolation",
    desc: "SERVICE_ONLY items adjust ground/arrival logistics only and are stripped from Crew iPads.",
  },
  {
    id: "Rule #3",
    title: "No Host Opt-In Consent",
    desc: "BLOCKS outbound third-party/family delay SMS when consent is DONT_REMEMBER (14G/14K Lee Family).",
  },
  {
    id: "Rule #4",
    title: "Zero Retention on Don't Remember",
    desc: "DONT_REMEMBER items are excluded from both Crew iPad cards and service compilation.",
  },
  {
    id: "Rule #5",
    title: "Dignity & Non-Medical Filter",
    desc: "Clinical diagnoses are stripped; crew receives polite behavioral cues only (12K Mrs. Kapoor).",
  },
  {
    id: "Rule #6",
    title: "Explicit Estimate Labelling",
    desc: "All arrival and curbside pickup times are explicitly labelled as an Estimate.",
  },
  {
    id: "Rule #7",
    title: "Rest & DND Priority Override",
    desc: "Active Do Not Disturb (11D Ms. Chen) suppresses cabin Window Moments and keeps shade closed.",
  },
  {
    id: "Rule #8",
    title: "Zero Certified Avionics Touch",
    desc: "Crew iPad freezes cached state at gate closure for 100% offline Airplane Mode execution.",
  },
];

// Embedded last-resort state so UI renders immediately even before backend or mock_state.json loads
const FALLBACK_INITIAL_STATE = {
  flight: {
    flight_number: "CX251",
    route: "HKG -> LHR",
    origin: "HKG",
    origin_terminal: "Terminal 1",
    gate: "65",
    destination: "LHR",
    arrival_terminal: "Terminal 3",
    arrival_gate: "24",
    baggage_belt: "Belt 5",
    aircraft: "Boeing 777-300ER (Aria Suite)",
    status: "ON_TIME",
    delay_minutes: 0,
    departure_time: "23:00",
    arrival_time: "05:40",
    in_air_offline: false,
    lounge_name: "The Pier, First & Business Lounge (Near Gate 65)",
    window_moment: "English Channel Sunrise (05:55 GMT)",
  },
  personas: {
    "11A": {
      seat: "11A",
      name: "Mr. R. Mathur",
      tier: "Diamond",
      cabin: "Business (Aria Suite)",
      archetype: "Time-Critical Executive Traveller",
      rhythm_quiz_completed: true,
      rhythm_quiz_answers: [
        { step: 1, id: "sleep_priority", question: "Tonight's Priority", selection: "Maximise Uninterrupted Sleep", completed: true },
        { step: 2, id: "dining_pace", question: "Dining Preference", selection: "Express Dine or Pre-Flight Lounge", completed: true },
        { step: 3, id: "wake_preference", question: "Wake & Window Moments", selection: "Wake for English Channel Sunrise & Breakfast", completed: true },
        { step: 4, id: "beverage_memory", question: "Signature Welcome Drink", selection: "Cathay Delight & Warm Towel", completed: true },
        { step: 5, id: "work_mode", question: "Cabin Ambience", selection: "Direct to Rest After Boarding", completed: true },
        { step: 6, id: "ground_sync", question: "London Arrival Sync", selection: "Auto-Sync Chauffeur & Executive Assistant", completed: true },
      ],
      memory_items: [
        { id: "pref_drink", category: "In-Flight Dining", label: "Cathay Delight on boarding; sparkling water with meal", consent: "SHARE_WITH_CREW" },
        { id: "pref_sleep", category: "Rest & Cabin Rhythm", label: "Skip main meal onboard if dined in lounge; maximise sleep", consent: "SHARE_WITH_CREW" },
        { id: "pref_sunrise", category: "Window Moment", label: "Opt-in: Gently wake for English Channel Sunrise (Left Side 11A)", consent: "SHARE_WITH_CREW" },
        { id: "pref_ground_driver", category: "Ground Logistics", label: "Sync LHR Terminal 3 curbside ETA with Blacklane Chauffeur", consent: "SERVICE_ONLY" },
        { id: "pref_board_meeting", category: "Private Calendar Context", label: "09:00 GMT Mayfair M&A Board Meeting (Private Reason for Rest)", consent: "DONT_REMEMBER" },
      ],
      delay_lounge_offer: {
        offer_pending: false,
        accepted: false,
        lounge: "The Pier Lounge (Gate 65)",
        headline: "Dine in The Pier Lounge Now -> Gain +65m Onboard Sleep",
        description: "CX251 is delayed 40 mins (23:40 HKT departure). Enjoy your full dinner in The Pier Lounge now so crew can convert Suite 11A directly into a flatbed at takeoff.",
        sleep_gain_minutes: 65,
      },
      window_moment_opt_in: true,
      window_moment_action: "Wake Gently & Open Aria Suite Shade at 05:55 GMT (English Channel Sunrise)",
      crew_card: {
        tier1_icons: [
          { icon: "Clock", label: "Max Sleep" },
          { icon: "Sparkles", label: "Express Dine" },
          { icon: "Sparkles", label: "Sunrise Wake (05:55 GMT)" },
        ],
        tier2_line: "Mr. R. Mathur (Diamond) • EN • Cathay Delight • Direct to Rest",
        tier3_details: [
          "Prefer immediate bed turn-down after welcome drink if dined at The Pier.",
          "Opted in to English Channel Sunrise Window Moment (wake gently 45m prior to LHR landing).",
        ],
        discreet_instruction: null,
        memory_moment: null,
      },
      crew_quick_note: {
        sent: false,
        note_text: "Preferred extra buckwheat pillow & jasmine tea before landing",
        passenger_confirmed: true,
      },
      landed_notifications: [
        {
          contact_id: "mathur_pa",
          name: "Elena Rostova (Executive Assistant)",
          channel: "SMS / WhatsApp",
          consented: true,
          status: "READY_ON_TOUCHDOWN",
          message_preview: "CX251 landed at LHR Terminal 3 (Gate 24, Belt 5). Mr. Mathur est. curbside ready at 06:03 GMT.",
        },
        {
          contact_id: "mathur_driver",
          name: "Arthur Pendelton (Mayfair Chauffeur)",
          channel: "Driver Dispatch Link",
          consented: true,
          status: "READY_ON_TOUCHDOWN",
          message_preview: "Live Flight Sync CX251: Touchdown 05:40 GMT. Priority baggage Belt 5. Target pickup Zone A at 06:03 GMT.",
        },
      ],
      pickup_eta: {
        destination_airport: "LHR Terminal 3",
        touchdown_time: "05:40 GMT",
        estimated_curbside_time: "06:03 GMT",
        is_estimate_label: "Estimate (Touchdown + 8m Door 2L Deplaning + 15m Priority Belt 5)",
        pickup_zone: "LHR T3 Chauffeur Zone A (Short Stay Level 1)",
        driver_name: "Arthur Pendelton — Mercedes S-Class (LD74 CXH)",
        shareable_link: "https://cathay.horizon/pickup/cx251-11a-lhr",
      },
    },
    "12K": {
      seat: "12K",
      name: "Mrs. S. Kapoor",
      age: 74,
      tier: "Gold",
      cabin: "Business (Aria Suite)",
      archetype: "Dignified Accessibility & Non-Visible Hearing Assist",
      assist_profile: {
        opted_in: true,
        mobility_support: "Step-Free Terminal Escort & Aircraft-Door Wheelchair (WCHC/WCHR)",
        communication_preference: "Non-visible hearing support: face passenger directly when speaking",
        boarding_preference: "Calm Pre-Boarding from HKIA Assist Meeting Point C",
      },
      memory_items: [
        { id: "kapoor_hearing", category: "Communication Cue", label: "Hearing: face passenger when speaking (Discreet Crew Instruction)", consent: "SHARE_WITH_CREW" },
        { id: "kapoor_wheelchair", category: "Step-Free Mobility", label: "Confirmed Wheelchair at HKIA Meeting Point C & LHR T3 Aircraft Door 2L", consent: "SHARE_WITH_CREW" },
        { id: "kapoor_tea", category: "In-Flight Comfort", label: "Warm ginger tea after boarding; extra blanket for knees", consent: "SHARE_WITH_CREW" },
        { id: "kapoor_family_eta", category: "Arrival Family Sync", label: "Auto-update son (Aarav Kapoor) with LHR Terminal 3 step-free exit ETA", consent: "SERVICE_ONLY" },
      ],
      departure_assist_map: {
        airport: "HKG",
        meeting_point: "HKIA Assist Meeting Point C (Level 7 Departures)",
        assigned_gate: "Gate 65",
        pickup_time: "22:05 HKT",
        step_free_duration_mins: 8,
        route_summary: "Drop-Off Door 2 -> Step-Free Lift L4 -> Assist Meeting Point C -> Gate 65",
        qr_code_payload: "CX251-12K-HKG-MEETING-POINT-C-2205HKT",
        pins: [
          { id: "hkg_dropoff", label: "Drop-Off Door 2", top: "74%", left: "16%" },
          { id: "hkg_meeting_c", label: "Assist Meeting Point C (22:05 HKT)", top: "48%", left: "44%" },
          { id: "hkg_gate65", label: "Gate 65 (Pier Level)", top: "24%", left: "84%" },
        ],
      },
      arrival_assist_map: {
        airport: "LHR Terminal 3",
        handover_point: "Aircraft Door 2L (Jetbridge Step-Free Handover)",
        wheelchair_status: "CONFIRMED_AT_AIRCRAFT_DOOR_2L",
        assigned_belt: "Belt 5 (Priority Assist Carousel)",
        meeting_zone: "LHR T3 Arrivals Family Meeting Point (Exit B)",
        step_free_duration_mins: 14,
        route_summary: "Aircraft Door 2L -> Dedicated Lift -> Priority Border -> Belt 5 -> Family Pickup Exit B",
        pins: [
          { id: "lhr_door2l", label: "Aircraft Door 2L (Chair Waiting)", top: "22%", left: "18%" },
          { id: "lhr_belt5", label: "Priority Belt 5", top: "58%", left: "58%" },
          { id: "lhr_family_exit", label: "T3 Family Pickup Zone B", top: "78%", left: "86%" },
        ],
      },
      crew_card: {
        tier1_icons: [
          { icon: "UserCheck", label: "Assist: Door 2L" },
          { icon: "UserCheck", label: "Face When Speaking" },
          { icon: "Sparkles", label: "Warm Ginger Tea" },
        ],
        tier2_line: "Mrs. S. Kapoor (Gold, 74) • EN/HI • Warm Ginger Tea • Step-Free Assist",
        tier3_details: [
          "Hearing: face passenger when speaking",
          "Wheelchair pre-confirmed at LHR Terminal 3 Aircraft Door 2L.",
        ],
        discreet_instruction: "Hearing: face passenger when speaking",
        memory_moment: null,
      },
      landed_notifications: [
        {
          contact_id: "kapoor_son",
          name: "Aarav Kapoor (Son — LHR Family Pickup)",
          channel: "SMS / WhatsApp",
          consented: true,
          status: "READY_ON_TOUCHDOWN",
          message_preview: "Mrs. Kapoor has landed on CX251 at LHR T3. Aircraft-door wheelchair escort active; meeting you at Exit B at 06:08 GMT.",
        },
      ],
      pickup_eta: {
        destination_airport: "LHR Terminal 3",
        touchdown_time: "05:40 GMT",
        estimated_curbside_time: "06:08 GMT",
        is_estimate_label: "Estimate (Aircraft Door 2L Escort + Step-Free Border + Priority Belt 5)",
        pickup_zone: "LHR T3 Arrivals Concourse — Family Meeting Point B",
        driver_name: "Aarav Kapoor (Son — Family Pickup)",
      },
    },
    "14K": {
      seat: "14G/14K",
      seat_key: "14K",
      name: "The Lee Family (Mr. D. Lee & Leo, age 4)",
      tier: "Green / Returning Family",
      cabin: "Business (Aria Suite — Center Twin 14G/14K)",
      archetype: "Returning Family with Young Child + Strict External Privacy",
      memory_items: [
        { id: "lee_child_ears", category: "In-Flight Family Memory", label: "Child (4yo) sensitive to ear pressure on descent — offer warm milk/water 30m prior", consent: "SHARE_WITH_CREW" },
        { id: "lee_center_divider", category: "Suite Setup", label: "Lower center divider between 14G and 14K prior to boarding; kids activity pack", consent: "SHARE_WITH_CREW" },
        { id: "lee_external_sms", category: "External Third-Party Contact", label: "External family delay SMS to Grandparents (+44 London landline/mobile)", consent: "DONT_REMEMBER" },
      ],
      external_sms_consent: "DONT_REMEMBER",
      crew_card: {
        tier1_icons: [
          { icon: "UserCheck", label: "Child (4yo)" },
          { icon: "Sparkles", label: "Descent Ear Care" },
          { icon: "Lock", label: "External SMS Blocked" },
        ],
        tier2_line: "The Lee Family (14G/14K) • EN/CANT • Divider Lowered • Warm Milk on Descent",
        tier3_details: [
          "Child (4yo) sensitive to ear pressure on descent — offer warm milk/water 30m prior",
          "Guardrail #3 Active: External family contact SMS set to DONT_REMEMBER.",
        ],
        discreet_instruction: "Proactively lower 14G/14K center suite partition before boarding.",
        memory_moment: {
          id: "mm_lee_14k",
          title: "Proactive Crew Memory Moment",
          suggestion: "Child (4yo) sensitive to ear pressure on descent — offer warm milk/water 30m prior",
          status: "PENDING_CREW_APPROVAL",
        },
      },
      landed_notifications: [
        {
          contact_id: "lee_external_family",
          name: "Grandma Lee (External Family Contact)",
          channel: "External SMS",
          consented: false,
          status: "BLOCKED_BY_GUARDRAIL_3",
          message_preview: "BLOCKED: Passenger set External Family SMS to DONT_REMEMBER.",
        },
      ],
      pickup_eta: {
        destination_airport: "LHR Terminal 3",
        touchdown_time: "05:40 GMT",
        estimated_curbside_time: "06:10 GMT",
        is_estimate_label: "Estimate (Family Deplaning + Stroller Delivery + Belt 5)",
        pickup_zone: "LHR T3 Heathrow Express Step-Free Transfer",
        driver_name: "Self-Transfer (External SMS Disabled by Consent)",
      },
    },
    "11D": {
      seat: "11D",
      name: "Ms. L. Chen",
      tier: "Gold",
      cabin: "Business (Aria Suite)",
      archetype: "Strict Do Not Disturb (Max Rest Priority)",
      do_not_disturb: true,
      memory_items: [
        { id: "chen_dnd", category: "Rest Protection", label: "Strict Do Not Disturb (Max Rest) — skip all meal and wake calls", consent: "SHARE_WITH_CREW" },
        { id: "chen_shade", category: "Window & Lighting", label: "Suppress all Window Moments; keep shade closed throughout flight", consent: "SHARE_WITH_CREW" },
      ],
      window_moment_opt_in: false,
      window_moment_action: "SUPPRESSED: Keep shade closed — Max Rest prioritised",
      crew_card: {
        tier1_icons: [
          { icon: "Lock", label: "Strict DND" },
          { icon: "Clock", label: "Max Rest" },
          { icon: "Lock", label: "Shade Closed" },
        ],
        tier2_line: "Ms. L. Chen (Gold) • EN/MAN • Strict Do Not Disturb • Skip All Wake Calls",
        tier3_details: [
          "Do Not Disturb (Max Rest) active from boarding to final safety checks.",
          "English Channel Sunrise Window Moment automatically SUPPRESSED — keep shade closed.",
        ],
        discreet_instruction: "Suppress all cabin announcements at seat; keep window shade closed.",
        memory_moment: null,
      },
      landed_notifications: [],
      pickup_eta: {
        destination_airport: "LHR Terminal 3",
        touchdown_time: "05:40 GMT",
        estimated_curbside_time: "05:48 GMT",
        is_estimate_label: "Estimate (Carry-On Only Express Exit)",
        pickup_zone: "LHR T3 Fast Track Arrivals",
        driver_name: "Private Transfer",
      },
    },
  },
  cabin_brief_summary: {
    total_tracked_suites: 4,
    resting_count: 2,
    express_dine_count: 1,
    assist_count: 1,
    sunrise_opt_in_count: 1,
    sunrise_suppressed_count: 1,
    memory_moments_pending: 1,
    purser_headline: "CX251 HKG->LHR • 2 Max Rest • 1 Express/Lounge Dine • 1 Door-2L Assist • 1 Sunrise Wake (05:55 GMT)",
  },
  agent_audit_log: [
    {
      id: "audit_init_1",
      timestamp: "22:15:02 HKT",
      feature: "A2_CONSENT_GATE",
      persona_seat: "11A",
      action: "Loaded Mr. Mathur's 6-Tap Rhythm Profile & 3-Way Consent Matrix",
      status: "APPROVED",
      guardrail: "Guardrail #1 & #2 Passed: Private Mayfair board meeting marked DONT_REMEMBER and stripped from Crew iPad payload.",
    },
    {
      id: "audit_init_2",
      timestamp: "22:15:04 HKT",
      feature: "B3_DIGNITY_FILTER",
      persona_seat: "12K",
      action: "Compiled Mrs. Kapoor's Assist Profile into Tier 1 Icon & Tier 3 Instruction",
      status: "APPROVED",
      guardrail: "Guardrail #5 Passed: Medical terminology stripped; crew sees actionable cue 'Hearing: face passenger when speaking'.",
    },
    {
      id: "audit_init_3",
      timestamp: "22:15:06 HKT",
      feature: "B4_MEMORY_MOMENT",
      persona_seat: "14K",
      action: "Queued Returning Family descent ear-pressure cue for Seats 14G/14K",
      status: "APPROVED",
      guardrail: "Guardrail #3 Armed: External family contact SMS set to DONT_REMEMBER — outbound third-party messaging locked.",
    },
  ],
  universal_compiler_last_run: null,
  skybook_history: [
    {
      id: "skybook_1",
      flight_number: "CX251",
      route: "HKG -> LHR",
      city: "London",
      date: "Nov 2026",
      seat: "11A",
      rest_hours_protected: 8.5,
      highlight: "English Channel Sunrise witnessed at 05:55 GMT; +65m sleep rescued via The Pier Lounge dining shift.",
      pin_coords: { top: "26%", left: "46%" },
    },
    {
      id: "skybook_2",
      flight_number: "CX524",
      route: "HKG -> NRT",
      city: "Tokyo",
      date: "Sep 2026",
      seat: "12A",
      rest_hours_protected: 4.2,
      highlight: "Mount Fuji Sunrise witnessed from Left Window 12A at 05:35 JST; zero wake-up disturbance prior.",
      pin_coords: { top: "38%", left: "82%" },
    },
  ],
};

// ============================================================================
// FAULT-TOLERANT CLASS ERROR BOUNDARY
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Component Render Error" };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[Cathay Horizon ErrorBoundary] ${this.props.viewName || "View"}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-[#1E293B] border border-[#F43F5E]/60 text-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F43F5E] font-semibold">
              <AlertTriangle className="w-5 h-5" />
              <span>Fault-Tolerant Sandbox Isolated Error ({this.props.viewName || "Module"})</span>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              className="px-3 py-1 text-xs rounded bg-[#C5A880] text-[#0F172A] font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry View
            </button>
          </div>
          <p className="text-xs text-slate-300 font-mono bg-[#0F172A] p-2.5 rounded border border-slate-700">
            {this.state.errorMessage}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// REUSABLE OFFLINE STEP-FREE TERMINAL MAP (A4 HKG & C1 LHR T3)
// ============================================================================
function StepFreeTerminalMap({ mapData, title }) {
  if (!mapData) return null;
  const pins = mapData.pins || [];

  return (
    <div className="rounded-xl bg-[#0F172A] border border-[#C5A880]/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#C5A880]" />
          <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold">
            {title || mapData.airport} • Offline Step-Free Vector Map
          </span>
        </div>
        <span className="px-2 py-0.5 text-[11px] rounded bg-[#006564] text-emerald-100 font-medium">
          {mapData.step_free_duration_mins || 8} mins Step-Free
        </span>
      </div>

      <div className="relative h-44 w-full rounded-lg bg-[#1E293B] border border-slate-700/80 overflow-hidden">
        {/* Step-Free SVG Vector Path */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goldRoute" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#006564" />
              <stop offset="50%" stopColor="#C5A880" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <path
            d="M 55 135 Q 150 90, 185 85 T 340 45"
            fill="none"
            stroke="url(#goldRoute)"
            strokeWidth="3.5"
            strokeDasharray="6 4"
          />
        </svg>

        {pins.map((pin, idx) => (
          <div
            key={pin.id || idx}
            style={{ top: pin.top || "50%", left: pin.left || "50%" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
          >
            <div className="w-6 h-6 rounded-full bg-[#0F172A] border-2 border-[#C5A880] flex items-center justify-center shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded bg-[#0F172A]/95 border border-[#C5A880]/50 text-[10px] text-slate-100 whitespace-nowrap shadow">
              {pin.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{mapData.route_summary}</p>

      {mapData.qr_code_payload && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <span>Escort QR Token:</span>
          <span className="font-mono text-[#C5A880]">{mapData.qr_code_payload}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BUILT-IN VIEW 1: PRE-FLIGHT PASSENGER PHONE (A1-A5)
// ============================================================================
function BuiltInPreFlightPassenger({
  state,
  activeSeat,
  setActiveSeat,
  onToggleConsent,
  onAcceptLounge,
}) {
  const flight = state?.flight || {};
  const personas = state?.personas || {};
  const persona = personas[activeSeat] || personas["11A"] || {};
  const isDelayed = (flight.delay_minutes || 0) > 0;

  return (
    <div className="rounded-2xl bg-[#1E293B] border border-[#C5A880]/40 p-4 space-y-4 shadow-xl">
      {/* Header & Persona Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#C5A880] block">
            View 1 • Pre-Flight Mobile App (A1–A5)
          </span>
          <h2 className="text-base font-serif text-white flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#C5A880]" />
            <span>{persona.name}</span>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 font-sans">
              Seat {persona.seat} • {persona.tier}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["11A", "12K", "14K", "11D"].map((seatKey) => {
            const p = personas[seatKey];
            if (!p) return null;
            const active = activeSeat === seatKey;
            return (
              <button
                key={seatKey}
                onClick={() => setActiveSeat(seatKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  active
                    ? "bg-[#C5A880] text-[#0F172A] font-semibold shadow"
                    : "bg-[#0F172A] text-slate-300 border border-slate-700 hover:border-[#C5A880]/50"
                }`}
              >
                {p.seat} {p.name?.split(" ")[1] || p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* A5 Delay Banner when +40m OAG Delay is active */}
      {isDelayed && (
        <div className="rounded-xl bg-[#0F172A] border-2 border-[#F59E0B] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F59E0B] font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>A5 Live Delay Re-Plan • CX251 Delayed +40m ({flight.departure_time} HKT)</span>
            </div>
            <span className="text-[11px] text-slate-300 font-mono">
              New LHR Arrival: {flight.arrival_time} GMT
            </span>
          </div>

          {activeSeat === "11A" && persona.delay_lounge_offer && (
            <div className="p-3 rounded-lg bg-[#1E293B] border border-[#C5A880]/50 space-y-2">
              <div className="text-sm font-serif text-[#C5A880]">
                {persona.delay_lounge_offer.headline}
              </div>
              <p className="text-xs text-slate-300">{persona.delay_lounge_offer.description}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400">
                  London Chauffeur ETA shifted to {persona.pickup_eta?.estimated_curbside_time}
                </span>
                {persona.lounge_dine_accepted || persona.delay_lounge_offer.accepted ? (
                  <span className="px-3 py-1 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pier Lounge Dinner Accepted (+65m Sleep)
                  </span>
                ) : (
                  <button
                    onClick={onAcceptLounge}
                    className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0F172A] text-xs font-semibold hover:bg-[#d4b992] transition"
                  >
                    Accept Pier Lounge Dinner (+65m Sleep)
                  </button>
                )}
              </div>
            </div>
          )}

          {activeSeat === "12K" && (
            <div className="p-2.5 rounded-lg bg-[#1E293B] border border-[#10B981]/40 text-xs text-slate-200 flex items-center justify-between">
              <span>
                HKIA Assist Meeting Point C Wheelchair Pickup auto-shifted +40m:
              </span>
              <span className="font-mono font-semibold text-[#10B981]">
                22:05 HKT {"->"} {persona.departure_assist_map?.pickup_time}
              </span>
            </div>
          )}

          {activeSeat === "14K" && (
            <div className="p-2.5 rounded-lg bg-[#F43F5E]/15 border border-[#F43F5E] text-xs text-rose-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F43F5E] shrink-0" />
              <span>
                <strong>Guardrail #3 BLOCKED:</strong> Outbound +40m delay SMS to external family host suppressed because consent is set to <code>DONT_REMEMBER</code>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* A1: 6-Tap Rhythm Quiz (Shown for 11A) */}
      {persona.rhythm_quiz_answers && persona.rhythm_quiz_answers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> A1 • Six-Tap Rhythm Quiz (Icons First, Zero Typing)
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 6/6 Saved to Cathay Memory
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {persona.rhythm_quiz_answers.map((item) => (
              <div
                key={item.id || item.step}
                className="p-2.5 rounded-xl bg-[#0F172A] border border-[#C5A880]/40 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tap #{item.step} • {item.question}</span>
                  <Sparkles className="w-3 h-3 text-[#C5A880]" />
                </div>
                <div className="mt-1 text-xs font-medium text-slate-100">{item.selection}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A3 & A4: Assist Profile & Step-Free Terminal Map (Shown for 12K Mrs. Kapoor) */}
      {persona.assist_profile && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#C5A880]/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> A3 • Dignified Special Assistance Profile
              </span>
              <span className="px-2 py-0.5 rounded bg-[#006564] text-[10px] text-emerald-100">
                Zero-Queue Confirmed
              </span>
            </div>
            <p className="text-xs text-slate-200">{persona.assist_profile.mobility_support}</p>
            <p className="text-xs text-[#C5A880]">
              Crew Cue: "{persona.crew_card?.discreet_instruction || "Hearing: face passenger when speaking"}" (Zero medical diagnosis shared)
            </p>
          </div>

          <StepFreeTerminalMap
            mapData={persona.departure_assist_map}
            title={`A4 • HKIA Meeting Point C (Pickup: ${persona.departure_assist_map?.pickup_time})`}
          />
        </div>
      )}

      {/* A2: Granular 3-Way Consent Per Memory Item */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> A2 • 3-Way Granular Consent Matrix (Tap to Switch Live)
          </span>
          <span className="text-[11px] text-slate-400">Updates Crew iPad Instantly</span>
        </div>

        <div className="space-y-2">
          {(persona.memory_items || []).map((item) => {
            const current = item.consent || "SHARE_WITH_CREW";
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                    {item.category || "Memory Item"}
                  </div>
                  <div className="text-xs text-slate-100">{item.label}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {[
                    { key: "SHARE_WITH_CREW", label: "Share w/ Crew", activeClass: "bg-[#10B981] text-[#0F172A]" },
                    { key: "SERVICE_ONLY", label: "Service Only", activeClass: "bg-[#F59E0B] text-[#0F172A]" },
                    { key: "DONT_REMEMBER", label: "Don't Remember", activeClass: "bg-[#F43F5E] text-white" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => onToggleConsent(activeSeat, item.id, opt.key)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                        current === opt.key
                          ? opt.activeClass
                          : "bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live "What Crew Sees" Transparency Preview */}
      <div className="p-3 rounded-xl bg-[#0F172A]/90 border border-[#006564] space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#C5A880] font-semibold uppercase tracking-wider">
            Live "What Crew Sees" Preview (Seat {persona.seat})
          </span>
          <span className="text-emerald-400">Guardrails #1, #2, #4, #5 Enforced</span>
        </div>
        <div className="text-xs text-slate-200 font-medium">{persona.crew_card?.tier2_line}</div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(persona.crew_card?.tier1_icons || []).map((ic, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-[#1E293B] border border-[#C5A880]/40 text-[11px] text-[#C5A880]"
            >
              {ic.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUILT-IN VIEW 2: IN-FLIGHT CREW iPAD BRIEF (B2-B4, B7, SUNRISE CONFLICT)
// ============================================================================
function BuiltInInFlightCrewPad({
  state,
  onApproveMemoryMoment,
  onSendCrewQuickNote,
}) {
  const [expandedSeats, setExpandedSeats] = useState({ "11A": true, "12K": true, "14K": true });
  const flight = state?.flight || {};
  const summary = state?.cabin_brief_summary || {};
  const personas = state?.personas || {};

  const toggleExpand = (seatKey) => {
    setExpandedSeats((prev) => ({ ...prev, [seatKey]: !prev[seatKey] }));
  };

  return (
    <div className="rounded-2xl bg-[#1E293B] border border-[#C5A880]/40 p-4 space-y-4 shadow-xl">
      {/* Top 5-Second Purser Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#C5A880] block">
            View 2 • Purser's Offline-First Crew iPad (B2–B4, B7)
          </span>
          <h2 className="text-base font-serif text-white">
            {summary.purser_headline || "CX251 HKG -> LHR Cabin Brief"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {flight.in_air_offline ? (
            <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] text-xs font-semibold flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" /> Airplane Mode (Cached Gate Snapshot)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-[#006564] text-emerald-100 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Gate Sync Active
            </span>
          )}
        </div>
      </div>

      {/* 5-Second Metric Counters */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-center">
          <div className="text-lg font-serif text-[#C5A880]">{summary.resting_count ?? 2}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Max Rest Suites</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-center">
          <div className="text-lg font-serif text-emerald-400">
            {summary.lounge_dined_count ? "1 Lounge" : `${summary.express_dine_count ?? 1} Express`}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Dining Shift</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-center">
          <div className="text-lg font-serif text-[#C5A880]">{summary.assist_count ?? 1}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Door 2L Assist</div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-center">
          <div className="text-lg font-serif text-amber-400">{summary.sunrise_opt_in_count ?? 1}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">05:55 Sunrise Wake</div>
        </div>
      </div>

      {/* English Channel Sunrise (05:55 GMT) Seat-by-Seat Conflict Resolution */}
      <div className="p-3 rounded-xl bg-[#0F172A] border border-[#C5A880]/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Window Moment Conflict Resolver • {flight.window_moment}
          </span>
          <span className="text-[10px] text-slate-400">Guardrail #7 Active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/60 text-amber-100 flex items-center justify-between">
            <span><strong>Seat 11A (Mr. Mathur):</strong> Opted In</span>
            <span className="font-semibold text-[#F59E0B]">Wake Gently & Open Shade</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-between">
            <span><strong>Seat 11D (Ms. Chen):</strong> Strict DND</span>
            <span className="font-semibold text-rose-400">SUPPRESSED • Keep Shade Closed</span>
          </div>
        </div>
      </div>

      {/* B2: Prioritised 3-Tier Passenger Cards */}
      <div className="space-y-2.5">
        {["11A", "12K", "14K", "11D"].map((seatKey) => {
          const p = personas[seatKey];
          if (!p) return null;
          const card = p.crew_card || {};
          const isExpanded = !!expandedSeats[seatKey];

          return (
            <div
              key={seatKey}
              className="rounded-xl bg-[#0F172A] border border-slate-700/90 p-3 space-y-2 transition hover:border-[#C5A880]/60"
            >
              {/* Tier 1 (Icons First) + Expand Toggle */}
              <div
                onClick={() => toggleExpand(seatKey)}
                className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#C5A880] text-[#0F172A] text-xs font-bold">
                    {p.seat}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(card.tier1_icons || []).map((ic, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#1E293B] border border-[#C5A880]/40 text-[11px] text-[#C5A880] font-medium flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> {ic.label}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isExpanded ? "Hide Tier 3 ▲" : "Tap for Tier 3 ▼"}
                </span>
              </div>

              {/* Tier 2 (One-Line Summary) */}
              <div className="text-xs text-slate-200 font-medium pl-1">{card.tier2_line}</div>

              {/* B3: Discreet Assistance Marker (Actionable Instruction, Never Medical Diagnosis) */}
              {card.discreet_instruction && (
                <div className="p-2 rounded-lg bg-[#006564]/30 border border-[#006564] text-xs text-emerald-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#C5A880]" />
                    <strong>B3 Discreet Crew Instruction:</strong> "{card.discreet_instruction}"
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                    No Diagnosis
                  </span>
                </div>
              )}

              {/* B4: Returning Family Memory Moment Card (14G/14K Lee Family) */}
              {card.memory_moment && (
                <div className="p-2.5 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> B4 Proactive Memory Moment • {card.memory_moment.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveMemoryMoment(seatKey, "APPROVED")}
                        className="px-2 py-0.5 rounded bg-[#10B981] text-[#0F172A] text-[11px] font-semibold"
                      >
                        Approve Cue
                      </button>
                      <button
                        onClick={() => onApproveMemoryMoment(seatKey, "DISMISSED")}
                        className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-[11px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-amber-100">{card.memory_moment.suggestion}</p>
                </div>
              )}

              {/* Tier 3: Expandable Details + B7 Crew Quick-Note */}
              {isExpanded && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {(card.tier3_details || []).map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>

                  {seatKey === "11A" && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        B7 1-Tap Crew Quick-Note: "{p.crew_quick_note?.note_text}"
                      </span>
                      <button
                        onClick={() => onSendCrewQuickNote("11A")}
                        className="px-2.5 py-1 rounded bg-[#1E293B] border border-[#C5A880]/50 text-[11px] text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0F172A] font-medium transition"
                      >
                        {p.crew_quick_note?.sent ? "✓ Quick-Note Queued for Landing" : "+ Log 1-Tap Crew Note"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BUILT-IN VIEW 3: POST-FLIGHT ARRIVAL & SKYBOOK (C1-C3, C5)
// ============================================================================
function BuiltInPostFlightArrival({ state, activeSeat }) {
  const flight = state?.flight || {};
  const personas = state?.personas || {};
  const p11a = personas["11A"] || {};
  const p12k = personas["12K"] || {};
  const p14k = personas["14K"] || {};
  const selectedPersona = personas[activeSeat] || p11a;

  return (
    <div className="rounded-2xl bg-[#1E293B] border border-[#C5A880]/40 p-4 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#C5A880] block">
            View 3 • London Heathrow Terminal 3 Arrival & Skybook (C1–C3, C5)
          </span>
          <h2 className="text-base font-serif text-white">
            LHR Terminal 3 Touchdown ({flight.arrival_time} GMT) • Gate {flight.arrival_gate || "24"} • {flight.baggage_belt || "Belt 5"}
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-semibold">
          Guardrail #6: Explicit Estimate Labels
        </span>
      </div>

      {/* C1: Mrs. Kapoor (12K) Aircraft-Door Wheelchair Handover & LHR T3 Step-Free Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" /> C1 • Seat 12K Mrs. Kapoor — LHR T3 Aircraft Door 2L Wheelchair Confirmed
          </span>
          <span className="text-xs font-mono text-emerald-400">
            Family Pickup ETA: {p12k.pickup_eta?.estimated_curbside_time}
          </span>
        </div>
        <StepFreeTerminalMap
          mapData={p12k.arrival_assist_map}
          title="LHR Terminal 3 • Door 2L Step-Free Arrival Route"
        />
      </div>

      {/* C3: Chauffeur & Family Pickup-Ready ETA Cards (11A & 12K) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[p11a, p12k].map((p) => {
          if (!p?.pickup_eta) return null;
          return (
            <div
              key={p.seat}
              className="p-3 rounded-xl bg-[#0F172A] border border-[#C5A880]/40 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#C5A880]">
                  C3 • {p.seat} {p.name} Pickup ETA
                </span>
                <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
              </div>
              <div className="text-lg font-serif text-white">
                {p.pickup_eta.estimated_curbside_time}
              </div>
              <div className="text-[11px] text-emerald-400">{p.pickup_eta.is_estimate_label}</div>
              <div className="text-xs text-slate-300">{p.pickup_eta.pickup_zone}</div>
              <div className="text-[11px] text-slate-400">{p.pickup_eta.driver_name}</div>
            </div>
          );
        })}
      </div>

      {/* C2: Auto "I've Landed" Messages + Guardrail #3 Blocked Lee Family SMS */}
      <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 space-y-2">
        <div className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold">
          C2 • Automated Touchdown Dispatch & Consent Enforcement
        </div>
        <div className="space-y-1.5">
          {[...(p11a.landed_notifications || []), ...(p12k.landed_notifications || []), ...(p14k.landed_notifications || [])].map(
            (notif, i) => {
              const blocked = !notif.consented || String(notif.status).includes("BLOCKED");
              return (
                <div
                  key={notif.contact_id || i}
                  className={`p-2 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                    blocked
                      ? "bg-[#F43F5E]/15 border-[#F43F5E] text-rose-200"
                      : "bg-[#1E293B] border-slate-700 text-slate-200"
                  }`}
                >
                  <div>
                    <span className="font-semibold">{notif.name}: </span>
                    <span>{notif.message_preview}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      blocked ? "bg-[#F43F5E] text-white" : "bg-[#10B981]/20 text-[#10B981]"
                    }`}
                  >
                    {blocked ? "BLOCKED (RULE #3)" : notif.status}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* C5: Skybook — Your Year with Cathay Map Pins */}
      <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#C5A880]/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> C5 • Skybook: Your Year with Cathay ({selectedPersona.name})
          </span>
          <span className="text-[11px] text-slate-400">Editorial Memory Ledger</span>
        </div>

        <div className="relative h-32 w-full rounded-lg bg-[#1E293B] border border-slate-700 overflow-hidden">
          {(state?.skybook_history || []).map((trip) => (
            <div
              key={trip.id}
              style={{
                top: trip.pin_coords?.top || "35%",
                left: trip.pin_coords?.left || "50%",
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              <div className="w-6 h-6 rounded-full bg-[#C5A880] text-[#0F172A] flex items-center justify-center shadow-lg">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="mt-1 px-2 py-0.5 rounded bg-[#0F172A] border border-[#C5A880]/50 text-[10px] text-[#C5A880] font-semibold whitespace-nowrap">
                {trip.flight_number} • {trip.city} ({trip.rest_hours_protected}h Rest Protected)
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(state?.skybook_history || []).map((trip) => (
            <div key={trip.id} className="p-2.5 rounded-lg bg-[#1E293B] border border-slate-700 text-xs space-y-1">
              <div className="flex items-center justify-between text-[#C5A880] font-semibold">
                <span>{trip.flight_number} ({trip.route})</span>
                <span>{trip.date}</span>
              </div>
              <p className="text-slate-300 text-[11px]">{trip.highlight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUILT-IN AUDITORIUM AGENT & 8-GUARDRAIL CONSOLE VIEW
// ============================================================================
export function AgentConsoleView({ state }) {
  const flight = state?.flight || {};
  const compilerRun = state?.universal_compiler_last_run;
  const auditLog = state?.agent_audit_log || [];

  return (
    <div className="rounded-2xl bg-[#0F172A] border-2 border-[#C5A880]/60 p-5 space-y-5 shadow-2xl">
      {/* Top Auditorium Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold block">
            Cathay Horizon • Embedded AI & Deterministic Guardrail Telemetry
          </span>
          <h2 className="text-xl font-serif text-white flex items-center gap-2.5 mt-0.5">
            <Plane className="w-5 h-5 text-[#C5A880]" />
            <span>
              Flight {flight.flight_number} ({flight.route}) • HKG Gate {flight.gate || "65"} {"->"} LHR {flight.arrival_terminal || "Terminal 3"}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              flight.status === "DELAYED"
                ? "bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B]"
                : "bg-[#10B981]/20 border border-[#10B981] text-[#10B981]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {flight.status} ({flight.departure_time} HKT {"->"} {flight.arrival_time} GMT)
          </span>

          <span className="px-3 py-1 rounded-full bg-[#1E293B] border border-[#C5A880]/50 text-xs text-[#C5A880] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {flight.window_moment}
          </span>
        </div>
      </div>

      {/* Live Universal Context Compiler Output Card */}
      <div className="rounded-xl bg-[#1E293B] border border-[#C5A880]/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C5A880]" />
            <h3 className="text-sm font-serif text-[#C5A880] uppercase tracking-wider">
              Universal Context Compiler • Live 1-to-4 Touchpoint Synthesis
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {compilerRun
              ? `Source: ${compilerRun.compiler_source} • Seat ${compilerRun.seat} (${compilerRun.consent_level})`
              : "Ready — Select a Preset or Custom Need in the Presenter Bar"}
          </span>
        </div>

        {compilerRun ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-700 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                1. Pre-Flight Ground / Pier Lounge
              </div>
              <div className="text-xs text-slate-100 font-medium">
                {compilerRun.ground_and_lounge_action}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-700 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                2. Crew iPad Tier-1 Icon Tag
              </div>
              <div className="text-xs text-emerald-400 font-semibold">
                {compilerRun.crew_tier1_icons && compilerRun.crew_tier1_icons.length > 0
                  ? compilerRun.crew_tier1_icons.map((i) => i.label).join(" • ")
                  : "HIDDEN (Filtered by Consent Guardrail #2/#4)"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-700 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                3. Discreet Crew Instruction (Zero Diagnosis)
              </div>
              <div className="text-xs text-slate-100">
                {compilerRun.crew_discreet_instruction ||
                  "STRIPPED — Hidden from Crew iPad because consent is SERVICE_ONLY or DONT_REMEMBER"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0F172A] border border-slate-700 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#C5A880]">
                4. Window Moment & LHR Arrival Buffer
              </div>
              <div className="text-xs text-slate-200">
                {compilerRun.window_moment_behavior} (+{compilerRun.arrival_eta_buffer_minutes || 0}m LHR buffer)
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-300 bg-[#0F172A] p-3 rounded-lg border border-slate-800">
            Use <strong>[4. Universal Compiler Preset]</strong> in the top Presenter Control Bar to compile any custom passenger need (e.g., <em>"Photophobia / Migraine Sensitivity"</em> or <em>"First-Time Long-Haul Nervous Flyer"</em>) across Ground, Crew iPad, Window Moment, and LHR Arrival in real time.
          </div>
        )}
      </div>

      {/* 8 Deterministic Safety Guardrails Reference Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {EIGHT_GUARDRAILS_META.map((g) => (
          <div
            key={g.id}
            className="p-2.5 rounded-xl bg-[#1E293B]/90 border border-slate-700/80 space-y-1"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#C5A880]">
              <span>{g.id}</span>
              <Lock className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div className="text-xs font-medium text-white">{g.title}</div>
            <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
          </div>
        ))}
      </div>

      {/* Live 8-Guardrail Audit Log */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-serif text-[#C5A880] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C5A880]" />
            <span>Live 8-Guardrail Deterministic Audit Stream ({auditLog.length} Events)</span>
          </h3>
          <span className="text-xs text-slate-400">
            Emerald = APPROVED • Crimson = BLOCKED BY GUARDRAIL
          </span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {auditLog.map((entry, idx) => {
            const isBlocked = entry.status === "BLOCKED";
            const isSuppressed = entry.status === "SUPPRESSED";
            return (
              <div
                key={entry.id || idx}
                className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                  isBlocked
                    ? "bg-[#F43F5E]/15 border-2 border-[#F43F5E] text-rose-100"
                    : isSuppressed
                    ? "bg-[#F59E0B]/15 border border-[#F59E0B]/70 text-amber-100"
                    : "bg-[#1E293B] border border-slate-700 text-slate-100"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-slate-400">{entry.timestamp}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0F172A] text-[#C5A880] font-semibold">
                      Seat {entry.persona_seat}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">{entry.feature}</span>
                  </div>
                  <div className="text-sm font-medium">{entry.action}</div>
                  <div className="text-xs text-slate-300">{entry.guardrail}</div>
                </div>

                <div className="shrink-0">
                  {isBlocked ? (
                    <span className="px-3 py-1 rounded-full bg-[#F43F5E] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      <ShieldAlert className="w-4 h-4" />
                      BLOCKED — Rule #3: 14K Lee Family Host SMS
                    </span>
                  ) : isSuppressed ? (
                    <span className="px-3 py-1 rounded-full bg-[#F59E0B] text-[#0F172A] text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      SUPPRESSED (DND)
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      APPROVED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MASTER APPLICATION & PRESENTER CONTROL BAR
// ============================================================================
export default function App() {
  const [state, setState] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : FALLBACK_INITIAL_STATE;
    } catch {
      return FALLBACK_INITIAL_STATE;
    }
  });

  const [activeView, setActiveView] = useState("STAGE_3_PANEL");
  const [activeSeat, setActiveSeat] = useState("11A");
  const [backendConnected, setBackendConnected] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(COMPILER_PRESETS[0]);
  const [customCompilerText, setCustomCompilerText] = useState("");
  const [compilerConsent, setCompilerConsent] = useState("SHARE_WITH_CREW");
  const [actionBusy, setActionBusy] = useState(false);

  const saveState = useCallback((nextState) => {
    if (!nextState || !nextState.flight) return;
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  // Poll GET /api/state every 1000ms with automatic fallback to localStorage & /mock_state.json
  useEffect(() => {
    let isMounted = true;

    const pollBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/state`, { cache: "no-store" });
        if (!res.ok) throw new Error("Non-200 response");
        const data = await res.json();
        if (isMounted && data?.flight) {
          saveState(data);
          setBackendConnected(true);
        }
      } catch {
        if (!isMounted) return;
        setBackendConnected(false);
        // If localStorage is empty, attempt to hydrate from /mock_state.json
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (!cached) {
            const mockRes = await fetch("/mock_state.json");
            if (mockRes.ok) {
              const mockData = await mockRes.json();
              if (isMounted && mockData?.flight) saveState(mockData);
            }
          }
        } catch {
          // fallback state already in memory
        }
      }
    };

    pollBackend();
    const intervalId = setInterval(pollBackend, 1000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [saveState]);

  // Helper to POST actions to FastAPI with instant optimistic offline fallback
  const postAction = async (endpoint, payload = {}, optimisticUpdater = null) => {
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        saveState(updated);
        setActionBusy(false);
        return;
      }
    } catch {
      // Backend offline -> run optimistic local state update so live demo never stalls
    }
    if (optimisticUpdater) {
      const cloned = JSON.parse(JSON.stringify(state));
      const updatedLocal = optimisticUpdater(cloned);
      saveState(updatedLocal);
    }
    setActionBusy(false);
  };

  // Demo Action 1: Trigger +40m OAG Delay on CX251
  const handleTriggerDelay = () => {
    postAction("/api/trigger-delay", {}, (draft) => {
      draft.flight.delay_minutes = 40;
      draft.flight.status = "DELAYED";
      draft.flight.departure_time = "23:40";
      draft.flight.arrival_time = "06:20";
      if (draft.personas["11A"]) {
        draft.personas["11A"].delay_lounge_offer.offer_pending = true;
        draft.personas["11A"].pickup_eta.estimated_curbside_time = "07:05 GMT Estimate";
      }
      if (draft.personas["12K"]) {
        // MAE #2 merge: departure_assist_map was replaced by assistance_plan (server-side); guard the offline fallback
        if (draft.personas["12K"].departure_assist_map) draft.personas["12K"].departure_assist_map.pickup_time = "22:45 HKT";
        draft.personas["12K"].pickup_eta.estimated_curbside_time = "06:48 GMT Estimate";
      }
      draft.agent_audit_log.unshift({
        id: `offline_block_${Date.now()}`,
        timestamp: "22:40:00 HKT",
        feature: "A5_DELAY_EXTERNAL_SMS",
        persona_seat: "14G/14K",
        action: "Attempted outbound +40m delay SMS to Lee Family external host",
        status: "BLOCKED",
        guardrail: "BLOCKED BY GUARDRAIL #3: No Host Opt-In Consent (DONT_REMEMBER).",
      });
      return draft;
    });
  };

  // Demo Action 2: Accept Pier Lounge Dinner (11A)
  const handleAcceptLounge = () => {
    postAction("/api/accept-lounge", { seat: "11A" }, (draft) => {
      const p11a = draft.personas["11A"];
      if (p11a) {
        p11a.lounge_dine_accepted = true;
        p11a.delay_lounge_offer.accepted = true;
        p11a.crew_card.tier2_line =
          "Mr. R. Mathur (Diamond) • EN • Dined in Pier Lounge — Direct to Bed Turn-down";
      }
      draft.cabin_brief_summary.resting_count = 3;
      draft.cabin_brief_summary.express_dine_count = 0;
      draft.cabin_brief_summary.lounge_dined_count = 1;
      return draft;
    });
  };

  // Demo Action 3: Toggle Gate Closure / Airplane Mode
  const handleToggleOffline = () => {
    postAction("/api/toggle-offline", {}, (draft) => {
      draft.flight.in_air_offline = !draft.flight.in_air_offline;
      return draft;
    });
  };

  // Demo Action 4: Run Universal Context Compiler
  const handleRunCompiler = () => {
    const rawText = (customCompilerText.trim() || selectedPreset).trim();
    postAction(
      "/api/submit-feedback",
      {
        action_type: "compile_memory",
        seat: activeSeat,
        raw_text: rawText,
        consent_level: compilerConsent,
      },
      (draft) => {
        draft.universal_compiler_last_run = {
          seat: activeSeat,
          raw_text: rawText,
          consent_level: compilerConsent,
          ground_and_lounge_action:
            compilerConsent === "DONT_REMEMBER"
              ? "SUPPRESSED (DONT_REMEMBER)"
              : `Pre-staged at HKIA Gate 65 / The Pier Lounge: ${rawText}`,
          crew_tier1_icons:
            compilerConsent === "SHARE_WITH_CREW"
              ? [{ icon: "Sparkles", label: rawText.slice(0, 20) }]
              : [],
          crew_discreet_instruction:
            compilerConsent === "SHARE_WITH_CREW"
              ? `Polite crew cue: accommodate '${rawText}' proactively (zero medical diagnosis)`
              : null,
          window_moment_behavior: "Follow seat Sunrise / DND priority at 05:55 GMT",
          arrival_eta_buffer_minutes: 0,
          compiler_source: "LOCAL_OFFLINE_ENGINE",
        };
        return draft;
      }
    );
  };

  // Demo Action 5: Reset to Initial State
  const handleReset = () => {
    postAction("/api/reset", {}, () => FALLBACK_INITIAL_STATE);
  };

  // Toggle 3-Way Consent on an individual memory item
  const handleToggleConsent = (seatKey, prefId, newConsent) => {
    postAction(
      "/api/toggle-privacy",
      { seat: seatKey, pref_id: prefId, consent_level: newConsent },
      (draft) => {
        const p = draft.personas[seatKey];
        if (p?.memory_items) {
          const item = p.memory_items.find((i) => i.id === prefId);
          if (item) item.consent = newConsent;
        }
        return draft;
      }
    );
  };

  // Approve / Dismiss B4 Memory Moment
  const handleApproveMemoryMoment = (seatKey, decision) => {
    postAction("/api/submit-feedback", {
      action_type: "memory_moment",
      seat: seatKey,
      decision,
    });
  };

  // Log B7 1-Tap Crew Quick-Note
  const handleSendCrewQuickNote = (seatKey) => {
    postAction("/api/submit-feedback", {
      action_type: "crew_note",
      seat: seatKey,
      note_text: "Preferred extra buckwheat pillow & jasmine tea before landing",
    });
  };

  const flight = state?.flight || {};

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {/* ====================================================================
          TOP PRESENTER CONTROL BAR (#0F172A Obsidian + #C5A880 Champagne Gold)
         ==================================================================== */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur border-b border-[#C5A880]/40 px-4 py-3 space-y-2.5 shadow-xl">
        {/* Row 1: Brand Title, Flight Status Badge & View Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A880]/15 border border-[#C5A880] flex items-center justify-center">
              <Plane className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-serif tracking-wide text-[#C5A880] font-semibold">
                  CATHAY HORIZON
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#006564] text-[10px] uppercase tracking-wider text-emerald-100 font-semibold">
                  {flight.flight_number} • {flight.route}
                </span>
                {flight.in_air_offline && (
                  <span className="px-2 py-0.5 rounded bg-[#F59E0B] text-[#0F172A] text-[10px] font-bold flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> AIRPLANE MODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                "Cathay remembers, so you never ask twice." • {backendConnected ? "Live FastAPI :8000" : "Offline Cached Mode"}
              </p>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <nav className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "STAGE_3_PANEL", label: "[Stage 3-Panel View]" },
              { id: "PRE_FLIGHT", label: "[Pre-Flight Phone]" },
              { id: "IN_FLIGHT", label: "[In-Flight Crew iPad]" },
              { id: "POST_FLIGHT", label: "[Post-Flight Arrival]" },
              { id: "AGENT_CONSOLE", label: "[Agent & Guardrail Console]" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeView === tab.id
                    ? "bg-[#C5A880] text-[#0F172A] shadow-md"
                    : "bg-[#1E293B] text-slate-300 border border-slate-700 hover:border-[#C5A880]/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Row 2: Live Demo Action Buttons & Universal Compiler Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              disabled={actionBusy}
              onClick={handleTriggerDelay}
              className="px-2.5 py-1.5 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#0F172A] font-semibold transition flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              [1. Trigger 40m OAG Delay]
            </button>

            <button
              disabled={actionBusy}
              onClick={handleAcceptLounge}
              className="px-2.5 py-1.5 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-[#0F172A] font-semibold transition flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              [2. Accept Pier Lounge Dine (11A)]
            </button>

            <button
              disabled={actionBusy}
              onClick={handleToggleOffline}
              className={`px-2.5 py-1.5 rounded-lg border font-semibold transition flex items-center gap-1 ${
                flight.in_air_offline
                  ? "bg-[#F59E0B] text-[#0F172A] border-[#F59E0B]"
                  : "bg-[#1E293B] text-slate-200 border-slate-700 hover:border-[#C5A880]"
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              [3. Gate Closure / Airplane Mode]
            </button>
          </div>

          {/* [4. Universal Compiler Preset] Dropdown + Custom Input + Consent + Reset */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap items-center gap-1 bg-[#1E293B] border border-[#C5A880]/50 rounded-lg px-2 py-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="bg-transparent text-xs text-slate-100 focus:outline-none"
              >
                {COMPILER_PRESETS.map((preset) => (
                  <option key={preset} value={preset} className="bg-[#0F172A] text-slate-100">
                    {preset}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customCompilerText}
                onChange={(e) => setCustomCompilerText(e.target.value)}
                placeholder="Or custom need..."
                className="w-32 bg-[#0F172A] text-xs text-slate-100 px-2 py-0.5 rounded border border-slate-700 focus:outline-none focus:border-[#C5A880]"
              />

              <select
                value={compilerConsent}
                onChange={(e) => setCompilerConsent(e.target.value)}
                className="bg-[#0F172A] text-[11px] text-[#C5A880] px-1.5 py-0.5 rounded border border-slate-700"
              >
                <option value="SHARE_WITH_CREW">SHARE_WITH_CREW</option>
                <option value="SERVICE_ONLY">SERVICE_ONLY</option>
                <option value="DONT_REMEMBER">DONT_REMEMBER</option>
              </select>

              <button
                disabled={actionBusy}
                onClick={handleRunCompiler}
                className="px-2.5 py-0.5 rounded bg-[#C5A880] text-[#0F172A] font-bold hover:bg-[#d4b992] transition"
              >
                [4. Compile Need]
              </button>
            </div>

            <button
              disabled={actionBusy}
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] border border-rose-500/50 text-rose-300 hover:bg-rose-500/20 font-semibold transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              [Reset]
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN STAGE ROUTER WITH FAULT-TOLERANT ERROR BOUNDARIES
         ==================================================================== */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto space-y-6">
        {activeView === "STAGE_3_PANEL" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <ErrorBoundary viewName="PreFlightPassenger">
                <BuiltInPreFlightPassenger
                  state={state}
                  activeSeat={activeSeat}
                  setActiveSeat={setActiveSeat}
                  onToggleConsent={handleToggleConsent}
                  onAcceptLounge={handleAcceptLounge}
                />
              </ErrorBoundary>

              <ErrorBoundary viewName="InFlightCrewPad">
                <BuiltInInFlightCrewPad
                  state={state}
                  onApproveMemoryMoment={handleApproveMemoryMoment}
                  onSendCrewQuickNote={handleSendCrewQuickNote}
                />
              </ErrorBoundary>

              <ErrorBoundary viewName="PostFlightArrival">
                <BuiltInPostFlightArrival state={state} activeSeat={activeSeat} />
              </ErrorBoundary>
            </div>

            <ErrorBoundary viewName="AgentConsoleView">
              <AgentConsoleView state={state} />
            </ErrorBoundary>
          </>
        )}

        {activeView === "PRE_FLIGHT" && (
          <div className="max-w-2xl mx-auto">
            <ErrorBoundary viewName="PreFlightPassenger">
              <BuiltInPreFlightPassenger
                state={state}
                activeSeat={activeSeat}
                setActiveSeat={setActiveSeat}
                onToggleConsent={handleToggleConsent}
                onAcceptLounge={handleAcceptLounge}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeView === "IN_FLIGHT" && (
          <div className="max-w-4xl mx-auto">
            <ErrorBoundary viewName="InFlightCrewPad">
              <BuiltInInFlightCrewPad
                state={state}
                onApproveMemoryMoment={handleApproveMemoryMoment}
                onSendCrewQuickNote={handleSendCrewQuickNote}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeView === "POST_FLIGHT" && (
          <div className="max-w-4xl mx-auto">
            <ErrorBoundary viewName="PostFlightArrival">
              <BuiltInPostFlightArrival state={state} activeSeat={activeSeat} />
            </ErrorBoundary>
          </div>
        )}

        {activeView === "AGENT_CONSOLE" && (
          <ErrorBoundary viewName="AgentConsoleView">
            <AgentConsoleView state={state} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}