"use client"

import { useEffect, useRef, useState } from "react"
import { useProfile } from "@/lib/store"
import { Brushwing } from "./shared"
import { TvScreenView } from "./tv"

/**
 * Photo push-in onto the seat screen. Photo: "Cathay Pacific 77W business class seat" by Sunnya343,
 * Wikimedia Commons, CC BY-SA 3.0, graded and split into depth layers by scripts/prep-cabin.py.
 * World units are source pixels of the 3264×2448 photo.
 */
const W = 3264
const H = 2448
/** Screen glass corners in the photo: top-left, top-right, bottom-right, bottom-left. */
const GLASS: [number, number][] = [
  [2105, 240],
  [2750, 460],
  [2650, 990],
  [2055, 700],
]
const FOCUS: [number, number] = [2405, 600]

const K0 = 1920 / W
const K1 = 1.85
const START: [number, number] = [FOCUS[0] * K0, (FOCUS[1] - 150) * K0]
const END: [number, number] = [960, 540]
const R = K1 / K0
/** Stage point that stays fixed while the camera pushes, chosen so the screen lands centre frame. */
const PIVOT: [number, number] = [(END[0] - R * START[0]) / (1 - R), (END[1] - R * START[1]) / (1 - R)]
const PIVOT_SRC: [number, number] = [FOCUS[0] - (START[0] - PIVOT[0]) / K0, FOCUS[1] - (START[1] - PIVOT[1]) / K0]

const DRIFT = 1.035
const PUSH_MS = 3300
const MORPH_MS = 1000
const HOLD_TITLE = 3200
const HOLD_PLAIN = 200
/** Total length with and without the title hold. */
export const photoZoomMs = (title: boolean) => (title ? HOLD_TITLE : HOLD_PLAIN) + PUSH_MS + MORPH_MS + 150

