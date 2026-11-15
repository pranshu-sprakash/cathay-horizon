"use client"

import { useEffect, useRef } from "react"
import { useProfile } from "@/lib/store"
import { TvScreenView } from "./tv"

/** Screen rectangle inside the 1920×1080 cabin frame. 16:9, so the push-in lands exactly on the full TV. */
const SCREEN = { x: 768, y: 352, w: 384, h: 216 }
const SCALE = 1920 / SCREEN.w
const CX = SCREEN.x + SCREEN.w / 2
const CY = SCREEN.y + SCREEN.h / 2
export const ZOOM_MS = 2000

export function SeatZoom() {
  const { set, profile } = useProfile()
  const push = useRef<HTMLDivElement>(null)
  const glare = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = setTimeout(() => set({ zoomAt: 0 }), ZOOM_MS)
    const opts = { duration: ZOOM_MS - 100, fill: "both" as const }
    const a = push.current?.animate(
      [
        { transform: "none", offset: 0 },
        { transform: "none", offset: 0.24 },
        { transform: `translate(${960 - CX}px, ${540 - CY}px) scale(${SCALE})` },
      ],
      { ...opts, easing: "cubic-bezier(0.6, 0.04, 0.28, 1)" },
    )
    const g = glare.current?.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { ...opts, easing: "ease-in" })
    return () => {
      clearTimeout(t)
      a?.cancel()
      g?.cancel()
    }
  }, [set])
  const seat = profile.trip.seat
  const neighbour = `${Number.parseInt(seat)}${profile.trip.cabin === "Business" ? "D" : "H"}`
  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden bg-[#1a1714]" data-demo="seat-zoom">
      <div ref={push} className="absolute inset-0" style={{ transformOrigin: `${CX}px ${CY}px` }}>
        <CabinArt seat={seat} neighbour={neighbour} />
        <div className="absolute overflow-hidden bg-black" style={{ left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h }}>
          <div className="pointer-events-none origin-top-left will-change-transform" style={{ width: 1920, height: 1080, transform: `scale(${SCREEN.w / 1920})` }}>
            <TvScreenView />
          </div>
          <div ref={glare} className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,.12)_0%,rgba(255,255,255,.04)_38%,rgba(255,255,255,0)_39%)]" />
        </div>
      </div>
    </div>
  )
}

const STITCH = { fill: "none", stroke: "#b9ab97", strokeWidth: 1.5, strokeDasharray: "5 6" }

