"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { BADGES, METAL_BONUS, PROFILES, TIERS, type Prefs, type ProfileId } from "./data"

export type View = "phone" | "tv" | "cathay" | "pitch" | "crew"
export type PhoneScreen = "home" | "offers" | "setup" | "saved" | "recap" | "profile" | "pins" | "badge" | "tiers" | "card" | "data" | "shop" | "confirm" | "airport" | "lounge" | "family" | "debrief" | "route" | "assistant" | "survey"
export type TvScreen = "idle" | "welcome" | "home" | "map" | "news" | "sport" | "arrival" | "service"

type State = {
  profileId: ProfileId
  view: View
  phone: PhoneScreen
  setupStep: number
  tv: TvScreen
  badgeId: string
  badgeFrom: PhoneScreen
  prefs: Record<ProfileId, Prefs>
  saved: Record<ProfileId, boolean>
  flown: Record<ProfileId, boolean>
  slide: number
  pipeStep: number
  idea: 0 | 2 | 3
  skipZoom: boolean
  /** The flat 2D push-in used by the earlier recordings; the default is the 3D cabin. */
  flatZoom: boolean
  zoomAt: number
  /** Set while the seat screen plays the "same seat, different passenger" handover. */
  switching: { from: ProfileId; to: ProfileId; at: number } | null
}

/** The profile flips at SWITCH_FLIP_MS; the overlay clears at SWITCH_MS. */
export const SWITCH_FLIP_MS = 1500
export const SWITCH_MS = 3000

const KEY = "cx-flight-profile-demo-v3"

/** Entering the TV view from anywhere else plays the seat push-in, unless skipped. */
function withZoom(prev: State | null, next: State): State {
  const entering = next.view === "tv" && (!prev || prev.view !== "tv")
  return { ...next, zoomAt: entering && !next.skipZoom ? Date.now() : prev && next.view === "tv" ? next.zoomAt : 0 }
}

function initial(): State {
  return {
    profileId: "anil",
    view: "phone",
    phone: "home",
    setupStep: 0,
    tv: "idle",
    badgeId: "night-shift",
    badgeFrom: "pins",
    prefs: { anil: structuredClone(PROFILES.anil.defaults), chloe: structuredClone(PROFILES.chloe.defaults) },
    saved: { anil: false, chloe: true },
    flown: { anil: false, chloe: false },
    slide: 0,
    pipeStep: 1,
    idea: 0,
    skipZoom: false,
    flatZoom: false,
    zoomAt: 0,
    switching: null,
  }
}

type Ctx = State & {
  bare: boolean
  ready: boolean
  set: (patch: Partial<State>) => void
  setPrefs: (patch: Partial<Prefs>) => void
  switchProfile: (to?: ProfileId, tv?: TvScreen) => void
  reset: () => void
}

