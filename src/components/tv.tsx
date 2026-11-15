"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Gamepad2,
  Home,
  Map as MapIcon,
  Menu,
  Music,
  Newspaper,
  Pause,
  Plane,
  Play,
  Settings,
  Sun,
  Trophy,
  User,
  Utensils,
  Wifi,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BADGES, CATALOG, INTERESTS, METAL_BONUS, METAL_LABEL, NEWS_SECTIONS, PROFILES, itemById, type Interest, type Item, type Prefs, type Profile, type ProfileId } from "@/lib/data"
import { ELAPSED_MIN, remaining, summaryRows } from "@/lib/plan"
import { SWITCH_FLIP_MS, SWITCH_MS, badgeState, statusSummary, useDemo, useProfile, type TvScreen } from "@/lib/store"
import { BadgeArt, PinWithProgress } from "./badge-art"
import { TvService } from "./idea2"
import { Brushwing, Disclaimer, Sim } from "./shared"

export const TV_W = 1920
export const TV_H = 1080

const glass = "border border-white/12 bg-[#0b0f10]/55 backdrop-blur-md"

export function TvScreenView() {
  const { tv } = useProfile()
  const chrome = tv === "home" || tv === "map" || tv === "news" || tv === "sport"
  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden bg-black font-sans text-white">
      {tv === "idle" && <Idle />}
      {tv === "welcome" && <Welcome />}
      {tv === "home" && <TvHome />}
      {tv === "map" && <FlightMap />}
      {tv === "news" && <TvNews />}
      {tv === "sport" && <TvSport />}
      {tv === "arrival" && <Arrival />}
      {tv === "service" && <TvService />}
      {chrome && <Chrome />}
      <Handover />
      <Disclaimer dark className="absolute bottom-3 right-8 text-[15px] text-white/50" />
    </div>
  )
}

function Passenger({ id, state }: { id: ProfileId; state: "out" | "in" }) {
  const p = PROFILES[id]
  return (
    <div className={cn("flex w-[600px] items-center gap-6 rounded-[20px] px-8 py-7", state === "out" ? "handover-out bg-white/8" : "handover-in bg-white text-[#0b0f10]")}>
      <span className={cn("flex size-[96px] shrink-0 items-center justify-center rounded-full text-[34px] font-semibold", state === "out" ? "bg-white/15" : "bg-jade text-white")}>{p.initials}</span>
      <div className="leading-tight">
        <p className={cn("text-[20px] font-semibold uppercase tracking-[0.08em]", state === "out" ? "text-white/55" : "text-jade")}>{state === "out" ? "Leaving the seat" : "Now seated"}</p>
        <p className="mt-1.5 text-[38px] font-semibold">{p.formal}</p>
        <p className={cn("mt-1 text-[24px]", state === "out" ? "text-white/65" : "text-[#3d4746]")}>
          {p.tier} member · {p.trip.flight} to {p.trip.toCity}
        </p>
      </div>
    </div>
  )
}

/** "Same seat, different passenger": the outgoing profile clears and the next one loads behind the card. */
function Handover() {
  const { switching } = useDemo()
  if (!switching) return null
  const to = PROFILES[switching.to]
  return (
    <div key={switching.at} className="handover absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#05090a]/80 backdrop-blur-[24px]" style={{ animationDuration: `${SWITCH_MS}ms` }}>
      <Brushwing white className="w-[64px]" />
      <h2 className="mt-8 text-[72px] font-semibold leading-none tracking-[-0.015em]">Same seat, different passenger</h2>
      <p className="mt-5 text-[26px] text-white/70">
        The seat screen clears one profile and loads {to.id === "chloe" ? "hers" : "his"}. Nothing carries over.
      </p>
      <div className="mt-14 flex items-center gap-8">
        <Passenger id={switching.from} state="out" />
        <ChevronRight className="size-12 text-white/60" strokeWidth={1.5} />
        <Passenger id={switching.to} state="in" />
      </div>
      <div className="mt-12 h-[3px] w-[600px] bg-white/15">
        <div className="fill-x h-full bg-jade-light" style={{ animationDelay: "300ms", animationDuration: `${SWITCH_FLIP_MS}ms` }} />
      </div>
      <p className="mt-4 text-[20px] text-white/55">Loading {to.formal}&apos;s flight profile</p>
    </div>
  )
}

function Backdrop({ src, className, overlay = "bg-[#05090a]/70" }: { src: string; className?: string; overlay?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={cn("absolute inset-0 h-full w-full object-cover", className)} />
      <div className={cn("absolute inset-0", overlay)} />
    </>
  )
}

