"use client"

import { Armchair, Check, ChevronLeft, ChevronRight, Gift, House, Moon, Plane, Share2, TicketPercent, Tv, User, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { BADGES, INTERESTS, METAL_BONUS, SHOP_ITEMS, type Interest } from "@/lib/data"
import { onboardPlan, summaryRows } from "@/lib/plan"
import { badgeState, statusSummary, useProfile, type PhoneScreen } from "@/lib/store"
import { BadgeArt, PinWithProgress } from "./badge-art"
import { BadgeDetail, DataScreen, PinsScreen, ProfileScreen, StatusCardScreen, TiersScreen } from "./loyalty"
import { AppHeader, AppHeaderDark, Card, MILES, Scroll, SectionHead } from "./phone-ui"
import { Disclaimer, Sim } from "./shared"
import { ShopScreen } from "./shop"
import { AirportScreen, AssistantScreen, ConfirmTrip, DebriefScreen, FamilyNotify, LoungeScreen, RouteRewards, SurveyScreen } from "./idea2"

export const PHONE_W = 390
export const PHONE_H = 844

export function PhoneDevice() {
  const { phone } = useProfile()
  return (
    <div className="relative h-[844px] w-[390px] rounded-[56px] bg-[#111414] p-[11px] leading-[1.4] shadow-[0_30px_60px_-30px_rgba(0,40,40,0.45)]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[46px] bg-[#f4f5f5]">
        <StatusBar />
        <div className="relative min-h-0 flex-1">
          <PhoneScreens />
        </div>
        {phone !== "setup" && phone !== "confirm" && phone !== "airport" && phone !== "lounge" && phone !== "family" && phone !== "debrief" && phone !== "route" && phone !== "assistant" && phone !== "survey" && <TabBar />}
        <div className="absolute bottom-[6px] left-1/2 h-[5px] w-[130px] -translate-x-1/2 rounded-full bg-black/80" />
      </div>
    </div>
  )
}

function StatusBar() {
  const { profile } = useProfile()
  return (
    <div className="relative z-10 flex h-[50px] shrink-0 items-end justify-between bg-[#f4f5f5] px-8 pb-2 text-[15px] font-semibold text-ink">
      <span>{profile.id === "anil" ? "18:42" : "07:15"}</span>
      <div className="absolute left-1/2 top-[11px] h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.6" />
          <rect x="5" y="5" width="3" height="6" rx="0.6" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="0.6" />
          <rect x="15" y="0" width="3" height="11" rx="0.6" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor" />
          <rect x="23.5" y="4" width="1.8" height="4" rx="0.8" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  )
}

function EarnIcon({ className, strokeWidth = 1.7 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 16.5 12 7l4 9.5M9.4 13.3h5.2" />
    </svg>
  )
}

function TabBar() {
  const { phone, set } = useProfile()
  const tabs: { id: PhoneScreen; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; match: PhoneScreen[] }[] = [
    { id: "home", label: "Home", icon: House, match: ["home", "saved", "recap", "shop"] },
    { id: "offers", label: "Offers", icon: TicketPercent, match: ["offers"] },
    { id: "pins", label: "Earn", icon: EarnIcon, match: ["pins", "badge"] },
    { id: "tiers", label: "Redeem", icon: Gift, match: ["tiers"] },
    { id: "profile", label: "Profile", icon: User, match: ["profile", "card", "data"] },
  ]
  return (
    <nav className="flex h-[78px] shrink-0 border-t border-[#e3e6e5] bg-white px-2 pb-5 pt-2">
      {tabs.map((t) => {
        const on = t.match.includes(phone)
        return (
          <button key={t.label} data-demo={`tab-${t.label.toLowerCase()}`} onClick={() => set({ phone: t.id })} className={cn("flex flex-1 flex-col items-center gap-1 text-[11px]", on ? "font-semibold text-jade" : "text-[#7c8786]")}>
            <t.icon className="size-[22px]" strokeWidth={on ? 2 : 1.6} />
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}

function PhoneScreens() {
  const { phone } = useProfile()
  switch (phone) {
    case "setup":
      return <Setup />
    case "saved":
      return <Saved />
    case "recap":
      return <Recap />
    case "offers":
      return <Offers />
    case "profile":
      return <ProfileScreen />
    case "pins":
      return <PinsScreen />
    case "badge":
      return <BadgeDetail />
    case "tiers":
      return <TiersScreen />
    case "card":
      return <StatusCardScreen />
    case "data":
      return <DataScreen />
    case "shop":
      return <ShopScreen />
    case "confirm":
      return <ConfirmTrip />
    case "airport":
      return <AirportScreen />
    case "lounge":
      return <LoungeScreen />
    case "family":
      return <FamilyNotify />
    case "debrief":
      return <DebriefScreen />
    case "route":
      return <RouteRewards />
    case "assistant":
      return <AssistantScreen />
    case "survey":
      return <SurveyScreen />
    default:
      return <PhoneHome />
  }
}

function PhoneHome() {
  const { profile, isSaved, set, prefs, hasFlown, profileId, saved } = useProfile()
  const t = profile.trip
  const meal = profile.meals.find((m) => m.id === prefs.meal)
  const sum = statusSummary(profileId, isSaved, hasFlown, prefs)
  const shown = sum.pins.filter((x) => x.st.earned).slice(-4).reverse()
  return (
    <Scroll>
      <AppHeader />
      <div className="px-5">
        <h1 className="mt-2 text-[24px] leading-8 text-ink">Hello {profile.formal}!</h1>
        <p className="mt-0.5 text-[15px] text-ink">
          <span className="font-semibold">
            {MILES} {profile.asiaMiles.toLocaleString()}
          </span>
          <span className="mx-2 text-[#b9c0bf]">|</span>
          Status points <span className="font-semibold">{sum.total.toLocaleString()}</span>
        </p>

        <SectionHead title="Upcoming journey" action="View all" />
        <div className="rounded-[14px] bg-white px-4 pb-3.5 pt-3.5 shadow-[0_6px_20px_-12px_rgba(0,50,50,0.35)]">
          <p className="text-[13px] text-ink">
            {t.date} <span className="mx-1 text-[#b9c0bf]">|</span> {t.flight}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-jade">
            {t.fromCity} <span className="font-normal text-ink">to</span> {t.toCity}
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[15px] font-semibold text-ink">{t.from}</p>
              <p className="text-[19px] leading-6 text-ink">{t.dep}</p>
            </div>
            <div className="mb-3 flex flex-1 flex-col items-center px-3">
              <span className="text-[11px] text-[#5d6766]">{t.duration}</span>
              <div className="mt-1 flex w-full items-center gap-1">
                <Plane className="size-4 fill-ink text-ink" strokeWidth={0} />
                <span className="h-px flex-1 bg-[#cfd5d3]" />
                <span className="size-1.5 rounded-full bg-[#cfd5d3]" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-semibold text-ink">{t.to}</p>
              <p className="text-[19px] leading-6 text-ink">{t.arr}</p>
            </div>
          </div>
          <div className="mt-2 flex justify-between border-t border-[#eef0ef] pt-2 text-[12px] text-[#5d6766]">
            <span>
              {t.cabin} · Seat {t.seat}
            </span>
            <span>
              {t.gate} · Boarding {t.boarding}
            </span>
          </div>
        </div>

        {hasFlown ? (
          <button onClick={() => set({ phone: "recap" })} className="mt-3 flex w-full items-center gap-3 rounded-[14px] bg-jade px-4 py-3.5 text-left text-white">
            <div className="flex-1">
              <p className="text-[14px] font-semibold">Your {t.flight} recap is ready</p>
              <p className="text-[12px] opacity-80">
                {t.toCity}, {t.distanceKm.toLocaleString()} km{((n) => (n === 0 ? "" : n === 1 ? ", one new pin" : `, ${n} new pins`))(sum.pins.filter((x) => x.st.justEarned).length)}
              </p>
            </div>
            <ChevronRight className="size-5" />
          </button>
        ) : isSaved ? (
          <div className="mt-3 rounded-[14px] bg-[#d9e8e5] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-jade text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
              <p className="text-[14px] font-semibold text-jade-deep">Flight profile on for {t.flight}</p>
            </div>
            <p className="mt-1.5 text-[13px] leading-[18px] text-ink/85">
              {meal?.name}, {profile.mealTimings.find((m) => m.id === prefs.mealTiming)?.label.toLowerCase()}. {prefs.dndAfterMeal ? "Do not disturb after the meal." : "Crew will check in during the flight."}
            </p>
            <div className="mt-3 flex gap-2">
              <Button className="h-9 rounded-full bg-jade px-4 text-[13px] hover:bg-jade-deep" onClick={() => set({ view: "tv", tv: "welcome" })}>
                <Tv className="size-4" /> Preview seat {t.seat}
              </Button>
              <Button variant="outline" className="h-9 rounded-full border-jade/40 bg-transparent px-4 text-[13px] text-jade" onClick={() => set({ phone: "setup", setupStep: 0 })}>
                Edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[14px] bg-jade text-white">
            <div className="px-4 pb-4 pt-4">
              <p className="text-[15px] font-semibold">Set how you like to fly</p>
              <p className="mt-1 text-[13px] leading-[18px] text-white/85">Meal, rest, seat and screen. Set it once and it is waiting at seat {t.seat} when you board, and on every flight after.</p>
              <Button data-demo="start-setup" className="mt-3 h-10 w-full rounded-full bg-white text-[14px] font-semibold text-jade hover:bg-white/90" onClick={() => set({ phone: "setup", setupStep: 0, saved: { ...saved, [profile.id]: false } })}>
                Set up flight profile
              </Button>
              <p className="mt-2 text-center text-[11px] text-white/70">Four steps, about a minute</p>
            </div>
          </div>
        )}

        <SectionHead title="My pins" action="View all" onAction={() => set({ phone: "pins" })} />
        <button onClick={() => set({ phone: "pins" })} className="flex w-full items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-left shadow-[0_6px_20px_-14px_rgba(0,50,50,0.35)]">
          <div className="flex -space-x-2">
            {shown.map(({ b }) => (
              <BadgeArt key={b.id} art={b.art} metal={b.metal} size={42} />
            ))}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">
              {sum.earnedCount} of {BADGES.length} earned
            </p>
            <p className="text-[12px] text-[#5d6766]">
              +{sum.pinPoints} bonus status points this year
            </p>
          </div>
          <ChevronRight className="size-4 text-[#7c8786]" />
        </button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

function Offers() {
  const { profile } = useProfile()
  return (
    <Scroll>
      <div className="bg-[#d9e8e5] px-5 pb-5">
        <AppHeader />
        <p className="mt-2 text-[15px] text-ink">Hi {profile.formal}!</p>
        <p className="text-[26px] text-ink">
          {MILES} {profile.asiaMiles.toLocaleString()}
        </p>
      </div>
      <div className="bg-white px-5 pb-5">
        <SectionHead title="Explore offers" action="View All" />
        <div className="relative h-[230px] overflow-hidden rounded-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/cabin-j.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[19px] leading-6">Upgrade to Business with Asia Miles</p>
            <p className="mt-1 text-[12px] text-white/80">On selected flights to Delhi, Mumbai and Bengaluru</p>
            <span className="mt-3 inline-flex h-8 items-center rounded-[6px] border border-white px-3 text-[13px]">Check flights</span>
          </div>
        </div>
      </div>
      <div className="px-5">
        <SectionHead title="Earn and spend your Asia Miles" />
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Membership", "Double status points on HKG to DEL this month", "/media/a350.jpg"],
            ["Dining", "Earn miles at 1,000 partner restaurants", "/media/hk-night.jpg"],
          ].map(([k, v, img]) => (
            <div key={k} className="overflow-hidden rounded-[10px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-[86px] w-full object-cover" />
              <div className="p-3">
                <p className="text-[11px] text-[#8a7232]">{k}</p>
                <p className="text-[13px] leading-[18px] text-ink">{v}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#5d6766]">
          Sample offers <Sim className="ml-1" />
        </p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

const STEPS = [
  { title: "Meal", icon: Utensils, heading: "Your meal", line: "Chosen once, loaded on every flight." },
  { title: "Rest", icon: Moon, heading: "Your rest", line: "Left alone and woken on your terms." },
  { title: "Seat", icon: Armchair, heading: "Your seat", line: "Picked for you when check-in opens." },
  { title: "Screen", icon: Tv, heading: "Your screen", line: "Your language and picks come first." },
]

function StepIntro({ step }: { step: number }) {
  const s = STEPS[step]
  return (
    <div className="mb-1 mt-5 flex items-center gap-3 px-1">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e3efed] text-jade">
        <s.icon className="size-[22px]" strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-ink">{s.heading}</h2>
        <p className="text-[13px] leading-[18px] text-[#5d6766]">{s.line}</p>
      </div>
    </div>
  )
}

function Setup() {
  const { setupStep, set, profile, saved } = useProfile()
  const review = setupStep >= STEPS.length
  return (
    <div className="absolute inset-0 flex flex-col bg-[#f4f5f5]">
      <div className="bg-jade px-4 pb-4 text-white">
        <div className="relative flex h-11 items-center justify-center">
          <button onClick={() => (setupStep === 0 ? set({ phone: "home" }) : set({ setupStep: setupStep - 1 }))} className="absolute left-0 flex size-9 items-center justify-center" aria-label="Back">
            <ChevronLeft className="size-6" />
          </button>
          <p className="text-[15px] font-semibold">Flight profile</p>
          <span className="absolute right-1 text-[12px] text-white/75">{review ? "" : `${setupStep + 1} of 4`}</span>
        </div>
        <p className="mt-1 px-1 text-[13px] text-white/80">
          {profile.trip.flight} · {profile.trip.date} · {profile.trip.fromCity} to {profile.trip.toCity}
        </p>
        <div className="mt-3 flex gap-1.5 px-1">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex-1">
              <div className={cn("h-[3px] rounded-full", i <= setupStep ? "bg-white" : "bg-white/30")} />
              <p className={cn("mt-1.5 text-[11px]", i === setupStep ? "font-semibold text-white" : "text-white/70")}>{s.title}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <Scroll key={setupStep} className="rise px-4 pb-6 pt-1">
          {!review && <StepIntro step={setupStep} />}
          {setupStep === 0 && <StepMeal />}
          {setupStep === 1 && <StepRest />}
          {setupStep === 2 && <StepSeat />}
          {setupStep === 3 && <StepScreen />}
          {review && <Review />}
        </Scroll>
      </div>
      <div className="shrink-0 border-t border-[#e3e6e5] bg-white px-5 pb-8 pt-3">
        {review ? (
          <Button data-demo="save" className="h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => set({ phone: "saved", saved: { ...saved, [profile.id]: true } })}>
            Save and send to seat {profile.trip.seat}
          </Button>
        ) : (
          <Button data-demo="next" className="h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => set({ setupStep: setupStep + 1 })}>
            {setupStep === STEPS.length - 1 ? "Review" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Heading({ title, sub, sim }: { title: string; sub?: string; sim?: boolean }) {
  return (
    <div className="mb-2 mt-5 px-1">
      <div className="flex items-center gap-2">
        <h3 className="text-[16px] text-ink">{title}</h3>
        {sim && <Sim />}
      </div>
      {sub && <p className="mt-0.5 text-[12px] leading-4 text-[#5d6766]">{sub}</p>}
    </div>
  )
}

function Choice({ value, onChange, options, cols = 2, label = (o) => o }: { value: string; onChange: (v: string) => void; options: string[]; cols?: number; label?: (o: string) => string }) {
  return (
    <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-1")}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          data-demo={`choice-${o}`}
          className={cn("flex h-11 items-center justify-between whitespace-nowrap rounded-[10px] border bg-white px-3 text-left text-[14px] transition-colors", value === o ? "border-jade bg-[#e8f1ef] font-semibold text-jade-deep" : "border-[#e1e5e4] text-ink")}
        >
          {label(o)}
          {value === o && <Check className="size-4 text-jade" strokeWidth={2.5} />}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({ title, sub, checked, onChange, demo }: { title: string; sub: string; checked: boolean; onChange: (v: boolean) => void; demo?: string }) {
  return (
    <label data-demo={demo} className="flex items-center gap-3 border-b border-[#eef0ef] py-3 last:border-0">
      <div className="flex-1">
        <p className="text-[14px] text-ink">{title}</p>
        <p className="text-[12px] leading-4 text-[#5d6766]">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} className="data-checked:bg-jade" />
    </label>
  )
}

function RadioList({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; name: string; detail: string }[] }) {
  return (
    <Card>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as string)} className="gap-0">
        {options.map((m) => (
          <label key={m.id} data-demo={`opt-${m.id}`} className="flex items-start gap-3 border-b border-[#eef0ef] py-3 last:border-0">
            <RadioGroupItem value={m.id} className="mt-0.5 data-checked:border-jade data-checked:bg-jade" />
            <div>
              <p className="text-[14px] text-ink">{m.name}</p>
              <p className="text-[12px] leading-4 text-[#5d6766]">{m.detail}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </Card>
  )
}

function StepMeal() {
  const { profile, prefs, setPrefs } = useProfile()
  const service = profile.id === "anil" ? "Dinner" : "Breakfast"
  return (
    <>
      <Heading title={`${service} on ${profile.trip.flight}`} sub={`${profile.trip.cabin} menu. Choose by 24 hours before departure.`} />
      <RadioList value={prefs.meal} onChange={(v) => setPrefs({ meal: v })} options={profile.meals} />
      <Heading title="When to serve it" sub="Crew see this on the cabin manifest next to your seat." sim />
      <RadioList value={prefs.mealTiming} onChange={(v) => setPrefs({ mealTiming: v })} options={profile.mealTimings.map((m) => ({ id: m.id, name: m.label, detail: m.detail }))} />
    </>
  )
}

function StepRest() {
  const { profile, prefs, setPrefs } = useProfile()
  return (
    <>
      <Heading title="After your meal" sub="Shared with the crew serving your aisle." sim />
      <Card>
        <ToggleRow demo="dnd" title="Do not disturb" sub="No drinks rounds or duty free until you call." checked={prefs.dndAfterMeal} onChange={(v) => setPrefs({ dndAfterMeal: v })} />
        {profile.trip.cabin === "Business" && <ToggleRow demo="bed" title="Make up my bed" sub="Mattress pad, duvet and pillow at your seat." checked={prefs.makeBed} onChange={(v) => setPrefs({ makeBed: v })} />}
      </Card>
      <Heading title="Wake me before landing" />
      <Choice value={prefs.wake} onChange={(v) => setPrefs({ wake: v })} options={profile.wakeOptions} label={(o) => o.replace(" before landing", "")} />
      <Heading title="Seat lighting" />
      <Choice value={prefs.lighting} onChange={(v) => setPrefs({ lighting: v })} options={["Dim and warm", "Leave as cabin"]} />
      <Heading title="How crew approach you" />
      <Choice value={prefs.crew} onChange={(v) => setPrefs({ crew: v })} options={["Keep it brief", "Happy to chat", "Only when I call"]} cols={1} />
    </>
  )
}

function StepSeat() {
  const { profile, prefs, setPrefs } = useProfile()
  return (
    <>
      <Heading title="Seat type" />
      <Choice value={prefs.seat} onChange={(v) => setPrefs({ seat: v })} options={["Window", "Aisle", "No preference"]} cols={3} label={(o) => (o === "No preference" ? "Either" : o)} />
      <Card className="mt-3">
        <ToggleRow title="Quiet zone" sub="Away from galleys and washrooms where possible." checked={prefs.quietZone} onChange={(v) => setPrefs({ quietZone: v })} />
      </Card>
      <Card className="mt-3 py-4">
        <p className="text-[12px] text-[#5d6766]">This trip</p>
        <div className="mt-2 flex items-center gap-4">
          <SeatMap seat={profile.trip.seat} cabin={profile.trip.cabin} />
          <div>
            <p className="text-[22px] font-semibold text-ink">{profile.trip.seat}</p>
            <p className="text-[13px] text-ink">
              {profile.trip.cabin}, {prefs.seat === "Aisle" ? "aisle" : "window"}
            </p>
            <p className="text-[12px] text-[#5d6766]">{profile.trip.aircraft}</p>
          </div>
        </div>
      </Card>
    </>
  )
}

function SeatMap({ seat, cabin }: { seat: string; cabin: string }) {
  const cols = cabin === "Business" ? ["A", "D", "G", "K"] : ["A", "C", "D", "G", "H", "K"]
  const letter = seat.slice(-1)
  return (
    <div className="flex flex-col gap-1">
      {[0, 1, 2].map((r) => (
        <div key={r} className="flex gap-1">
          {cols.map((c, i) => (
            <div key={c} className={cn("h-4 rounded-[3px]", cabin === "Business" ? "w-5" : "w-3", r === 1 && c === letter ? "bg-jade" : "bg-[#e3e7e6]", i === (cabin === "Business" ? 1 : 2) && "mr-2")} />
          ))}
        </div>
      ))}
    </div>
  )
}

function StepScreen() {
  const { prefs, setPrefs } = useProfile()
  const toggle = (id: Interest) => setPrefs({ interests: prefs.interests.includes(id) ? prefs.interests.filter((x) => x !== id) : [...prefs.interests, id] })
  return (
    <>
      <Heading title="Seat screen language" />
      <Choice value={prefs.language} onChange={(v) => setPrefs({ language: v })} options={["English", "繁體中文", "हिन्दी", "日本語"]} />
      <Heading title="Subtitles" />
      <Choice value={prefs.subtitles} onChange={(v) => setPrefs({ subtitles: v })} options={["Off", "English", "繁體中文", "日本語"]} />
      <Heading title="Put these first" sub="Your picks lead the seat screen home page." />
      <div className="grid grid-cols-2 gap-2">
        {INTERESTS.map((i) => {
          const on = prefs.interests.includes(i.id)
          return (
            <button key={i.id} onClick={() => toggle(i.id)} className={cn("flex h-10 items-center gap-2 rounded-[10px] border bg-white px-3 text-left text-[13px]", on ? "border-jade bg-[#e8f1ef] font-semibold text-jade-deep" : "border-[#e1e5e4] text-ink")}>
              <span className={cn("flex size-4 items-center justify-center rounded-[4px] border", on ? "border-jade bg-jade text-white" : "border-[#b8bfbe]")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
              {i.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

function Review() {
  const { profile, prefs, set } = useProfile()
  return (
    <>
      <div className="mb-3 mt-5 flex items-center gap-3 px-1">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jade text-white">
          <Check className="size-[22px]" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-ink">Check and save</h2>
          <p className="text-[13px] leading-[18px] text-[#5d6766]">For {profile.trip.flight} and every flight after it.</p>
        </div>
      </div>
      <Card>
        {summaryRows(profile.id, prefs).map((r) => (
          <div key={r.label} className="flex gap-3 border-b border-[#eef0ef] py-3 last:border-0">
            <r.icon className="mt-0.5 size-[18px] text-jade" strokeWidth={1.8} />
            <div className="flex-1">
              <p className="text-[12px] text-[#5d6766]">{r.label}</p>
              <p className="text-[14px] leading-5 text-ink">{r.value}</p>
            </div>
            <button onClick={() => set({ setupStep: r.step })} className="self-start text-[13px] font-semibold text-jade">
              Edit
            </button>
          </div>
        ))}
      </Card>
      <p className="mt-2 px-1 text-[12px] text-[#5d6766]">
        Crew on your aisle: <span className="text-ink">{prefs.crew}</span>
      </p>
      <div className="mt-4 rounded-[10px] bg-[#e8ecea] px-4 py-3 text-[12px] leading-5 text-ink/80">Cathay uses these choices to set up your seat, load your meal and brief the crew on your aisle. Change or delete them any time in Profile.</div>
    </>
  )
}

function Saved() {
  const { profile, prefs, set } = useProfile()
  const t = profile.trip
  return (
    <Scroll>
      <div className="bg-jade px-5 pb-6 pt-6 text-white">
        <span className="flex size-11 items-center justify-center rounded-full bg-white text-jade">
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 text-[24px] leading-7">Ready at seat {t.seat}</h2>
        <p className="mt-2 text-[14px] leading-5 text-white/85">When you sit down on {t.flight}, the seat screen opens with your profile. No sign-in, no setup on board.</p>
        <Sim dark className="mt-3">
          Seat pairing simulated
        </Sim>
      </div>
      <div className="px-4">
        <Heading title={`On board, ${t.date}`} />
        <Card className="py-1">
          <div className="relative ml-1.5 border-l border-[#d6dcda] pl-5">
            {onboardPlan(profile.id, prefs).map((s) => (
              <div key={s.at} className="relative py-2.5">
                <span className="absolute -left-[25px] top-[15px] size-[9px] rounded-full border-2 border-jade bg-white" />
                <p className="text-[12px] text-[#5d6766]">{s.at}</p>
                <p className="text-[14px] text-ink">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
        <Button data-demo="to-tv" className="mt-5 h-11 w-full rounded-full bg-jade text-[15px] font-semibold hover:bg-jade-deep" onClick={() => set({ view: "tv", tv: "map" })}>
          See it on the seat screen
        </Button>
        <Button variant="ghost" className="mb-6 mt-1 h-10 w-full text-[14px] text-jade" onClick={() => set({ phone: "home" })}>
          Done
        </Button>
      </div>
    </Scroll>
  )
}

function Recap() {
  const { profile, prefs, isSaved, profileId, set } = useProfile()
  const t = profile.trip
  const rc = profile.recap
  const fresh = BADGES.map((b) => ({ b, st: badgeState(profileId, b.id, isSaved, true, prefs) })).filter((x) => x.st.justEarned)
  const sum = statusSummary(profileId, isSaved, true, prefs)
  const setOnce = BADGES.find((b) => b.id === "set-once")!
  const so = badgeState(profileId, "set-once", isSaved, true, prefs)
  return (
    <Scroll>
      <div className="bg-jade px-5 pb-6 text-white">
        <AppHeaderDark onBack={() => set({ phone: "home" })} />
        <p className="mt-2 text-[13px] text-white/80">
          {t.flight} · {t.date}
        </p>
        <h2 className="text-[25px] leading-8">
          {t.fromCity} to {t.toCity}
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/25 pt-3">
          {[
            ["Distance", `${t.distanceKm.toLocaleString()} km`],
            ["In the air", t.duration],
            ["Slept", rc.slept],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[18px] font-semibold">{v}</p>
              <p className="text-[11px] text-white/75">{k}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4">
        <Heading title="How your profile was used" sim />
        <Card>
          {[rc.meal, ...rc.highlights].map((h) => (
            <div key={h} className="flex gap-2.5 border-b border-[#eef0ef] py-2.5 text-[13px] leading-5 text-ink last:border-0">
              <Check className="mt-0.5 size-4 shrink-0 text-jade" strokeWidth={2.5} />
              {h}
            </div>
          ))}
        </Card>
        <Heading title="Watched" />
        <Card>
          {rc.watched.map((w) => (
            <div key={w.title} className="flex justify-between gap-3 border-b border-[#eef0ef] py-2.5 text-[13px] last:border-0">
              <span className="text-ink">{w.title}</span>
              <span className="shrink-0 text-[#5d6766]">{w.time}</span>
            </div>
          ))}
        </Card>
        {fresh.map(({ b }) => (
          <button key={b.id} onClick={() => set({ phone: "badge", badgeId: b.id, badgeFrom: "recap" })} className="mt-4 flex w-full items-center gap-4 rounded-[14px] bg-white p-4 text-left">
            <BadgeArt art={b.art} metal={b.metal} size={64} />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-jade">Pin unlocked</p>
              <p className="text-[16px] text-ink">{b.name}</p>
              <p className="text-[12px] leading-4 text-[#5d6766]">
                +{METAL_BONUS[b.metal]} status points{sum.promoted ? `, counted towards ${sum.tier}` : ` towards ${sum.next.name}`}
              </p>
            </div>
            <ChevronRight className="size-4 text-[#7c8786]" />
          </button>
        ))}
        {fresh.length === 0 && (
          <button onClick={() => set({ phone: "badge", badgeId: "set-once", badgeFrom: "recap" })} className="mt-4 flex w-full items-center gap-4 rounded-[14px] bg-white p-4 text-left">
            <PinWithProgress art={setOnce.art} metal={setOnce.metal} earned={false} progress={so.progress} size={58} />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-jade">Pin progress</p>
              <p className="text-[15px] text-ink">Set Once, {so.label}</p>
              <p className="text-[12px] leading-4 text-[#5d6766]">Four more flights on your saved profile.</p>
            </div>
          </button>
        )}
        <button data-demo="recap-shop" onClick={() => set({ phone: "shop" })} className="mt-4 flex w-full items-center gap-3 rounded-[14px] bg-white p-3 text-left">
          <div className="flex -space-x-3">
            {SHOP_ITEMS.map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i.id} src={i.img} alt="" className="size-11 rounded-full border-2 border-white object-cover" />
            ))}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-jade">Cathay Shop</p>
            <p className="text-[14px] text-ink">From your flight, delivered to your next seat</p>
          </div>
          <ChevronRight className="size-4 text-[#7c8786]" />
        </button>
        <div className="mt-4 rounded-[14px] bg-[#1d2423] px-5 py-5 text-white">
          <p className="text-[12px] text-white/70">Your {profile.stats.year} in flight</p>
          <p className="mt-1 text-[20px] leading-7">{rc.yearHeadline}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 border-t border-white/15">
            {rc.yearLines.map((l) => (
              <div key={l.label} className="border-b border-white/15 py-2">
                <p className="text-[16px] font-semibold">{l.value}</p>
                <p className="text-[11px] leading-4 text-white/70">{l.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-white/70">
            {sum.tier} · {profile.percentiles[0].line}
          </p>
        </div>
        <Button variant="outline" className="mt-3 h-10 w-full rounded-full bg-white text-[14px]" onClick={() => set({ phone: "card" })}>
          <Share2 className="size-4" /> Share your year
        </Button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