function quadMatrix(w: number, h: number, q: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const hh = (dx1 * dy3 - dx3 * dy1) / den
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + hh * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + hh * y3
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1].join(",")})`
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

function layerTransform(k: number) {
  return `translate(${(PIVOT[0] - PIVOT_SRC[0] * k).toFixed(2)}px, ${(PIVOT[1] - PIVOT_SRC[1] * k).toFixed(2)}px) scale(${k.toFixed(5)})`
}

/** Camera scale of the screen layer at time t, and the push progress. */
function camera(t: number, hold: number) {
  const drift = 1 + (DRIFT - 1) * Math.min(1, t / Math.max(hold, 1))
  const p = ease(Math.min(1, Math.max(0, (t - hold) / PUSH_MS)))
  return { k: K0 * drift * Math.pow(K1 / (K0 * DRIFT), p), p }
}

function frames(hold: number, total: number, depth: number, blur?: (p: number) => number) {
  const out: Keyframe[] = []
  const n = 72
  for (let i = 0; i <= n; i++) {
    const offset = i / n
    const { k: kScreen, p } = camera(offset * total, hold)
    const k = K0 * Math.pow(kScreen / K0, depth)
    const f: Keyframe = { offset, transform: layerTransform(k) }
    if (blur) f.filter = `blur(${blur(p).toFixed(2)}px)`
    out.push(f)
  }
  return out
}

const glassAt = (k: number) => GLASS.map(([x, y]) => [PIVOT[0] + (x - PIVOT_SRC[0]) * k, PIVOT[1] + (y - PIVOT_SRC[1]) * k] as [number, number])
const IDENTITY = "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)"

/**
 * The live screen is drawn at full resolution and warped straight onto the glass in stage space, rather than
 * inside the photo layer, so it stays sharp as the camera closes in and flattens without a crossfade.
 * Dense keyframes keep the interpolated matrix on the glass between samples.
 */
function screenFrames(hold: number, total: number) {
  const out: Keyframe[] = []
  const pushEnd = hold + PUSH_MS
  const n = 160
  for (let i = 0; i <= n; i++) {
    const t = (pushEnd * i) / n
    out.push({ offset: t / total, transform: quadMatrix(1920, 1080, glassAt(camera(t, hold).k)), filter: "brightness(1.12) contrast(1.04)", easing: i === n ? "cubic-bezier(.45,0,.15,1)" : "linear" })
  }
  out.push({ offset: (pushEnd + MORPH_MS) / total, transform: IDENTITY, filter: "brightness(1) contrast(1)" })
  out.push({ offset: 1, transform: IDENTITY, filter: "brightness(1) contrast(1)" })
  return out
}

export function SeatZoomPhoto() {
  const { set, profile } = useProfile()
  const back = useRef<HTMLDivElement>(null)
  const fg = useRef<HTMLDivElement>(null)
  const fgFade = useRef<HTMLDivElement>(null)
  const vignette = useRef<HTMLDivElement>(null)
  const glare = useRef<HTMLDivElement>(null)
  const flat = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search)
  const withTitle = q.get("intro") === "1"
  const hold = withTitle ? HOLD_TITLE : HOLD_PLAIN
  const total = photoZoomMs(withTitle)

  useEffect(() => {
    let live = true
    Promise.all(["/media/cabin/back.jpg", "/media/cabin/fg.webp"].map((src) => Object.assign(new Image(), { src }).decode().catch(() => {}))).then(() => live && setReady(true))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const still = new URLSearchParams(window.location.search).has("zoomstill")
    const t = still ? undefined : setTimeout(() => set({ zoomAt: 0 }), total)
    const opts = { duration: total, fill: "both" as const }
    const swap = (hold + PUSH_MS) / total
    const landed = (hold + PUSH_MS + MORPH_MS) / total
    const fadeAway = [{ opacity: 1 }, { opacity: 1, offset: swap }, { opacity: 0, offset: swap + (landed - swap) * 0.7 }, { opacity: 0 }]
    const anims = [
      back.current?.animate(frames(hold, total, 1), opts),
      fg.current?.animate(frames(hold, total, 1.32, (p) => 1.2 + 18 * p), opts),
      fgFade.current?.animate(fadeAway, opts),
      vignette.current?.animate(fadeAway, opts),
      glare.current?.animate(fadeAway, opts),
      flat.current?.animate(screenFrames(hold, total), opts),
      shade.current?.animate([{ opacity: withTitle ? 1 : 0 }, { opacity: withTitle ? 1 : 0, offset: (hold - 700) / total }, { opacity: 0, offset: (hold + 300) / total }, { opacity: 0 }], opts),
      title.current?.animate(
        [{ opacity: 1 }, { opacity: 1, offset: Math.max(0, (hold - 650) / total) }, { opacity: 0, transform: "translateY(-12px)", offset: Math.min(1, (hold + 50) / total) }, { opacity: 0 }],
        opts,
      ),
    ]
    return () => {
      clearTimeout(t)
      anims.forEach((a) => a?.cancel())
    }
  }, [ready, set, hold, total, withTitle])

  const k0 = layerTransform(K0)
  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden bg-[#141110]" data-demo="seat-zoom" data-ready={ready ? "1" : "0"}>
      <div ref={back} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: k0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/cabin/back.jpg" alt="" width={W} height={H} className="absolute inset-0 max-w-none" />
      </div>
      <div ref={flat} className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden" style={{ transform: quadMatrix(1920, 1080, glassAt(K0)), filter: "brightness(1.12) contrast(1.04)" }}>
        <div className="pointer-events-none">
          <TvScreenView />
        </div>
        <div ref={glare} className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.10)_0%,rgba(255,255,255,.02)_38%,transparent_55%)]" />
      </div>
      <div ref={fgFade} className="absolute inset-0">
        <div ref={fg} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: k0, filter: "blur(1.2px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/cabin/fg.webp" alt="" width={W} height={H} className="absolute inset-0 max-w-none" />
        </div>
      </div>
      <div ref={vignette} className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_62%_40%,transparent_45%,rgba(20,12,6,.42)_100%)]" />
      <div ref={shade} className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,8,6,.78)_0%,rgba(10,8,6,.5)_42%,transparent_70%)]" style={{ opacity: withTitle ? 1 : 0 }} />
      {withTitle && (
        <div ref={title} className="absolute left-[120px] top-1/2 -translate-y-1/2 text-white">
          <Brushwing white className="rise w-[64px]" />
          {[`${profile.formal}.`, `${profile.tier} member.`, `${profile.trip.fromCity} to ${profile.trip.toCity}, every week.`].map((line, i) => (
            <p key={line} className={i === 0 ? "rise mt-10 text-[96px] font-semibold leading-[1.02] tracking-[-0.02em]" : "rise mt-3 text-[52px] leading-[1.15] text-white/85"} style={{ animationDelay: `${250 + i * 380}ms` }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