function Idle() {
  const { profile, set } = useProfile()
  const t = profile.trip
  return (
    <button data-demo="tv-sit" onClick={() => set({ tv: "welcome" })} className="absolute inset-0 block text-left">
      <Backdrop src="/media/prd-landsat-1973.jpg" className="[filter:sepia(.75)_saturate(.7)_brightness(.78)_contrast(1.08)]" overlay="bg-[radial-gradient(ellipse_at_30%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.45)_75%)]" />
      <p className="absolute left-[110px] top-[86px] text-[150px] font-light leading-none tracking-[-0.02em] text-white/95">{t.seat}</p>
      <div className="absolute right-[110px] top-[96px] w-[600px] rounded-[10px] bg-black/55 px-8 py-6 text-[21px] leading-[1.5] text-white/90">
        We are delighted to welcome you aboard our {t.aircraft.replace("Airbus ", "")}. For your safety, the seat screen is locked for taxi, take-off and landing. Our cabin crew will return after departure to explain the features of the suite.
      </div>
      <div className="absolute bottom-[64px] left-[110px] flex items-center gap-5">
        <Brushwing white className="w-[44px] opacity-90" />
        <span className="text-[22px] text-white/85">
          {t.flight} to {t.toCity}
        </span>
        <span className="h-6 w-px bg-white/30" />
        <span className="text-[20px] text-white/60">Waiting for passenger</span>
        <Sim dark className="text-[13px]">
          Seat recognition simulated
        </Sim>
      </div>
    </button>
  )
}