const DemoContext = createContext<Ctx | null>(null)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial)
  const [bare, setBare] = useState(false)
  const [ready, setReady] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- state is restored from localStorage and the URL after mount */
  useEffect(() => {
    let next = initial()
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) next = { ...next, ...JSON.parse(raw) }
    } catch {}
    const q = new URLSearchParams(window.location.search)
    if (q.has("fresh")) next = initial()
    const profile = q.get("profile")
    if (profile === "anil" || profile === "chloe") next.profileId = profile
    const view = q.get("view")
    if (view === "phone" || view === "tv" || view === "cathay" || view === "pitch" || view === "crew") next.view = view
    const slide = q.get("slide")
    if (slide) next.slide = Number(slide)
    const pstep = q.get("pstep")
    if (pstep) next.pipeStep = Number(pstep)
    const phone = q.get("phone") as PhoneScreen | null
    if (phone) next.phone = phone
    const step = q.get("step")
    if (step) next.setupStep = Number(step)
    const tv = q.get("tv") as TvScreen | null
    if (tv) next.tv = tv
    const badge = q.get("badge")
    if (badge) next.badgeId = badge
    if (q.get("saved") === "1") next.saved = { anil: true, chloe: true }
    if (q.get("saved") === "0") next.saved = { anil: false, chloe: false }
    if (q.get("flown") === "1") next.flown = { anil: true, chloe: true }
    if (q.get("zoom") === "0") next.skipZoom = true
    if (q.get("zoom") === "1" || q.get("zoom") === "flat") next.skipZoom = false
    if (q.has("zoom")) next.flatZoom = q.get("zoom") === "flat"
    if (q.get("idea") === "2") next.idea = 2
    if (q.get("idea") === "3") next.idea = 3
    if (q.get("bare") === "1") setBare(true)
    if (q.get("blank") === "1")
      next.prefs.anil = { ...next.prefs.anil, meal: "", mealTiming: "", dndAfterMeal: false, makeBed: false, wake: "Don't wake me" }
    next.switching = null
    setState(withZoom(null, next))
    setReady(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state))
  }, [state, ready])

  const switchProfile = useCallback((to?: ProfileId, tv: TvScreen = "welcome") => {
    setState((s) => {
      const target = to ?? (s.profileId === "anil" ? "chloe" : "anil")
      if (target === s.profileId || s.switching) return s
      if (s.view !== "tv" || s.zoomAt) return { ...s, profileId: target }
      const at = Date.now()
      setTimeout(() => setState((x) => (x.switching?.at === at ? { ...x, profileId: target, tv } : x)), SWITCH_FLIP_MS)
      setTimeout(() => setState((x) => (x.switching?.at === at ? { ...x, switching: null } : x)), SWITCH_MS)
      return { ...s, switching: { from: s.profileId, to: target, at } }
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return
      if (e.key === "1") setState((s) => withZoom(s, { ...s, view: "phone" }))
      if (e.key === "2") setState((s) => withZoom(s, { ...s, view: "tv" }))
      if (e.key === "3") setState((s) => withZoom(s, { ...s, view: "cathay" }))
      if (e.key === "4") setState((s) => withZoom(s, { ...s, view: "pitch" }))
      if (e.key === "p") switchProfile()
      if (e.key === "P") switchProfile(undefined, "home")
      if (e.key === "h") setBare((b) => !b)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [switchProfile])

  const set = useCallback((patch: Partial<State>) => setState((s) => withZoom(s, { ...s, ...patch })), [])
  const setPrefs = useCallback(
    (patch: Partial<Prefs>) =>
      setState((s) => ({ ...s, prefs: { ...s.prefs, [s.profileId]: { ...s.prefs[s.profileId], ...patch } } })),
    [],
  )
  const reset = useCallback(() => {
    localStorage.removeItem(KEY)
    setState(initial())
  }, [])

  const value = useMemo(() => ({ ...state, bare, ready, set, setPrefs, switchProfile, reset }), [state, bare, ready, set, setPrefs, switchProfile, reset])
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error("useDemo outside DemoProvider")
  return ctx
}

export function useProfile() {
  const d = useDemo()
  return { ...d, profile: PROFILES[d.profileId], prefs: d.prefs[d.profileId], isSaved: d.saved[d.profileId], hasFlown: d.flown[d.profileId] }
}

export type BadgeState = {
  earned: boolean
  progress: number
  label: string
  earnedOn?: string
  level?: string
  justEarned: boolean
  value: number
  thisYear: boolean
  note?: string
  left?: string
  stats: string[]
}

export function badgeState(profileId: ProfileId, badgeId: string, saved: boolean, flown: boolean, prefs: Prefs): BadgeState {
  const badge = BADGES.find((b) => b.id === badgeId)!
  const p = PROFILES[profileId].badgeProgress[badgeId] ?? { value: 0 }
  let value = p.value
  if (flown && saved && badgeId === "set-once") value += 1
  if (flown && prefs.dndAfterMeal && badgeId === "lights-out" && profileId === "anil") value += 1
  if (flown && badgeId === "night-shift" && profileId === "anil") value += 1
  const before = p.value >= badge.goal
  const earned = value >= badge.goal
  const progress = Math.min(1, value / badge.goal)
  const label =
    badge.goal === 1
      ? earned
        ? "Earned"
        : progress < 0.01
          ? "Not yet"
          : `${Math.round(progress * 1000) / 10}% of the way`
      : `${Math.min(value, badge.goal)} of ${badge.goal}${badge.unit ? ` ${badge.unit}` : ""}`
  return {
    earned,
    progress,
    label,
    earnedOn: earned ? (p.earnedOn ?? `On ${PROFILES[profileId].trip.flight}`) : undefined,
    level: p.level,
    justEarned: earned && !before,
    value,
    thisYear: !!p.thisYear || (earned && !before),
    note: earned && !before ? undefined : p.note,
    left: p.left,
    stats: p.stats ?? [],
  }
}

export function statusSummary(profileId: ProfileId, saved: boolean, flown: boolean, prefs: Prefs) {
  const profile = PROFILES[profileId]
  const pins = BADGES.map((b) => ({ b, st: badgeState(profileId, b.id, saved, flown, prefs) }))
  const pinPoints = pins.filter((x) => x.st.earned && x.st.thisYear).reduce((n, x) => n + METAL_BONUS[x.b.metal], 0)
  const total = profile.flightPoints + pinPoints
  const start = TIERS.findIndex((t) => t.name === profile.tier)
  let idx = start
  while (idx + 1 < TIERS.length && total >= TIERS[idx + 1].points) idx++
  const current = TIERS[idx]
  /** At the top tier the bar stays pinned to it, so `next` is the current tier. */
  const next = TIERS[Math.min(idx + 1, TIERS.length - 1)]
  const promoted = idx > start
  return {
    pins,
    earnedCount: pins.filter((x) => x.st.earned).length,
    flightPoints: profile.flightPoints,
    pinPoints,
    total,
    tier: current.name,
    previous: TIERS[start],
    promoted,
    top: idx === TIERS.length - 1,
    current,
    next,
    toNext: Math.max(0, next.points - total),
    progress: next === current ? 1 : Math.min(1, (total - current.points) / (next.points - current.points)),
  }
}
