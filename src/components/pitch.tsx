"use client"

import { useCallback, useEffect } from "react"
import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, HardDrive, Plane, Smartphone, Utensils, Tv, Moon, Armchair, ShieldCheck, WifiOff, UserCheck, Plug } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDemo } from "@/lib/store"
import { Brushwing, Disclaimer, Logo, Sim } from "./shared"

type Slide = { id: string; label: string; render: () => React.ReactNode; dark?: boolean }

export const PIPE_STEPS = 5

const SLIDES: Slide[] = [
  { id: "cover", label: "Flight profile", render: () => <Cover />, dark: true },
  { id: "problem", label: "1 · Problem", render: () => <Problem /> },
  { id: "passenger", label: "2 · Passenger", render: () => <Passenger /> },
  { id: "product", label: "3 · Product", render: () => <Product /> },
  { id: "pipeline", label: "How it works", render: () => <Pipeline /> },
  { id: "value", label: "4 · Cathay and data value", render: () => <Value /> },
  { id: "feasibility", label: "5 · Feasibility", render: () => <Feasibility /> },
  { id: "pilot", label: "6 · Pilot", render: () => <Pilot /> },
]
export const SLIDE_IDS = SLIDES.map((s) => s.id)
const PIPE = SLIDE_IDS.indexOf("pipeline")

export function PitchView() {
  const { slide, pipeStep, set } = useDemo()
  const i = Math.min(Math.max(slide, 0), SLIDES.length - 1)
  const next = useCallback(() => {
    if (i === PIPE && pipeStep < PIPE_STEPS) return set({ pipeStep: pipeStep + 1 })
    if (i < SLIDES.length - 1) set({ slide: i + 1, pipeStep: 1 })
  }, [i, pipeStep, set])
  const prev = useCallback(() => {
    if (i === PIPE && pipeStep > 1) return set({ pipeStep: pipeStep - 1 })
    if (i > 0) set({ slide: i - 1, pipeStep: i - 1 === PIPE ? PIPE_STEPS : 1 })
  }, [i, pipeStep, set])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault()
        next()
      }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])
  const s = SLIDES[i]
  return (
    <div className={cn("relative h-[1080px] w-[1920px] overflow-hidden font-sans", s.dark ? "bg-jade-deep text-white" : "bg-[#f4f5f5] text-ink")} data-slide={s.id}>
      {!s.dark && (
        <header className="absolute inset-x-[110px] top-[56px] flex items-center justify-between">
          <Logo className="w-[230px]" />
          <span className="text-[22px] text-[#5d6766]">{s.label}</span>
        </header>
      )}
      <div key={s.id} className="rise absolute inset-0">
        {s.render()}
      </div>
      <footer className="absolute inset-x-[110px] bottom-[44px] flex items-center justify-between">
        <Disclaimer dark={s.dark} className="text-[17px]" />
        <div className="flex items-center gap-5">
          <div className="flex gap-1.5">
            {SLIDES.map((x, k) => (
              <span key={x.id} className={cn("h-[4px] w-[34px] rounded-full", k === i ? (s.dark ? "bg-white" : "bg-jade") : s.dark ? "bg-white/25" : "bg-[#d6dcda]")} />
            ))}
          </div>
          <button aria-label="Previous" data-demo="slide-prev" onClick={prev} className={cn("flex size-11 items-center justify-center rounded-full border", s.dark ? "border-white/30" : "border-[#cfd5d3] bg-white")}>
            <ChevronLeft className="size-5" />
          </button>
          <button aria-label="Next" data-demo="slide-next" onClick={next} className={cn("flex size-11 items-center justify-center rounded-full border", s.dark ? "border-white/30" : "border-[#cfd5d3] bg-white")}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </footer>
    </div>
  )
}

function Title({ children, sub, small }: { children: React.ReactNode; sub?: string; small?: boolean }) {
  return (
    <div className="absolute left-[110px] right-[110px] top-[150px]">
      <h1 className={cn("font-semibold leading-[1.05] tracking-[-0.015em]", small ? "text-[66px]" : "text-[76px]")}>{children}</h1>
      {sub && <p className="mt-5 max-w-[1300px] text-[32px] leading-[1.35] text-[#3c4746]">{sub}</p>}
    </div>
  )
}