function Welcome() {
  const { profile, isSaved, prefs, set, idea } = useProfile()
  const t = profile.trip
  const rows = summaryRows(profile.id, prefs, idea === 3 ? "His usual" : undefined)
  const evening = profile.id === "anil"
  return (
    <div className="absolute inset-0">
      <Backdrop src="/media/prd-landsat-1973.jpg" className="scale-110 blur-[18px] [filter:sepia(.7)_brightness(.5)]" overlay="bg-[#05090a]/72" />
      <div className="relative flex h-full flex-col items-center pt-[110px]">
        <Brushwing white className="rise w-[70px]" />
        <p className="rise mt-10 text-[26px] text-white/70" style={{ animationDelay: "150ms" }}>
          Seat {t.seat} · {t.flight} to {t.toCity}
        </p>
        <h1 className="rise mt-3 text-[92px] font-semibold leading-none tracking-[-0.015em]" style={{ animationDelay: "250ms" }}>
          {evening ? "Good evening" : "Good morning"}, {profile.formal}
        </h1>
        <div className="rise mt-6 flex items-center gap-3 text-[22px] text-white/75" style={{ animationDelay: "400ms" }}>
          <User className="size-6" strokeWidth={1.6} /> Recognised from your boarding pass
          <Sim dark className="text-[13px]" />
        </div>
        {isSaved ? (
          <div className={cn("rise mt-12 w-[980px] rounded-[18px] px-10 pb-6 pt-7", glass)} style={{ animationDelay: "600ms" }}>
            <div className="flex items-center justify-between">
              <p className="text-[26px] font-semibold">Loading your flight profile</p>
              <p className="text-[20px] text-white/60">Set in the Cathay app</p>
            </div>
            <div className="mt-4 h-[3px] bg-white/15">
              <div className="fill-x h-full bg-jade-light" style={{ animationDelay: "700ms", animationDuration: "1800ms" }} />
            </div>
            <div className="mt-3">
              {rows.map((r, i) => (
                <div key={r.label} className="rise flex items-start gap-6 border-b border-white/10 py-4 last:border-0" style={{ animationDelay: `${900 + i * 380}ms` }}>
                  <r.icon className="mt-0.5 size-8 shrink-0 text-jade-light" strokeWidth={1.6} />
                  <span className="w-[110px] shrink-0 text-[22px] text-white/55">{r.label}</span>
                  <span className="text-[24px] leading-8">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("rise mt-12 w-[860px] rounded-[18px] px-10 py-8 text-center", glass)} style={{ animationDelay: "600ms" }}>
            <p className="text-[28px] font-semibold">Standard settings on this flight</p>
            <p className="mt-2 text-[22px] leading-8 text-white/70">Set up a flight profile in the Cathay app and your meal, rest and screen are ready before you board.</p>
          </div>
        )}
        <button
          data-demo="tv-start"
          onClick={() => set({ tv: "home" })}
          className="rise mt-10 flex h-[68px] items-center gap-3 rounded-[14px] bg-white px-12 text-[24px] font-semibold text-[#0b0f10]"
          style={{ animationDelay: isSaved ? "2600ms" : "800ms" }}
        >
          Start
        </button>
      </div>
    </div>
  )
}

function nowPlaying(profile: Profile, saved: boolean, prefs: Prefs) {
  if (saved && prefs.interests.includes("cricket")) return { title: "India v Australia", sub: "Live · 38.2 overs", img: "/media/eden.jpg", progress: 0.76 }
  const c = saved ? profile.continueWatching[0] : undefined
  if (c) {
    const item = itemById(c.itemId)!
    return { title: item.title, sub: c.note.split(" · ")[0], img: item.img!, progress: c.progress }
  }
  return null
}

function Chrome() {
  const { tv, set, profile, isSaved, prefs, profileId } = useProfile()
  const [menu, setMenu] = useState(false)
  const np = tv === "map" ? null : nowPlaying(profile, isSaved, prefs)
  const go = (s: TvScreen) => {
    set({ tv: s })
    setMenu(false)
  }
  const pill = "flex h-[56px] items-center gap-3 rounded-[12px] px-6 text-[21px] " + glass
  return (
    <>
      <div className="absolute left-[56px] top-[40px] flex gap-4">
        <button data-demo="tv-menu" onClick={() => setMenu(true)} className={pill}>
          <Menu className="size-6" strokeWidth={1.7} /> Menu
        </button>
        <button data-demo="tv-arrive" onClick={() => set({ tv: "arrival" })} className={pill}>
          <Plane className="size-6" strokeWidth={1.7} /> {remaining(profileId)}
        </button>
      </div>
      <div className="absolute left-1/2 top-[40px] -translate-x-1/2">
        {np ? (
          <div className={cn("flex h-[56px] items-center gap-4 rounded-full pl-2 pr-5", glass)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={np.img} alt="" className="size-[42px] rounded-full object-cover" />
            <div className="leading-tight">
              <p className="text-[19px] font-semibold">{np.title}</p>
              <p className="text-[15px] text-white/60">{np.sub}</p>
            </div>
            <div className="ml-2 h-[3px] w-[90px] bg-white/20">
              <div className="h-full bg-white" style={{ width: `${np.progress * 100}%` }} />
            </div>
            <Pause className="size-6 fill-white" strokeWidth={0} />
          </div>
        ) : (
          <Brushwing white className="mt-1 w-[52px]" />
        )}
      </div>
      <div className={cn("absolute right-[56px] top-[40px] flex h-[56px] items-center gap-2 rounded-full px-2", glass)}>
        <span className="relative flex size-[44px] items-center justify-center rounded-full bg-white/10">
          <Wifi className="size-[22px]" strokeWidth={1.8} />
          <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-[#4cc38a]" />
        </span>
        <span className={cn("flex size-[44px] items-center justify-center rounded-full text-[16px] font-semibold", isSaved ? "bg-jade" : "bg-white/10")}>
          {isSaved ? profile.initials : <User className="size-[22px]" strokeWidth={1.8} />}
        </span>
        <span className="flex size-[44px] items-center justify-center rounded-full bg-white/10">
          {isSaved && prefs.dndAfterMeal ? <BellOff className="size-[22px] text-[#9fd3bf]" strokeWidth={1.8} /> : <Sun className="size-[22px]" strokeWidth={1.8} />}
        </span>
        <span className="flex size-[44px] items-center justify-center rounded-full bg-white/10">
          <Settings className="size-[22px]" strokeWidth={1.8} />
        </span>
      </div>
      {menu && <MenuDrawer close={() => setMenu(false)} go={go} />}
    </>
  )
}

function MenuDrawer({ close, go }: { close: () => void; go: (s: TvScreen) => void }) {
  const { tv, profile, isSaved, prefs, idea } = useProfile()
  const items: { id?: TvScreen; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "home", label: "Watch", icon: Clapperboard },
    { label: "Listen", icon: Music },
    { label: "Play", icon: Gamepad2 },
    { id: "sport", label: "Sport", icon: Trophy },
    { id: "news", label: "News", icon: Newspaper },
    { id: "map", label: "Flight map", icon: MapIcon },
  ]
  return (
    <div className="absolute inset-0 z-20 flex">
      <div className="h-full w-[560px] bg-[#0b0f10]/92 px-12 pt-[40px] backdrop-blur-xl">
        <button onClick={close} className="flex h-[56px] items-center gap-3 rounded-[12px] border border-white/15 px-6 text-[21px]">
          <X className="size-6" strokeWidth={1.7} /> Close
        </button>
        <nav className="mt-10 flex flex-col">
          {items.map((it) => (
            <button
              key={it.label}
              data-demo={`menu-${it.label.toLowerCase().replace(" ", "-")}`}
              onClick={() => it.id && go(it.id)}
              className={cn("flex h-[76px] items-center gap-6 rounded-[12px] px-5 text-[28px]", it.id && tv === it.id && it.label !== "Watch" ? "bg-white/10 font-semibold" : it.id ? "text-white/85" : "text-white/40")}
            >
              <it.icon className="size-8" strokeWidth={1.5} /> {it.label}
            </button>
          ))}
        </nav>
        <div className="mt-8 border-t border-white/12 pt-6">
          <p className="text-[20px] text-white/55">Flight profile</p>
          <p className="mt-1 text-[24px] font-semibold">{isSaved ? `On for ${profile.formal}` : "Not set up"}</p>
          {isSaved && <p className="mt-1 text-[19px] leading-7 text-white/65">{summaryRows(profile.id, prefs, idea === 3 ? "His usual" : undefined)[0].value}</p>}
        </div>
      </div>
      <button aria-label="Close menu" onClick={close} className="flex-1 bg-black/40" />
    </div>
  )
}

function pickedFor(prefs: Prefs, saved: boolean): Item[] {
  if (!saved) return ["wicked", "inside-out-2", "conclave", "oppenheimer", "past-lives", "spirited-away", "12th-fail", "lion", "your-name"].map((i) => itemById(i)!)
  const seen = new Set<string>()
  const out: Item[] = []
  for (const tag of prefs.interests) {
    for (const c of CATALOG) {
      if (c.kind === "News" || !c.img || !c.tags.includes(tag) || seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
  }
  return out
}

function TvHome() {
  const { profile, prefs, isSaved, set } = useProfile()
  const cricket = isSaved && prefs.interests.includes("cricket")
  const japan = isSaved && prefs.interests.includes("japanese-film")
  const items = pickedFor(prefs, isSaved)
  const labels = INTERESTS.filter((i) => prefs.interests.includes(i.id)).map((i) => i.label)
  const sections = briefingFor(prefs, isSaved).slice(0, 3)
  const bg = cricket ? "/media/eden.jpg" : japan ? "/media/osaka.jpg" : "/media/hk-night.jpg"
  return (
    <div className="absolute inset-0">
      <Backdrop src={bg} overlay="bg-[linear-gradient(90deg,rgba(5,9,10,.88)_0%,rgba(5,9,10,.62)_50%,rgba(5,9,10,.35)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[620px] bg-[linear-gradient(0deg,rgba(5,9,10,.95)_30%,rgba(5,9,10,0)_100%)]" />
      <div className="relative flex px-[110px] pt-[170px]">
        <div className="w-[980px]">
          {cricket ? (
            <>
              <div className="flex items-center gap-3 text-[22px]">
                <span className="flex items-center gap-2 rounded-[6px] bg-[#c8102e] px-3 py-1 text-[17px] font-bold">
                  <span className="size-2 rounded-full bg-white" /> LIVE
                </span>
                <span className="text-white/80">Sport24 · One-day international</span>
                <Sim dark className="text-[13px]">
                  Live feed simulated
                </Sim>
              </div>
              <h1 className="mt-5 text-[96px] font-semibold leading-[1] tracking-[-0.015em]">India v Australia</h1>
              <p className="mt-4 text-[28px] text-white/80">
                214/3 after 38.2 overs · India need 87 from 70 balls · Eden Gardens, Kolkata
              </p>
            </>
          ) : (
            <>
              <p className="text-[24px] text-white/75">{japan ? `Before you land in ${profile.trip.toCity}` : "Featured this month"}</p>
              <h1 className="mt-4 text-[96px] font-semibold leading-[1] tracking-[-0.015em]">{japan ? "Spirited Away" : "Oppenheimer"}</h1>
              <p className="mt-4 text-[28px] text-white/80">
                {japan ? "Hayao Miyazaki · 2001 · Japanese" : "Christopher Nolan · 2023 · English"}
                {isSaved && prefs.subtitles !== "Off" ? ` · Subtitles in ${prefs.subtitles}` : ""}
              </p>
            </>
          )}
          <div className="mt-9 flex gap-4">
            <button className="flex h-[64px] items-center gap-3 rounded-[14px] bg-white px-9 text-[23px] font-semibold text-[#0b0f10]">
              <Play className="size-6 fill-current" /> {cricket ? "Watch live" : "Play"}
            </button>
            <button onClick={() => cricket && set({ tv: "sport" })} className="flex h-[64px] items-center rounded-[14px] border border-white/30 bg-black/30 px-9 text-[23px]">
              {cricket ? "Scorecard and replays" : "Add to my list"}
            </button>
          </div>
        </div>
        {sections.length > 0 && (
          <button onClick={() => set({ tv: "news" })} className={cn("ml-auto w-[560px] self-start rounded-[18px] px-8 py-7 text-left", glass)}>
            <div className="flex items-center justify-between">
              <p className="text-[24px] font-semibold">Your briefing</p>
              <span className="text-[18px] text-white/55">Downloaded 19:10</span>
            </div>
            {sections.map((s) => (
              <div key={s.title} className="mt-5 border-t border-white/12 pt-4">
                <p className="text-[18px] font-semibold text-[#9fd3bf]">{s.title}</p>
                <p className="mt-1 text-[21px] leading-7 text-white/90">{s.lines[0]}</p>
              </div>
            ))}
          </button>
        )}
      </div>
      <section className="absolute left-[110px] right-0 top-[618px]">
        <div className="flex items-center gap-5 pr-[110px]">
          <h2 className="text-[30px] font-semibold">{isSaved ? "Picked for you" : "New this month"}</h2>
          {isSaved && <span className="text-[21px] text-white/55">{labels.join(", ")}</span>}
          <div className="ml-auto flex items-center gap-3">
            <span className="flex h-[44px] items-center rounded-full border border-white/25 px-5 text-[18px]">See all</span>
            <span className="flex size-[44px] items-center justify-center rounded-full border border-white/25">
              <ChevronLeft className="size-5" />
            </span>
            <span className="flex size-[44px] items-center justify-center rounded-full border border-white/25">
              <ChevronRight className="size-5" />
            </span>
          </div>
        </div>
        <div className="mt-5 flex gap-5 overflow-hidden">
          {items.map((i) => (
            <Tile key={i.id} item={i} h={210} />
          ))}
        </div>
      </section>
      <UpNext />
    </div>
  )
}

function Tile({ item, h }: { item: Item; h: number }) {
  const wide = item.kind === "Cricket"
  return (
    <div className="shrink-0" style={{ width: wide ? (h * 16) / 9 : (h * 2) / 3 }}>
      <div className="relative overflow-hidden rounded-[12px] bg-white/5" style={{ height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt={item.title} className="h-full w-full object-cover" />
        {wide && <span className="absolute left-3 top-3 rounded-[6px] bg-black/70 px-2.5 py-0.5 text-[15px] font-semibold">Recorded</span>}
      </div>
      <p className="mt-2 truncate text-[18px] font-medium">{item.title}</p>
    </div>
  )
}

function UpNext() {
  const { profile, prefs, isSaved, idea } = useProfile()
  const meal = profile.meals.find((m) => m.id === prefs.meal)?.name
  const parts = !isSaved
    ? [{ icon: Utensils, text: "Meal service after take-off" }]
    : idea === 3 && profile.id === "anil"
      ? [
          { icon: Utensils, text: "Dinner first, about 20:40" },
          { icon: BellOff, text: "Then rest, bed made" },
          { icon: Bell, text: "Tea 45 min before landing" },
        ]
    : profile.id === "anil"
      ? [
          { icon: Utensils, text: `${meal}, ${prefs.mealTiming === "early" ? "served first, about 20:40" : "when you ask"}` },
          { icon: BellOff, text: prefs.dndAfterMeal ? `Then do not disturb${prefs.makeBed ? ", bed made up" : ""}` : "Crew check in after dinner" },
          { icon: Bell, text: prefs.wake === "Don't wake me" ? "No wake-up call" : `Tea ${prefs.wake}` },
        ]
      : [
          { icon: Utensils, text: `${meal}, ${prefs.mealTiming === "wake" ? "crew will wake you" : "from the cart"}` },
          { icon: Bell, text: `Wake-up ${prefs.wake}` },
        ]
  return (
    <div className={cn("absolute bottom-[44px] left-[110px] right-[110px] flex h-[68px] items-center gap-10 rounded-[14px] px-8", glass)}>
      <span className="text-[20px] font-semibold text-white/60">{isSaved ? "Your flight" : "Up next"}</span>
      {parts.map((p) => (
        <span key={p.text} className="flex items-center gap-3 text-[21px]">
          <p.icon className="size-6 text-[#9fd3bf]" strokeWidth={1.7} /> {p.text}
        </span>
      ))}
      {isSaved && <Sim dark className="ml-auto text-[13px]">From your flight profile</Sim>}
    </div>
  )
}

const GLOBE = { w: 1400, left: 256, top: 226 }
const CITY: Record<string, [number, number]> = { HKG: [0.57, 0.453], DEL: [0.322, 0.34], KIX: [0.68, 0.386] }
const at = (code: string): [number, number] => [GLOBE.left + CITY[code][0] * GLOBE.w, GLOBE.top + CITY[code][1] * GLOBE.w]

function FlightMap() {
  const { profile, prefs, isSaved, profileId } = useProfile()
  const t = profile.trip
  const [x1, y1] = at(t.from)
  const [x2, y2] = at(t.to)
  const lift = Math.hypot(x2 - x1, y2 - y1) * 0.35
  const cx = (x1 + x2) / 2
  const cy = Math.min(y1, y2) - lift
  const west = x2 < x1
  const f = ELAPSED_MIN[profileId] / t.durationMin
  const bez = (s: number) => [(1 - s) ** 2 * x1 + 2 * (1 - s) * s * cx + s * s * x2, (1 - s) ** 2 * y1 + 2 * (1 - s) * s * cy + s * s * y2]
  const [px, py] = bez(f)
  const [qx, qy] = bez(f + 0.01)
  const angle = (Math.atan2(qy - py, qx - px) * 180) / Math.PI
  const flown = Array.from({ length: 21 }, (_, i) => bez((f * i) / 20))
  const meal = profile.meals.find((m) => m.id === prefs.meal)?.name
  const stops = isSaved
    ? profile.id === "anil"
      ? [
          { at: 35, icon: Utensils, label: meal!, detail: "About 20:40" },
          { at: 110, icon: BellOff, label: prefs.dndAfterMeal ? "Do not disturb" : "Rest", detail: prefs.makeBed ? "Bed made up" : "Lights dimmed" },
          { at: 300, icon: Bell, label: "Wake-up tea", detail: prefs.wake },
        ]
      : [
          { at: 45, icon: Utensils, label: meal!, detail: "About 09:35" },
          { at: 205, icon: Bell, label: "Wake-up", detail: prefs.wake },
        ]
    : [{ at: 45, icon: Utensils, label: "Meal service", detail: "After take-off" }]
  return (
    <div className="absolute inset-0 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/black-marble-asia.jpg" alt="" className="absolute max-w-none" style={{ width: GLOBE.w, left: GLOBE.left, top: GLOBE.top }} />
      <div className="absolute inset-x-0 bottom-0 h-[300px] bg-[linear-gradient(0deg,rgba(0,0,0,.92)_35%,rgba(0,0,0,0))]" />
      <svg className="absolute inset-0" width={1920} height={1080}>
        <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" />
        <polyline points={flown.map((p) => p.join(",")).join(" ")} fill="none" stroke="white" strokeWidth={3} />
        {[
          [x1, y1, t.fromCity],
          [x2, y2, t.toCity],
        ].map(([x, y, n]) => (
          <g key={n as string}>
            <circle cx={x as number} cy={y as number} r={7} fill="white" />
            <circle cx={x as number} cy={y as number} r={15} fill="none" stroke="white" strokeOpacity={0.4} strokeWidth={2} />
            <text x={(x as number) + ((n === t.toCity) === west ? -26 : 26)} y={(y as number) + 8} textAnchor={(n === t.toCity) === west ? "end" : "start"} fill="white" fontSize={24} fontWeight={600} fontFamily="var(--font-sans)">
              {n}
            </text>
          </g>
        ))}
        <g transform={`translate(${px} ${py}) rotate(${angle + 45})`}>
          <circle r={26} fill="#0b0f10" fillOpacity={0.7} stroke="white" strokeOpacity={0.5} />
          <g transform="translate(-14 -14) scale(1.17)" fill="white" stroke="none">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </g>
        </g>
      </svg>
      <div className="absolute inset-x-0 top-[124px] flex flex-col items-center">
        <p className="text-[26px] text-white/70">Flying towards</p>
        <h1 className="mt-1 text-[120px] font-semibold leading-none tracking-[-0.02em]">{t.toCity}</h1>
        <div className="mt-6 flex items-center gap-4">
          <span className={cn("flex h-[48px] items-center gap-2 rounded-full px-6 text-[19px]", glass)}>
            <MapIcon className="size-5" strokeWidth={1.7} /> Explore map
          </span>
          <span className="text-[20px] text-white/60">
            {remaining(profileId)} to go · 38,000 ft · 905 km/h
          </span>
          <Sim dark className="text-[13px]">
            Flight data simulated
          </Sim>
        </div>
      </div>
      <div className="absolute bottom-[50px] left-[110px] right-[110px] flex items-center gap-10">
        <div className="w-[190px] shrink-0 text-[22px]">
          <p className="font-semibold">{t.fromCity}</p>
          <p className="text-[17px] text-white/60">Departed {t.dep}</p>
        </div>
        <div className="relative h-[2px] flex-1 bg-white/25">
          <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${f * 100}%` }} />
          <span className="absolute top-1/2 flex size-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black" style={{ left: `${f * 100}%` }}>
            <Plane className="size-5 rotate-45 fill-black" strokeWidth={0} />
          </span>
          {stops.map((s) => (
            <div key={s.label} className="absolute top-1/2 -translate-x-1/2" style={{ left: `${(s.at / t.durationMin) * 100}%` }}>
              <span className="absolute left-1/2 top-0 flex size-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-black">
                <s.icon className="size-4" strokeWidth={1.8} />
              </span>
              <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                <p className="text-[18px] font-semibold leading-6">{s.label}</p>
                <p className="text-[15px] leading-5 text-white/60">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="w-[190px] shrink-0 text-right text-[22px]">
          <p className="font-semibold">{t.toCity}</p>
          <p className="text-[17px] text-white/60">Arrives {t.arr} local</p>
        </div>
      </div>
    </div>
  )
}

function briefingFor(prefs: Prefs, saved: boolean) {
  if (!saved) return NEWS_SECTIONS.filter((s) => s.title !== "Osaka")
  return NEWS_SECTIONS.filter((s) => s.tag === "always" || prefs.interests.includes(s.tag as Interest) || (s.tag === "world-news" && prefs.interests.includes("business-news")))
}

function PageHead({ eyebrow, title, sim }: { eyebrow: string; title: string; sim?: string }) {
  return (
    <div className="flex flex-col items-center pt-[150px]">
      <p className="text-[24px] text-white/65">{eyebrow}</p>
      <h1 className="mt-1 text-[84px] font-semibold leading-none tracking-[-0.015em]">{title}</h1>
      {sim && (
        <Sim dark className="mt-4 text-[13px]">
          {sim}
        </Sim>
      )}
    </div>
  )
}

function TvNews() {
  const { prefs, isSaved } = useProfile()
  const sections = briefingFor(prefs, isSaved)
  const programmes = CATALOG.filter((c) => c.kind === "News")
  return (
    <div className="absolute inset-0">
      <Backdrop src="/media/hk-night.jpg" className="scale-110 blur-[14px]" overlay="bg-[#05090a]/78" />
      <div className="relative">
        <PageHead eyebrow="Downloaded at the gate, 19:10 Hong Kong time" title="Your briefing" sim="Sample headlines, simulated feed" />
        <div className="mx-auto mt-12 flex w-[1700px] gap-8">
          <div className={cn("flex-1 rounded-[18px] px-10 py-4", glass)}>
            {sections.map((s) => (
              <div key={s.title} className="flex gap-8 border-b border-white/10 py-5 last:border-0">
                <p className="w-[150px] shrink-0 text-[23px] font-semibold text-[#9fd3bf]">{s.title}</p>
                <ul className="flex flex-col gap-2">
                  {s.lines.map((l) => (
                    <li key={l} className="text-[23px] leading-8 text-white/90">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="w-[600px]">
            <p className="text-[24px] font-semibold">News programmes</p>
            <p className="text-[18px] text-white/55">Recorded before departure</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {programmes.map((p) => (
                <div key={p.id} className={cn("flex h-[150px] flex-col justify-between rounded-[14px] p-5", glass)}>
                  <span className="flex items-center gap-2 text-[16px] text-white/60">
                    <Newspaper className="size-5" strokeWidth={1.6} /> {p.meta.split(" · ")[0]}
                  </span>
                  <span className="text-[23px] font-semibold leading-7">{p.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TvSport() {
  const matches = CATALOG.filter((c) => c.kind === "Cricket")
  const films = CATALOG.filter((c) => c.tags.includes("cricket") && c.kind === "Film")
  return (
    <div className="absolute inset-0">
      <Backdrop src="/media/eden.jpg" className="scale-110 blur-[14px]" overlay="bg-[#05090a]/78" />
      <div className="relative">
        <PageHead eyebrow="Live and recorded" title="Cricket" />
        <div className="mx-auto mt-12 flex w-[1700px] gap-8">
          <div className={cn("w-[640px] shrink-0 rounded-[18px] p-8", glass)}>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-[6px] bg-[#c8102e] px-3 py-1 text-[16px] font-bold">
                <span className="size-2 rounded-full bg-white" /> LIVE
              </span>
              <span className="text-[19px] text-white/70">Sport24 · Eden Gardens</span>
              <Sim dark className="text-[13px]" />
            </div>
            {[
              ["Australia", "300/8", "50 ov"],
              ["India", "214/3", "38.2 ov"],
            ].map(([team, score, ov]) => (
              <div key={team} className="mt-5 flex items-baseline justify-between border-b border-white/12 pb-4">
                <span className="text-[34px] font-semibold">{team}</span>
                <span className="text-[34px] font-semibold">
                  {score} <span className="text-[19px] font-normal text-white/55">{ov}</span>
                </span>
              </div>
            ))}
            <p className="mt-4 text-[21px] text-white/75">India need 87 runs from 70 balls</p>
            <p className="mt-3 text-[19px] text-white/60">S. Gill 92* (88) · S. Iyer 41* (37) · M. Starc 1 for 39 in 7.2 overs</p>
            <button className="mt-7 flex h-[60px] items-center gap-3 rounded-[14px] bg-white px-8 text-[21px] font-semibold text-[#0b0f10]">
              <Play className="size-5 fill-current" /> Watch live
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[24px] font-semibold">Recorded matches</p>
            <div className="mt-4 grid grid-cols-2 gap-5">
              {matches.slice(0, 4).map((m) => (
                <div key={m.id} className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt="" className="h-[118px] w-[190px] shrink-0 rounded-[12px] object-cover" />
                  <div>
                    <p className="text-[20px] font-semibold leading-6">{m.title}</p>
                    <p className="mt-1 text-[16px] leading-5 text-white/60">{m.meta}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[24px] font-semibold">Cricket on film</p>
            <div className="mt-4 flex gap-4">
              {films.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f.id} src={f.img} alt={f.title} className="h-[150px] w-[100px] rounded-[10px] object-cover" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Arrival() {
  const { profile, prefs, isSaved, profileId, set, flown } = useProfile()
  useEffect(() => {
    if (!flown[profileId]) set({ flown: { ...flown, [profileId]: true } })
  }, [flown, profileId, set])
  const t = profile.trip
  const rc = profile.recap
  const fresh = BADGES.map((b) => ({ b, st: badgeState(profileId, b.id, isSaved, true, prefs) })).filter((x) => x.st.justEarned)
  const sum = statusSummary(profileId, isSaved, true, prefs)
  const setOnce = BADGES.find((b) => b.id === "set-once")!
  const setOnceSt = badgeState(profileId, "set-once", isSaved, true, prefs)
  const pin = fresh[0]
  return (
    <div className="absolute inset-0">
      <Backdrop src={profile.id === "anil" ? "/media/delhi.jpg" : "/media/osaka.jpg"} overlay="bg-[#05090a]/72" />
      <div className="relative flex h-full flex-col items-center pt-[96px]">
        <Brushwing white className="w-[60px]" />
        <p className="mt-8 text-[26px] text-white/70">
          {t.flight} · Local time {t.arr}
        </p>
        <h1 className="mt-2 text-[100px] font-semibold leading-none tracking-[-0.02em]">Welcome to {t.toCity}</h1>
        <div className="mt-8 flex gap-14 text-center">
          {[
            ["Flown", `${t.distanceKm.toLocaleString()} km`],
            ["Slept", rc.slept],
            ["Watched", rc.watched[0].time],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[40px] font-semibold leading-none">{v}</p>
              <p className="mt-2 text-[19px] text-white/60">{k}</p>
            </div>
          ))}
        </div>
        <div className={cn("mt-12 flex w-[1060px] items-center gap-10 rounded-[22px] px-12 py-9", glass)}>
          {pin ? (
            <BadgeArt art={pin.b.art} metal={pin.b.metal} size={230} animate />
          ) : (
            <PinWithProgress art={setOnce.art} metal={setOnce.metal} earned={false} progress={setOnceSt.progress} size={200} ring="rgba(255,255,255,.18)" />
          )}
          <div className="flex-1">
            {pin ? (
              <>
                <p className="rise text-[21px] font-semibold text-[#9fd3bf]" style={{ animationDelay: "500ms" }}>
                  Pin unlocked on {t.flight}
                </p>
                <p className="rise mt-1 text-[52px] font-semibold leading-tight" style={{ animationDelay: "650ms" }}>
                  {pin.b.name}
                </p>
                <p className="rise mt-1 text-[22px] text-white/70" style={{ animationDelay: "750ms" }}>
                  {METAL_LABEL[pin.b.metal]} pin · {pin.b.rule}
                </p>
                {fresh.length > 1 && (
                  <div className="rise mt-5 flex items-center gap-3" style={{ animationDelay: "950ms" }}>
                    {fresh.slice(1).map(({ b }) => (
                      <BadgeArt key={b.id} art={b.art} metal={b.metal} size={56} />
                    ))}
                    <span className="text-[22px] text-white/80">
                      Plus {fresh.slice(1).map(({ b }) => b.name).join(" and ")} · +{fresh.reduce((n, x) => n + METAL_BONUS[x.b.metal], 0)} points tonight
                    </span>
                  </div>
                )}
                <div className="rise mt-5 flex items-center gap-3" style={{ animationDelay: "1250ms" }}>
                  <span className="text-[26px] font-semibold">
                    {sum.promoted ? `You are now ${sum.tier}. ${sum.total.toLocaleString()} status points.` : `+${METAL_BONUS[pin.b.metal]} status points towards ${sum.next.name}`}
                  </span>
                  <Sim dark className="text-[13px]" />
                </div>
              </>
            ) : (
              <>
                <p className="text-[21px] font-semibold text-[#9fd3bf]">Pin progress</p>
                <p className="mt-1 text-[52px] font-semibold leading-tight">{setOnce.name}</p>
                <p className="mt-1 text-[22px] text-white/70">{setOnceSt.label} on a saved profile</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="text-[24px]">
                    Earns +{METAL_BONUS[setOnce.metal]} status points towards {sum.next.name}
                  </span>
                  <Sim dark className="text-[13px]" />
                </div>
              </>
            )}
            <button
              data-demo="tv-to-badge"
              onClick={() => set({ view: "phone", phone: "badge", badgeId: pin ? pin.b.id : "set-once", badgeFrom: "pins" })}
              className="mt-7 flex h-[56px] items-center rounded-[14px] border border-white/30 px-7 text-[20px]"
            >
              Open in the Cathay app
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