function CabinArt({ seat, neighbour }: { seat: string; neighbour: string }) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" className="absolute inset-0">
      <defs>
        <linearGradient id="cabin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe6d8" />
          <stop offset="0.6" stopColor="#d8c9b3" />
          <stop offset="1" stopColor="#b09c80" />
        </linearGradient>
        <linearGradient id="sidewall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9b89f" />
          <stop offset="1" stopColor="#e6dbca" />
        </linearGradient>
        <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3ece1" />
          <stop offset="0.55" stopColor="#e3d8c8" />
          <stop offset="1" stopColor="#c8b9a3" />
        </linearGradient>
        <linearGradient id="shellShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8977f" stopOpacity="0.55" />
          <stop offset="0.12" stopColor="#a8977f" stopOpacity="0" />
          <stop offset="0.88" stopColor="#a8977f" stopOpacity="0" />
          <stop offset="1" stopColor="#a8977f" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c5c57" />
          <stop offset="1" stopColor="#33403c" />
        </linearGradient>
        <linearGradient id="walnut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b4a33" />
          <stop offset="0.5" stopColor="#523826" />
          <stop offset="1" stopColor="#3d2a1d" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3a55" />
          <stop offset="0.6" stopColor="#7a7686" />
          <stop offset="1" stopColor="#d9a26c" />
        </linearGradient>
        <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a5a4b" />
          <stop offset="1" stopColor="#4a3e33" />
        </linearGradient>
        <radialGradient id="lamp" cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#fff3dc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff3dc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vig" cx="0.5" cy="0.42" r="0.8">
          <stop offset="0.5" stopColor="#1a120b" stopOpacity="0" />
          <stop offset="1" stopColor="#1a120b" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      {/* Cabin shell, ceiling and overhead lighting */}
      <rect width="1920" height="1080" fill="url(#cabin)" />
      <path d="M 0 0 L 1920 0 L 1920 70 Q 960 120 0 70 Z" fill="#f6efe4" />
      <path d="M 0 70 Q 960 120 1920 70" fill="none" stroke="#fff6e6" strokeWidth="6" opacity="0.9" />
      <ellipse cx="960" cy="90" rx="900" ry="140" fill="url(#lamp)" />

      {/* Left sidewall with windows */}
      <path d="M 0 60 Q 260 90 380 200 L 430 1080 L 0 1080 Z" fill="url(#sidewall)" />
      <path d="M 0 60 Q 260 90 380 200" fill="none" stroke="#bfae94" strokeWidth="3" />
      {[
        { x: 120, y: 300 },
        { x: -70, y: 290 },
      ].map((w) => (
        <g key={w.x} transform={`translate(${w.x} ${w.y})`}>
          <rect width="150" height="220" rx="70" fill="#f1e9dd" />
          <rect x="18" y="18" width="114" height="184" rx="56" fill="url(#sky)" />
          <rect x="18" y="18" width="114" height="70" rx="56" fill="#e2d6c5" />
        </g>
      ))}

      {/* Neighbouring seat, cropped at the right edge */}
      <g>
        <path d="M 1500 1080 L 1490 260 Q 1490 180 1570 180 L 1960 180 L 1960 1080 Z" fill="url(#shell)" />
        <path d="M 1500 1080 L 1490 260 Q 1490 180 1570 180 L 1960 180 L 1960 1080 Z" fill="url(#shellShade)" />
        <rect x="1590" y="200" width="330" height="140" rx="44" fill="url(#fabric)" />
        <rect x="1572" y="384" width="360" height="226" rx="16" fill="url(#walnut)" />
        <rect x="1588" y="400" width="340" height="194" rx="6" fill="#0c0e0f" />
        <text x="1620" y="470" fill="#e9e3da" fontSize="40" fontWeight="300" fontFamily="var(--font-sans)">
          {neighbour}
        </text>
        <rect x="1600" y="650" width="320" height="150" rx="14" fill="#d6cab8" />
      </g>

      {/* Floor */}
      <path d="M 430 1080 L 440 960 L 1490 960 L 1500 1080 Z" fill="url(#carpet)" />

      {/* Seat 11A: shell, headrest and seat back */}
      <path d="M 570 1080 L 560 210 Q 560 120 650 120 L 1270 120 Q 1360 120 1360 210 L 1350 1080 Z" fill="url(#shell)" />
      <path d="M 570 1080 L 560 210 Q 560 120 650 120 L 1270 120 Q 1360 120 1360 210 L 1350 1080 Z" fill="url(#shellShade)" />
      <path d="M 592 1080 L 584 214 Q 584 146 652 146 L 1268 146 Q 1336 146 1336 214 L 1328 1080" {...STITCH} />
      <rect x="730" y="150" width="460" height="150" rx="56" fill="url(#fabric)" />
      <path d="M 760 186 Q 960 168 1160 186" fill="none" stroke="#6a7a74" strokeWidth="2" opacity="0.6" />
      <rect x="900" y="276" width="120" height="8" rx="4" fill="#2a3431" opacity="0.5" />
      <rect x="1216" y="168" width="96" height="40" rx="8" fill="#3a2b20" />
      <text x="1264" y="196" textAnchor="middle" fill="#efe6d8" fontSize="22" fontWeight="600" fontFamily="var(--font-sans)">
        {seat}
      </text>

      {/* Screen surround */}
      <rect x="738" y="322" width="444" height="276" rx="22" fill="url(#walnut)" />
      <rect x="760" y="344" width="400" height="232" rx="8" fill="#070808" />

      {/* Stowed tray table and handset */}
      <rect x="770" y="640" width="380" height="190" rx="18" fill="#e9dfd0" />
      <rect x="770" y="640" width="380" height="190" rx="18" fill="none" stroke="#c7b8a2" strokeWidth="3" />
      <rect x="930" y="652" width="60" height="14" rx="7" fill="#8b7a64" />
      <rect x="1206" y="660" width="54" height="104" rx="12" fill="#3a2b20" />
      <rect x="1216" y="672" width="34" height="26" rx="4" fill="#15181a" />

      {/* Foreground armrest and side console (walnut top) */}
      <path d="M 0 860 Q 0 820 50 820 L 470 820 Q 520 820 530 860 L 560 1080 L 0 1080 Z" fill="#d7c9b4" />
      <path d="M 0 830 Q 0 800 40 800 L 480 800 Q 520 800 526 834 L 530 858 L 0 858 Z" fill="url(#walnut)" />
      <path d="M 20 812 L 500 812" stroke="#8a6748" strokeWidth="2" opacity="0.6" />
      <rect x="360" y="770" width="90" height="36" rx="10" fill="#efe6d8" />
      <rect x="1380" y="870" width="560" height="210" rx="30" fill="#d3c5af" />
      <path d="M 1380 900 Q 1380 860 1420 860 L 1960 860 L 1960 900 Z" fill="url(#walnut)" />

      <rect width="1920" height="1080" fill="url(#vig)" />
    </svg>
  )
}
