"use client"

import { useState } from "react"
import { Check, Moon, Tv, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useProfile } from "@/lib/store"
import { AppHeader, AppHeaderDark, Card, Scroll } from "./phone-ui"
import { Brushwing, Disclaimer, Logo, Sim } from "./shared"

export function ConfirmTrip() {
  const { profile, set, idea } = useProfile()
  const t = profile.trip
  const [done, setDone] = useState(false)
  const mealLine = idea === 3 ? "His usual, after take-off" : "Dal makhani, after take-off"
  const lastWeek = idea === 3 ? "CX694, daytime. Work through the flight, news first." : "CX694, daytime. Chicken Chettinad, work through the flight, news first."
  return (
    <Scroll>
      <div className="bg-jade px-5 pb-5 text-white">
        <AppHeaderDark onBack={() => set({ phone: "home" })} back="Booking" />
        <p className="mt-2 text-[13px] text-white/80">
          {t.date} · {t.flight} · night flight
        </p>
        <h2 className="mt-1 text-[25px] leading-8">
          {t.fromCity} to {t.toCity}
        </h2>
        <p className="mt-1 text-[13px] text-white/80">
          Seat {t.seat} · Departs {t.dep}
        </p>
      </div>
      <div className="px-4 pb-8">
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-jade">This trip only</p>
        <Card className="mt-2 px-4 py-1">
          {[
            ["Meal", mealLine],
            ["Rest", "Sleep after dinner, bed made"],
            ["Screen", "Cricket first"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3 border-b border-[#eef0ef] py-3 last:border-0">
              <div>
                <p className="text-[12px] text-[#5d6766]">{k}</p>
                <p className="text-[15px] leading-5 text-ink">{v}</p>
              </div>
              <Check className="mt-1 size-4 shrink-0 text-jade" strokeWidth={2.5} />
            </div>
          ))}
        </Card>
        <div className="mt-3 rounded-[14px] border border-[#e3e7e6] bg-white px-4 py-3">
          <p className="text-[12px] font-semibold text-[#5d6766]">Last week was different</p>
          <p className="mt-1 text-[13px] leading-[18px] text-ink">{lastWeek}</p>
        </div>
        {done ? (
          <div className="mt-5 rounded-[14px] bg-[#d9e8e5] px-4 py-4">
            <p className="text-[15px] font-semibold text-jade-deep">Confirmed for CX695</p>
            <p className="mt-1 text-[13px] leading-[18px] text-ink/85">Sent to catering, the crew card and seat 11A. No new setup.</p>
          </div>
        ) : (
          <Button data-demo="confirm-trip" className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => setDone(true)}>
            Confirm for this flight
          </Button>
        )}
        <p className="mt-3 text-center text-[12px] text-[#5d6766]">One tap. The long setup stays in the past.</p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

export function AirportScreen() {
  const { profile, set } = useProfile()
  const t = profile.trip
  return (
    <Scroll>
      <AppHeader />
      <div className="px-5 pb-8">
        <p className="mt-2 text-[13px] text-[#5d6766]">
          {t.flight} · {t.date}
        </p>
        <h2 className="mt-1 text-[26px] leading-8 text-ink">At the airport</h2>
        <div className="mt-4 rounded-[14px] bg-jade px-5 py-5 text-white">
          <p className="text-[13px] text-white/80">Boarding from</p>
          <p className="mt-1 text-[52px] font-semibold leading-none tracking-[-0.02em]">{t.gate.replace("Gate ", "")}</p>
          <p className="mt-2 text-[15px]">{t.gate}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/25 pt-3 text-[13px]">
            <div>
              <p className="text-[18px] font-semibold">{t.boarding}</p>
              <p className="text-white/75">Boarding</p>
            </div>
            <div>
              <p className="text-[18px] font-semibold">{t.dep}</p>
              <p className="text-white/75">Departs</p>
            </div>
          </div>
        </div>
        <Card className="mt-3 px-4 py-3.5">
          <p className="text-[13px] text-[#5d6766]">Seat ready</p>
          <p className="text-[16px] text-ink">
            {t.cabin} · {t.seat} · {t.aircraft}
          </p>
        </Card>
        <Button data-demo="open-lounge" className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => set({ phone: "lounge" })}>
          Open lounge pass
        </Button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

export function LoungeScreen() {
  const { set, idea } = useProfile()
  const [picked, setPicked] = useState(false)
  if (idea === 3) {
    return (
      <Scroll>
        <div className="relative h-[210px] overflow-hidden bg-jade">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/cabin-j.jpg" alt="" className="h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00403f] to-black/20" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 text-white">
            <AppHeaderDark onBack={() => set({ phone: "airport" })} back="Airport" />
            <h2 className="mt-2 text-[24px] leading-7">The Pier, First</h2>
            <p className="text-[13px] text-white/80">Short on time · Gate 23 at 19:25</p>
          </div>
        </div>
        <div className="px-5 pb-8">
          <Card className="mt-4 px-4 py-4">
            <p className="text-[12px] font-semibold text-jade">Ready to collect</p>
            <p className="mt-1 text-[18px] font-semibold text-ink">His usual, waiting at the counter</p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#5d6766]">Placed when he confirmed the trip. No queue, no order to make.</p>
          </Card>
          {picked ? (
            <div className="mt-5 rounded-[14px] bg-[#d9e8e5] px-4 py-4">
              <p className="text-[15px] font-semibold text-jade-deep">Picked up</p>
              <p className="mt-1 text-[13px] leading-[18px] text-ink/85">On his way to Gate 23.</p>
            </div>
          ) : (
            <Button data-demo="lounge-pickup" className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => setPicked(true)}>
              Pick up and go
            </Button>
          )}
          <Disclaimer className="py-6 text-center" />
        </div>
      </Scroll>
    )
  }
  return (
    <Scroll>
      <div className="relative h-[210px] overflow-hidden bg-jade">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/cabin-j.jpg" alt="" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#00403f] to-black/20" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 text-white">
          <AppHeaderDark onBack={() => set({ phone: "airport" })} back="Airport" />
          <h2 className="mt-2 text-[24px] leading-7">The Pier, First</h2>
          <p className="text-[13px] text-white/80">Hong Kong International, near Gate 23</p>
        </div>
      </div>
      <div className="px-5 pb-8">
        <Card className="mt-4 px-4 py-1">
          {[
            ["Boarding", "19:25 from Gate 23"],
            ["Seat", "11A, window, quiet zone"],
            ["Tonight", "Dal makhani loaded. Cricket first on the seat screen."],
          ].map(([k, v]) => (
            <div key={k} className="border-b border-[#eef0ef] py-3 last:border-0">
              <p className="text-[12px] text-[#5d6766]">{k}</p>
              <p className="text-[14px] leading-5 text-ink">{v}</p>
            </div>
          ))}
        </Card>
        <p className="mt-4 text-[13px] leading-[18px] text-[#5d6766]">
          The lounge already has his order. Nothing for him to set here.
        </p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

export function FamilyNotify() {
  const [sent, setSent] = useState(false)
  return (
    <Scroll>
      <AppHeader title="CX695" />
      <div className="px-5 pb-8">
        <p className="mt-2 text-[13px] text-[#5d6766]">After landing</p>
        <h2 className="mt-1 text-[24px] leading-8 text-ink">Tell the family he is down</h2>
        <div className="mt-4 overflow-hidden rounded-[14px] bg-white shadow-[0_6px_20px_-14px_rgba(0,50,50,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/delhi.jpg" alt="" className="h-[120px] w-full object-cover" />
          <div className="px-4 py-4">
            <p className="text-[12px] font-semibold text-jade">Landed</p>
            <p className="mt-1 text-[18px] font-semibold text-ink">Delhi, 23:22 local</p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#5d6766]">CX695 from Hong Kong. Mr Mathur is on the ground.</p>
          </div>
        </div>
        <Card className="mt-3 px-4 py-3">
          <p className="text-[12px] text-[#5d6766]">Share with</p>
          <p className="text-[15px] text-ink">Priya Mathur and Arjun Mathur</p>
        </Card>
        {sent ? (
          <div className="mt-5 rounded-[14px] bg-[#d9e8e5] px-4 py-4">
            <p className="text-[15px] font-semibold text-jade-deep">Family notified</p>
            <p className="mt-1 text-[13px] leading-[18px] text-ink/85">Sent when the aircraft doors opened. No extra tap from him.</p>
          </div>
        ) : (
          <Button data-demo="notify-family" className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => setSent(true)}>
            Send now
          </Button>
        )}
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

function reviewCopy(idea: 0 | 2 | 3) {
  return [
    {
      id: "meal",
      icon: Utensils,
      q: idea === 3 ? "His usual as served?" : "Dal makhani as served?",
      yes: "Keep for night flights",
      no: "Change next time",
    },
  {
    id: "rest",
    icon: Moon,
    q: "Bed made, left to sleep?",
    yes: "Keep for night flights",
    no: "Wake earlier next time",
  },
  {
    id: "screen",
    icon: Tv,
    q: "Cricket first on the screen?",
    yes: "Keep on this route",
    no: "News first next time",
  },
  ]
}

export function DebriefScreen() {
  const { idea } = useProfile()
  const REVIEW = reviewCopy(idea)
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const done = step >= REVIEW.length
  const cur = REVIEW[Math.min(step, REVIEW.length - 1)]
  const pick = (label: string) => {
    setPicks((p) => [...p, label])
    setStep((s) => s + 1)
  }
  return (
    <div className="absolute inset-0 flex flex-col bg-[#f4f5f5]">
      <div className="bg-jade px-5 pb-4 text-white">
        <p className="pt-2 text-[13px] text-white/80">Three taps</p>
        <h2 className="text-[24px] leading-8">How was CX695?</h2>
        <div className="mt-3 flex gap-1.5">
          {REVIEW.map((r, i) => (
            <div key={r.id} className={cn("h-[3px] flex-1 rounded-full", i < step ? "bg-white" : i === step && !done ? "bg-white" : "bg-white/30")} />
          ))}
        </div>
      </div>
      <div className="flex-1 px-5 pt-5">
        {done ? (
          <div>
            <div className="rounded-[14px] bg-[#d9e8e5] px-4 py-4">
              <p className="text-[16px] font-semibold text-jade-deep">Saved for the next crew</p>
              <p className="mt-1 text-[13px] leading-[18px] text-ink/85">CX694 home, same seat type. They see the three notes. He does not brief them.</p>
            </div>
            <Card className="mt-3 px-4 py-1">
              {REVIEW.map((r, i) => (
                <div key={r.id} className="border-b border-[#eef0ef] py-3 last:border-0">
                  <p className="text-[12px] text-[#5d6766]">{r.q}</p>
                  <p className="text-[14px] text-ink">{picks[i]}</p>
                </div>
              ))}
            </Card>
          </div>
        ) : (
          <div>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#e3efed] text-jade">
              <cur.icon className="size-6" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[22px] font-semibold leading-7 text-ink">{cur.q}</p>
            <p className="mt-1 text-[13px] text-[#5d6766]">
              Tap {step + 1} of 3
            </p>
            <Button data-demo={`review-yes-${cur.id}`} className="mt-6 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => pick(cur.yes)}>
              Yes. {cur.yes}
            </Button>
            <Button data-demo={`review-no-${cur.id}`} variant="outline" className="mt-3 h-11 w-full rounded-full bg-white text-[15px]" onClick={() => pick(cur.no)}>
              {cur.no}
            </Button>
          </div>
        )}
      </div>
      <Disclaimer className="px-5 py-6 text-center" />
    </div>
  )
}

export function RouteRewards() {
  return (
    <Scroll>
      <div className="bg-[#1d2423] px-5 pb-6 pt-3 text-white">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9fd3bf]">Route rewards</p>
        <h2 className="mt-1 text-[24px] leading-8">Not your membership tier</h2>
        <p className="mt-2 text-[13px] leading-[18px] text-white/75">Pins and guest passes come from flying this route often. Diamond does not move.</p>
      </div>
      <div className="px-4 pb-8">
        <Card className="mt-4 px-4 py-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-semibold text-ink">Hong Kong to Delhi</p>
            <Sim />
          </div>
          <p className="mt-1 text-[13px] text-[#5d6766]">Mr Mathur · 38 flights this year</p>
          <div className="mt-3 rounded-[10px] bg-[#f4f5f5] px-3 py-3">
            <p className="text-[12px] text-[#5d6766]">Route pin</p>
            <p className="text-[16px] text-ink">Night Delhi</p>
            <p className="mt-1 text-[12px] leading-4 text-[#5d6766]">Earned by night flights on this city pair. Separate from status points.</p>
          </div>
        </Card>
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-jade">Same route, different flying</p>
        <button data-demo="route-green" className="mt-2 w-full rounded-[14px] bg-white px-4 py-3.5 text-left shadow-[0_6px_20px_-14px_rgba(0,50,50,0.35)]">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ink">Sanjay Rao</p>
            <span className="rounded-full bg-[#e3efed] px-2 py-0.5 text-[11px] font-semibold text-jade">Green</span>
          </div>
          <p className="mt-1 text-[13px] leading-[18px] text-[#5d6766]">Flies this route every month. Lounge guest pass this month.</p>
        </button>
        <button data-demo="route-gold" className="mt-2 w-full rounded-[14px] bg-white px-4 py-3.5 text-left shadow-[0_6px_20px_-14px_rgba(0,50,50,0.35)]">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ink">Helen Cho</p>
            <span className="rounded-full bg-[#f4ead0] px-2 py-0.5 text-[11px] font-semibold text-[#8a7232]">Gold</span>
          </div>
          <p className="mt-1 text-[13px] leading-[18px] text-[#5d6766]">Flies twice a year. No guest pass. Gold does not cover it.</p>
        </button>
        <div className="mt-3 rounded-[14px] border border-[#dfe3e2] px-4 py-3.5">
          <p className="text-[14px] font-semibold text-ink">His Diamond tier does not change</p>
          <p className="mt-1 text-[13px] leading-[18px] text-[#5d6766]">He stays Diamond. The guest pass is from 38 flights on this route, not from the 2027 programme.</p>
        </div>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

export function CrewTabletStage() {
  const { idea } = useProfile()
  const four = idea === 3
  return (
    <div className="relative flex h-[1080px] w-[1920px] items-center justify-center bg-[#e9eceb]">
      <Logo className="absolute left-[72px] top-[60px] w-[260px]" />
      <div className="flex items-center gap-16">
        <div style={{ zoom: 1.05 }}>
          <IpadFrame>{four ? <FourLineCard /> : <CrewCard />}</IpadFrame>
        </div>
        <div className="w-[420px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-jade">Crew iPad</p>
          <p className="mt-2 text-[36px] font-semibold leading-[1.15] text-ink">{four ? "One card. Lounge, cabin, arrival." : "Already on the tablet they use today"}</p>
          <p className="mt-4 text-[18px] leading-7 text-[#3c4746]">
            {four
              ? "The same four lines for every team on this trip. No new box in the aircraft."
              : "Seat 11A, meal, rest, approach. No new box in the aircraft. A row on the existing crew app."}
          </p>
        </div>
      </div>
      <Disclaimer className="absolute bottom-6 left-[72px] text-[16px]" />
    </div>
  )
}

function IpadFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[780px] w-[580px] rounded-[36px] bg-[#1a1d1c] p-[14px] shadow-[0_30px_60px_-30px_rgba(0,40,40,0.45)]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[24px] bg-[#f4f5f5]">
        {children}
      </div>
    </div>
  )
}

const TEAMS = ["Lounge", "Cabin", "Arrival"] as const
const FOUR_LINES: [string, string][] = [
  ["This trip", "His usual after take-off. Sleep after dinner, bed made."],
  ["Seat", "11A, window, quiet zone"],
  ["Last flight", "Daytime CX694. Worked through. News first."],
  ["Next team", "Keep rest on. Cricket first. Do not wake early."],
]

function FourLineCard() {
  const [team, setTeam] = useState<(typeof TEAMS)[number]>("Lounge")
  return (
    <div className="flex h-full flex-col bg-[#f4f5f5]">
      <div className="bg-jade px-5 pb-4 pt-4 text-white">
        <p className="text-[12px] text-white/80">CX695 · One card</p>
        <p className="text-[20px] font-semibold leading-7">11A · Mr Mathur</p>
      </div>
      <div className="flex border-b border-[#e3e6e5] bg-white">
        {TEAMS.map((t) => {
          const on = team === t
          return (
            <button
              key={t}
              data-demo={`card-${t.toLowerCase()}`}
              onClick={() => setTeam(t)}
              className={cn("relative flex h-11 flex-1 items-center justify-center text-[15px]", on ? "font-semibold text-jade" : "text-[#7c8786]")}
            >
              {t}
              {on && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-jade" />}
            </button>
          )
        })}
      </div>
      <div className="px-5 pt-4">
        <p className="text-[12px] text-[#5d6766]">{team} · same four lines</p>
        <ul className="mt-1">
          {FOUR_LINES.map(([k, v]) => (
            <li key={k} className="border-b border-[#eef0ef] py-3.5">
              <p className="text-[12px] text-[#5d6766]">{k}</p>
              <p className="text-[15px] leading-5 text-ink">{v}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function AssistantScreen() {
  return (
    <Scroll>
      <div className="bg-jade px-5 pb-5 text-white">
        <p className="pt-2 text-[13px] text-white/80">After landing · CX695</p>
        <h2 className="text-[32px] font-semibold leading-9">Assistant</h2>
        <p className="mt-1 text-[18px] font-semibold">Rina Shah</p>
        <p className="text-[13px] text-white/80">Ground handover for Mr Mathur</p>
      </div>
      <div className="px-4 pb-8">
        <Card className="mt-4 px-4 py-1">
          {[
            ["Landed", "Delhi, 23:22 local"],
            ["Gate", "Arrivals 4"],
            ["Bag", "Belt 7"],
            ["Car", "Level 2, bay C"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-[#eef0ef] py-3 last:border-0">
              <p className="text-[13px] text-[#5d6766]">{k}</p>
              <p className="text-[15px] font-semibold text-ink">{v}</p>
            </div>
          ))}
        </Card>
        <p className="mt-4 text-[13px] leading-[18px] text-[#5d6766]">Sent when the doors opened. She can meet him without a call.</p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

const SURVEY = [
  { id: "dining", q: "Dining", opts: ["As usual", "Fine", "Off"] },
  { id: "rest", q: "Rest", opts: ["As planned", "Woke early", "Too much light"] },
  { id: "crew", q: "Crew", opts: ["Brief as asked", "Too much", "Too little"] },
]

export function SurveyScreen() {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const ready = SURVEY.every((q) => picks[q.id])
  return (
    <Scroll>
      <div className="bg-jade px-5 pb-4 text-white">
        <p className="pt-2 text-[13px] text-white/80">After CX695</p>
        <h2 className="text-[24px] leading-8">How was the flight?</h2>
        <p className="mt-1 text-[13px] text-white/80">Dining, rest, crew. The next crew reads this.</p>
      </div>
      <div className="px-4 pb-8">
        {sent ? (
          <div className="mt-4 rounded-[14px] bg-[#d9e8e5] px-4 py-4">
            <p className="text-[16px] font-semibold text-jade-deep">Sent to the next crew</p>
            <p className="mt-1 text-[13px] leading-[18px] text-ink/85">On CX694 they see dining, rest and crew as he left them.</p>
          </div>
        ) : (
          SURVEY.map((q) => (
            <div key={q.id} className="mt-4">
              <p className="px-1 text-[15px] font-semibold text-ink">{q.q}</p>
              <div className="mt-2 flex flex-col overflow-hidden rounded-[14px] bg-white">
                {q.opts.map((o) => {
                  const on = picks[q.id] === o
                  return (
                    <button
                      key={o}
                      data-demo={`survey-${q.id}-${o.toLowerCase().replace(/ /g, "-")}`}
                      onClick={() => setPicks((p) => ({ ...p, [q.id]: o }))}
                      className={cn("flex items-center justify-between border-b border-[#eef0ef] px-4 py-3 text-left last:border-0", on && "bg-[#e8f1ef]")}
                    >
                      <span className={cn("text-[14px]", on ? "font-semibold text-jade-deep" : "text-ink")}>{o}</span>
                      {on && <Check className="size-4 text-jade" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
        {!sent && (
          <Button
            data-demo="survey-send"
            disabled={!ready}
            className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep disabled:opacity-40"
            onClick={() => setSent(true)}
          >
            Send to next crew
          </Button>
        )}
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

function CrewCard() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between bg-jade px-5 py-4 text-white">
        <div>
          <p className="text-[12px] text-white/75">CX695 · Business</p>
          <p className="text-[20px] font-semibold">Cabin service</p>
        </div>
        <Brushwing white className="w-[22px]" />
      </div>
      <div className="px-5 pt-5">
        <div className="flex items-end justify-between border-b border-[#e3e7e6] pb-4">
          <div>
            <p className="text-[13px] text-[#5d6766]">Seat</p>
            <p className="text-[48px] font-semibold leading-none text-jade">11A</p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-semibold text-ink">Mr Mathur</p>
            <p className="text-[13px] text-[#5d6766]">Diamond · window</p>
          </div>
        </div>
        <ul className="mt-2">
          {[
            ["Meal", "Dal makhani, first after take-off"],
            ["Rest", "Do not disturb after dinner. Bed made."],
            ["Wake", "45 min before landing, tea"],
            ["Approach", "Keep it brief"],
          ].map(([k, v]) => (
            <li key={k} className="border-b border-[#eef0ef] py-3.5">
              <p className="text-[12px] text-[#5d6766]">{k}</p>
              <p className="text-[16px] leading-6 text-ink">{v}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] leading-4 text-[#5d6766]">From the confirmed trip. Viewing history stays off this card.</p>
      </div>
    </div>
  )
}

export function TvService() {
  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/cabin-j.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#05090a]/72" />
      <div className="relative flex h-full flex-col items-center justify-center px-[120px] text-center">
        <Brushwing white className="w-[56px]" />
        <p className="mt-8 text-[24px] text-white/70">Seat 11A · already on StudioCX</p>
        <h1 className="mt-4 text-[72px] font-semibold leading-[1.05] tracking-[-0.02em]">Dal makhani, served first</h1>
        <p className="mt-6 max-w-[1100px] text-[32px] leading-10 text-white/85">Bed made. Do not disturb is on. Cricket is already first on this screen.</p>
        <p className="mt-8 text-[22px] text-white/60">The TV only reorders what it already has. No new aircraft system.</p>
      </div>
    </div>
  )
}