function Shot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("block", className)} />
}

function Cover() {
  return (
    <div className="absolute inset-0">
      <Brushwing white className="absolute -right-[140px] top-[60px] w-[900px] opacity-[0.07]" />
      <div className="absolute left-[110px] top-[90px]">
        <Logo white className="w-[300px]" />
      </div>
      <div className="absolute left-[110px] top-[330px] w-[1300px]">
        <p className="text-[30px] text-white/70">Flight profile</p>
        <h1 className="mt-4 text-[104px] font-semibold leading-[1.02] tracking-[-0.02em]">Set it once. Every Cathay flight remembers.</h1>
        <p className="mt-8 text-[34px] leading-[1.35] text-white/80">Meal, rest, seat and screen, set in the Cathay app and ready at the seat. Pins and tiers reward the habit.</p>
      </div>
    </div>
  )
}

function Problem() {
  const flights = [
    ["CX694", "Fri 2 Oct"],
    ["CX695", "Mon 5 Oct"],
    ["CX694", "Fri 9 Oct"],
    ["CX695", "Mon 12 Oct"],
    ["CX695", "Thu 15 Oct"],
  ]
  const cols = ["Meal", "Cricket and news", "Rest", "Seat"]
  return (
    <>
      <Title sub="Mr Mathur flies Hong Kong to Delhi 38 times a year. Each time the seat screen, the meal order and the crew start again from zero.">Every flight resets.</Title>
      <div className="absolute left-[110px] right-[110px] top-[420px] overflow-hidden rounded-[18px] bg-white">
        <div className="grid grid-cols-[260px_repeat(4,1fr)] border-b border-[#e3e7e6] px-8 py-5 text-[24px] text-[#5d6766]">
          <span>Flight</span>
          {cols.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {flights.map(([f, d]) => (
          <div key={d} className="grid grid-cols-[260px_repeat(4,1fr)] border-b border-[#eef0ef] px-8 py-[14px] text-[26px] last:border-0">
            <span className="font-semibold">
              {f} <span className="font-normal text-[#5d6766]">{d}</span>
            </span>
            {["Chooses again", "Searches again", "Asks again", "Requests again"].map((x) => (
              <span key={x} className="text-[#8a9493]">
                {x}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="absolute bottom-[100px] left-[110px] text-[18px] text-[#5d6766]">Fictional passenger and illustrative flight pattern.</p>
    </>
  )
}

function Passenger() {
  const cares = [
    { icon: Utensils, text: "Dal makhani, served straight after take-off" },
    { icon: Moon, text: "Sleep: do not disturb, bed made, tea 45 min before landing" },
    { icon: Armchair, text: "Window seat, quiet zone" },
    { icon: Tv, text: "Cricket live and recorded, business news" },
  ]
  return (
    <>
      <Title>Mr Mathur, seat 11A.</Title>
      <div className="absolute left-[110px] top-[290px] w-[700px]">
        <div className="flex items-center gap-6">
          <span className="flex size-[104px] items-center justify-center rounded-full bg-jade text-[38px] font-semibold text-white">AM</span>
          <div className="text-[28px] leading-[1.4]">
            <p className="font-semibold">Anil Mathur, Diamond since 2004</p>
            <p className="text-[#3c4746]">Managing director, textiles export, Hong Kong</p>
          </div>
        </div>
        <p className="mt-7 text-[26px] text-[#5d6766]">This trip: CX695 Hong Kong to Delhi, Thursday 20:05, Business</p>
        <p className="mt-6 text-[26px] font-semibold text-jade">What he cares about</p>
        <ul className="mt-3">
          {cares.map((c) => (
            <li key={c.text} className="flex items-center gap-5 border-b border-[#dfe3e2] py-[13px] text-[27px] last:border-0">
              <c.icon className="size-8 shrink-0 text-jade" strokeWidth={1.6} /> {c.text}
            </li>
          ))}
        </ul>
      </div>
      <figure className="absolute right-[110px] top-[300px] w-[920px]">
        <Shot src="/pitch/tv-recognised.jpg" alt="Seat screen recognising Mr Mathur" className="w-full rounded-[16px]" />
        <figcaption className="mt-4 text-[24px] text-[#5d6766]">What he sees when he sits down. Recognised from his boarding pass.</figcaption>
      </figure>
      <p className="absolute bottom-[100px] left-[110px] text-[18px] text-[#5d6766]">Fictional passenger.</p>
    </>
  )
}

function Product() {
  const cols = [
    { n: "1", title: "Set on the phone", body: "Four steps in the Cathay app: meal, rest, seat and screen.", src: "/pitch/phone-setup.png", phone: true },
    { n: "2", title: "Ready at the seat", body: "The seat screen opens on his cricket and news, and the crew already know his meal.", src: "/pitch/tv-home.jpg" },
    { n: "3", title: "Rewarded after", body: "Pins add bonus status points towards his next tier, Diamond Exec.", src: "/pitch/phone-pin.png", phone: true },
  ]
  return (
    <>
      <Title small>Set on the phone. Ready at the seat. Rewarded after.</Title>
      <div className="absolute bottom-[130px] left-[110px] right-[110px] flex items-end justify-between gap-12">
        {cols.map((c) => (
          <div key={c.n} className={cn("flex flex-col", c.phone ? "w-[400px]" : "w-[720px]")}>
            <Shot src={c.src} alt={c.title} className={c.phone ? "h-[520px] w-auto self-center" : "w-full rounded-[14px]"} />
            <div className="mt-7 flex gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-jade text-[24px] font-semibold text-white">{c.n}</span>
              <div>
                <p className="text-[30px] font-semibold leading-tight">{c.title}</p>
                <p className="mt-1.5 text-[23px] leading-[1.35] text-[#3c4746]">{c.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

const STEPS = [
  {
    icon: Smartphone,
    title: "Passenger action",
    example: "Dal makhani, straight after take-off. Cricket first.",
    caption: "Mr Mathur sets his meal and his cricket in the Cathay app before he flies.",
  },
  {
    icon: HardDrive,
    title: "Offline buffer on the seat",
    example: "Seat 11A keeps his profile and logs dinner at 20:40 and 48 min of cricket.",
    caption: "The seat screen stores his settings and notes what happens, even with no connection in the air.",
  },
  {
    icon: CloudUpload,
    title: "Validated sync",
    example: "One upload after landing, checked against booking CX695, seat 11A.",
    caption: "After landing the seat sends one upload, and Cathay checks it belongs to his booking before saving it.",
  },
  {
    icon: BarChart3,
    title: "Profile and Cathay dashboard",
    example: "His profile updates. Planners see 15 of 38 chose dal makhani.",
    caption: "His profile is updated, and Cathay's planners see totals for the flight, never his name.",
  },
  {
    icon: Plane,
    title: "Improved next flight",
    example: "CX694 on 18 Oct: dal makhani loaded, cricket ready at 11A.",
    caption: "On his next flight the right meal is on board and his cricket is waiting.",
  },
]

function Pipeline() {
  const { pipeStep } = useDemo()
  const n = Math.min(Math.max(pipeStep, 1), PIPE_STEPS)
  const step = STEPS[n - 1]
  const W = 1700
  const slot = W / STEPS.length
  return (
    <>
      <Title>How one choice improves the next flight.</Title>
      <div className="absolute left-[110px] top-[330px]" style={{ width: W }}>
        <div className="absolute top-[56px] h-[4px] rounded-full bg-[#dfe3e2]" style={{ left: slot / 2, width: W - slot }} />
        <div className="absolute top-[56px] h-[4px] rounded-full bg-jade transition-[width] duration-500" style={{ left: slot / 2, width: ((n - 1) / (STEPS.length - 1)) * (W - slot) }} />
        <div className="relative flex">
          {STEPS.map((s, k) => {
            const state = k + 1 < n ? "done" : k + 1 === n ? "now" : "later"
            return (
              <div key={s.title} className={cn("flex flex-col items-center px-4 text-center transition-opacity duration-500", state === "later" && "opacity-25")} style={{ width: slot }} data-step={k + 1}>
                <span className={cn("flex size-[116px] items-center justify-center rounded-full border-[3px] transition-colors duration-500", state === "now" ? "border-jade bg-jade text-white" : state === "done" ? "border-jade bg-white text-jade" : "border-[#cfd5d3] bg-white text-[#8a9493]")}>
                  <s.icon className="size-[48px]" strokeWidth={1.5} />
                </span>
                <p className="mt-5 text-[19px] font-semibold text-[#5d6766]">Step {k + 1}</p>
                <p className="mt-1 text-[28px] font-semibold leading-tight">{s.title}</p>
                <p className="mt-3 text-[22px] leading-[1.35] text-[#3c4746]">{s.example}</p>
              </div>
            )
          })}
        </div>
      </div>
      <div key={n} className="rise absolute left-[110px] right-[110px] top-[760px] rounded-[18px] bg-white px-12 py-9">
        <p className="text-[38px] leading-[1.3]">{step.caption}</p>
      </div>
      <p className="absolute bottom-[100px] left-[110px] text-[19px] text-[#5d6766]">Offline buffer: storage on the seat screen itself. Validated sync: an upload that is checked before it is saved.</p>
    </>
  )
}

function Value() {
  const rows = [
    { insight: "15 of 38 Business passengers on CX695 chose dal makhani. The standard load is 9.", decision: "Load meals to pre-orders on Hong Kong to Delhi, not fixed ratios.", who: "Catering planning" },
    { insight: "24 of 38 put cricket first. Champions Trophy replays were watched most.", decision: "Buy and refresh the live cricket and India news pack for India routes.", who: "Content buying" },
    { insight: "22 of 38 asked not to be disturbed after dinner.", decision: "Finish the main service by 21:20 on the late Delhi flight.", who: "Cabin service" },
  ]
  return (
    <>
      <Title>What Cathay learns, and what it decides.</Title>
      <div className="absolute left-[110px] right-[110px] top-[330px] overflow-hidden rounded-[18px] bg-white">
        <div className="grid grid-cols-[1fr_1fr_300px] gap-12 border-b border-[#e3e7e6] px-10 py-6 text-[24px] text-[#5d6766]">
          <span>Customer insight, one flight</span>
          <span>Decision it enables</span>
          <span>Who decides</span>
        </div>
        {rows.map((r) => (
          <div key={r.who} className="grid grid-cols-[1fr_1fr_300px] gap-12 border-b border-[#eef0ef] px-10 py-8 last:border-0">
            <p className="text-[29px] leading-[1.35]">{r.insight}</p>
            <p className="text-[29px] font-semibold leading-[1.35] text-jade-deep">{r.decision}</p>
            <p className="text-[26px] text-[#3c4746]">{r.who}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-[100px] left-[110px] flex items-center gap-4 text-[21px] text-[#3c4746]">
        <Sim className="text-[15px]">Simulated figures</Sim>
        One fictional flight. We do not claim revenue or loyalty gains; the pilot measures what changes.
      </div>
    </>
  )
}

function Feasibility() {
  const blocks = [
    { icon: ShieldCheck, title: "Secure seat pairing", body: "The seat links to him when his boarding pass is scanned at the gate, with no sign-in. If he swaps seats, the check-in system updates the seat and the profile follows him. No match means standard settings." },
    { icon: WifiOff, title: "Works offline", body: "Profiles load onto the aircraft at the gate with the content update. The seat keeps choices locally and uploads once after landing." },
    { icon: UserCheck, title: "Consent and control", body: "Opt in from the app. One screen shows everything stored, who sees it, and deletes it." },
    { icon: Plug, title: "Supplier integration", body: "Seat screen through the in-flight entertainment supplier's interface. Meal totals sent to the catering system for loading.", proposed: true },
  ]
  return (
    <>
      <Title>Can it work on a real aircraft?</Title>
      <div className="absolute left-[110px] top-[300px] grid w-[1160px] grid-cols-2 gap-6">
        {blocks.map((b) => (
          <div key={b.title} className="rounded-[18px] bg-white px-9 py-8">
            <div className="flex items-center gap-4">
              <b.icon className="size-9 text-jade" strokeWidth={1.6} />
              <p className="text-[30px] font-semibold">{b.title}</p>
              {b.proposed && <span className="rounded-[4px] border border-[#b9a46b] bg-[#fbf6e8] px-2 py-0.5 text-[16px] font-semibold text-[#6f5a1c]">Proposed</span>}
            </div>
            <p className="mt-4 text-[23px] leading-[1.42] text-[#3c4746]">{b.body}</p>
          </div>
        ))}
      </div>
      <figure className="absolute right-[110px] top-[270px] flex w-[460px] flex-col items-center">
        <Shot src="/pitch/phone-data.png" alt="You can see and delete this" className="h-[640px] w-auto" />
        <figcaption className="mt-4 text-center text-[22px] leading-snug text-[#3c4746]">In the app: &ldquo;You can see and delete this&rdquo;</figcaption>
      </figure>
    </>
  )
}

function Pilot() {
  return (
    <>
      <Title>Pilot: one route, eight weeks.</Title>
      <div className="absolute left-[110px] top-[300px] w-[820px]">
        {[
          ["Route", "Hong Kong to Delhi, CX695 and CX694"],
          ["Who", "Business cabin, members who opt in"],
          ["Weeks 1 and 2", "Baseline, no profile"],
          ["Weeks 3 to 8", "Flight profile live, meal pre-orders loaded"],
          ["Week 8", "Decide whether to add other India routes"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-8 border-b border-[#dfe3e2] py-[18px] text-[28px] last:border-0">
            <span className="w-[200px] shrink-0 text-[#5d6766]">{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <div className="mt-8 flex h-[54px] overflow-hidden rounded-[10px] text-[20px] font-semibold">
          <span className="flex w-1/4 items-center justify-center bg-[#dfe3e2] text-[#3c4746]">Baseline</span>
          <span className="flex flex-1 items-center justify-center bg-jade text-white">Profile live</span>
        </div>
        <div className="relative mt-2 h-6 text-[18px] text-[#5d6766]">
          <span className="absolute left-0">Week 1</span>
          <span className="absolute left-1/4 pl-2">Week 3</span>
          <span className="absolute right-0">Week 8</span>
        </div>
      </div>
      <div className="absolute right-[110px] top-[300px] w-[800px] rounded-[18px] bg-white px-11 py-10">
        <p className="text-[24px] font-semibold text-jade">Success metric</p>
        <p className="mt-2 text-[50px] font-semibold leading-tight">Meal-choice match rate</p>
        <p className="mt-3 text-[26px] leading-[1.4] text-[#3c4746]">The share of passengers who got the meal they chose in the app.</p>
        <div className="mt-8 grid grid-cols-2 gap-8 border-t border-[#eef0ef] pt-7">
          <div>
            <p className="text-[22px] text-[#5d6766]">Target</p>
            <p className="mt-1 text-[48px] font-semibold leading-none">95%</p>
            <Assumption />
          </div>
          <div>
            <p className="text-[22px] text-[#5d6766]">Estimated cost</p>
            <p className="mt-1 text-[48px] font-semibold leading-none">HK$1.5m</p>
            <Assumption />
          </div>
        </div>
        <p className="mt-6 text-[21px] leading-[1.4] text-[#5d6766]">Also watched: opt-in rate, deletion requests and crew feedback. Cost covers app work, the seat-screen supplier change and the catering feed, to be confirmed with suppliers.</p>
      </div>
      <div className="absolute bottom-[100px] left-[110px] flex items-center gap-3 text-[20px] text-[#3c4746]">
        <CheckCircle2 className="size-6 text-jade" strokeWidth={1.8} /> Targets and costs are assumptions for discussion, not commitments.
      </div>
    </>
  )
}

function Assumption() {
  return <span className="mt-3 inline-block rounded-[4px] border border-[#b9a46b] bg-[#fbf6e8] px-2 py-0.5 text-[15px] font-semibold text-[#6f5a1c]">Assumption</span>
}
