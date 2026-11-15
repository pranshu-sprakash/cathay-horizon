"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import type { BadgeArtId, Metal } from "@/lib/data"

type Palette = { hi: string; mid: string; lo: string; field: string; fieldHi: string; ink: string }

const METALS: Record<Metal, Palette> = {
  jade: { hi: "#c4e4dc", mid: "#2f8a80", lo: "#003c3b", field: "#ece8dc", fieldHi: "#faf8f2", ink: "#006564" },
  bronze: { hi: "#f2cfa6", mid: "#b47a4a", lo: "#5f3818", field: "#0b4a47", fieldHi: "#15615c", ink: "#f2cfa6" },
  silver: { hi: "#ffffff", mid: "#b9c2c7", lo: "#5f6a71", field: "#10323a", fieldHi: "#1b4650", ink: "#eef3f5" },
  gold: { hi: "#fdebb2", mid: "#cfa64e", lo: "#6f4f15", field: "#141f1e", fieldHi: "#22302e", ink: "#f4d98c" },
  diamond: { hi: "#ffffff", mid: "#cfe2ea", lo: "#62808c", field: "#0b1620", fieldHi: "#1c2c39", ink: "#e8f6fb" },
}

function poly(n: number, r: number, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const
  })
}
const pts = (p: readonly (readonly [number, number])[]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")

function rosette(points: number, ro: number, ri: number) {
  return pts(
    Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 === 0 ? ro : ri
      const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2
      return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const
    }),
  )
}

function shieldPath(s: number) {
  const w = 82 * s
  const top = 100 - 90 * s
  return `M ${100 - w} ${top + 16 * s} Q 100 ${top - 8 * s} ${100 + w} ${top + 16 * s} L ${100 + w} ${100 + 8 * s} Q ${100 + w} ${100 + 60 * s} 100 ${100 + 92 * s} Q ${100 - w} ${100 + 60 * s} ${100 - w} ${100 + 8 * s} Z`
}

function Outline({ metal, s, ...rest }: { metal: Metal; s: number } & React.SVGProps<SVGPathElement>) {
  const r = 90 * s
  let d: string
  if (metal === "bronze") d = `M ${100 - r} 100 A ${r} ${r} 0 1 0 ${100 + r} 100 A ${r} ${r} 0 1 0 ${100 - r} 100 Z`
  else if (metal === "silver") d = `M ${pts(poly(8, r / Math.cos(Math.PI / 8), Math.PI / 8)).replace(/ /g, " L ")} Z`
  else if (metal === "gold") d = `M ${rosette(18, r * 1.02, r * 0.93).replace(/ /g, " L ")} Z`
  else if (metal === "diamond") d = `M ${pts(poly(10, r * 1.02, -Math.PI / 2)).replace(/ /g, " L ")} Z`
  else d = shieldPath(s)
  return <path d={d} strokeLinejoin="round" {...rest} />
}

const S = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const

function MiniPlane({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      d="M 0 -7 L 1.6 -2 L 8 1.5 L 8 3 L 1.6 1.4 L 1.2 5.2 L 3.2 6.6 L 3.2 7.6 L 0 6.8 L -3.2 7.6 L -3.2 6.6 L -1.2 5.2 L -1.6 1.4 L -8 3 L -8 1.5 L -1.6 -2 Z"
      fill="currentColor"
    />
  )
}

function Art({ id }: { id: BadgeArtId }) {
  switch (id) {
    case "betsy":
      return (
        <g>
          <path {...S} d="M 10 50 C 13 45, 22 43, 34 43 L 74 44 C 82 44, 88 46, 93 50 C 88 53, 82 55, 74 55 L 34 56 C 22 56, 13 55, 10 50 Z" />
          <path {...S} d="M 12 48 L 7 30 L 15 30 L 25 44" />
          <path {...S} strokeWidth={2.4} d="M 4 51 L 22 51" />
          <path {...S} strokeWidth={2.2} d="M 81 46.5 L 88 48" />
          {[40, 47, 54, 61, 68].map((x) => (
            <circle key={x} cx={x} cy={48} r={1.5} fill="currentColor" />
          ))}
          <rect x={56} y={52} width={14} height={6} rx={3} fill="currentColor" />
          <path {...S} strokeWidth={2} d="M 73 46 L 73 64" />
          <path {...S} strokeWidth={2.4} d="M 62 58 L 60 66" />
          <circle cx={60} cy={69} r={3.5} {...S} strokeWidth={2.4} />
          <circle cx={14} cy={56} r={1.8} fill="currentColor" />
          <text x={50} y={88} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing={2.5} fill="currentColor" fontFamily="var(--font-sans)">
            1946
          </text>
        </g>
      )
    case "stamp":
      return (
        <g transform="rotate(-10 50 50)">
          <rect x={16} y={24} width={68} height={52} rx={7} {...S} />
          <rect x={22} y={30} width={56} height={40} rx={3} {...S} strokeWidth={1.4} strokeDasharray="3 3" />
          <MiniPlane x={50} y={44} r={45} s={1.1} />
          <text x={50} y={64} textAnchor="middle" fontSize={8.5} fontWeight={700} letterSpacing={1.6} fill="currentColor" fontFamily="var(--font-sans)">
            ARRIVED
          </text>
        </g>
      )
    case "brushwing":
      return (
        <g>
          <path d="M 12 24 C 34 28, 62 44, 90 68 C 72 59, 54 57, 36 62 C 47 55, 58 52, 67 52 C 52 41, 31 31, 12 24 Z" fill="currentColor" />
          <path d="M 13 27 C 28 31, 42 37, 55 45" fill="none" stroke="currentColor" strokeWidth={0.9} opacity={0.6} />
          <path d="M 14 30 C 27 34, 39 39, 50 46" fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.45} />
        </g>
      )
    case "window-moon":
      return (
        <g>
          <rect x={29} y={14} width={42} height={70} rx={21} {...S} />
          <rect x={35} y={20} width={30} height={58} rx={15} {...S} strokeWidth={1.3} />
          <path d="M 57 32 A 11 11 0 1 0 57 56 A 8.5 8.5 0 1 1 57 32 Z" fill="currentColor" />
          {[
            [43, 28],
            [47, 60],
            [59, 64],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={1.3} fill="currentColor" />
          ))}
          <path {...S} strokeWidth={1.8} d="M 37 71 Q 44 65 50 71 Q 56 66 63 71" />
        </g>
      )
    case "skyline":
      return (
        <g>
          <path {...S} strokeWidth={1.3} opacity={0.55} d="M 6 58 Q 28 36 48 44 Q 70 30 94 52" />
          <rect x={12} y={54} width={8} height={18} {...S} strokeWidth={2.4} />
          <rect x={22} y={46} width={8} height={26} {...S} strokeWidth={2.4} />
          <path {...S} strokeWidth={2.4} d="M 34 72 L 34 26 L 37.5 21 L 41 26 L 41 72" />
          <rect x={44} y={48} width={9} height={24} {...S} strokeWidth={2.4} />
          <path {...S} strokeWidth={2.4} d="M 57 72 L 57 34 L 63.5 20 L 70 34 L 70 72 M 57 52 L 70 40 M 57 40 L 70 52" />
          <rect x={73} y={50} width={8} height={22} {...S} strokeWidth={2.4} />
          <rect x={84} y={57} width={6} height={15} {...S} strokeWidth={2.4} />
          <path {...S} d="M 8 76 L 92 76" />
          <path {...S} strokeWidth={1.6} opacity={0.6} d="M 18 82 L 82 82 M 30 87 L 70 87" />
        </g>
      )
    case "cricket":
      return (
        <g>
          {[16, 23, 30].map((x) => (
            <path key={x} {...S} strokeWidth={2.6} d={`M ${x} 42 L ${x} 80`} />
          ))}
          <path {...S} strokeWidth={2.2} d="M 14 40 L 32 40" />
          <path {...S} d="M 44 80 L 70 34 L 78 39 L 52 84 Z" />
          <path {...S} strokeWidth={4} d="M 74 36 L 82 23" />
          <circle cx={78} cy={74} r={7} {...S} />
          <path {...S} strokeWidth={1.4} d="M 73 69.5 Q 78 74 83 78.5" />
        </g>
      )
    case "lie-flat":
      return (
        <g>
          <path {...S} d="M 10 66 L 90 66" />
          <path {...S} d="M 16 66 L 16 58 L 84 58 L 84 66" />
          <ellipse cx={26} cy={53} rx={8} ry={4.2} {...S} strokeWidth={2.4} />
          <path {...S} strokeWidth={2.4} d="M 36 58 Q 52 46 80 58" />
          <path {...S} strokeWidth={2.4} d="M 22 66 L 22 76 M 78 66 L 78 76" />
          <text x={66} y={38} fontSize={15} fontWeight={700} fill="currentColor" fontFamily="var(--font-sans)">
            z
          </text>
          <text x={77} y={28} fontSize={11} fontWeight={700} fill="currentColor" fontFamily="var(--font-sans)">
            z
          </text>
        </g>
      )
    case "route":
      return (
        <g>
          <path {...S} strokeWidth={1.4} strokeDasharray="2 3" opacity={0.5} d="M 18 66 Q 50 36 82 58" />
          <path {...S} d="M 18 66 Q 50 16 82 58" />
          <circle cx={18} cy={66} r={4.5} fill="currentColor" />
          <circle cx={82} cy={58} r={4.5} fill="currentColor" />
          <MiniPlane x={58} y={40} r={-75} s={1.05} />
          <text x={18} y={82} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing={1} fill="currentColor" fontFamily="var(--font-sans)">
            DEL
          </text>
          <text x={82} y={74} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing={1} fill="currentColor" fontFamily="var(--font-sans)">
            HKG
          </text>
        </g>
      )
    case "a350":
      return (
        <g>
          <path {...S} d="M 6 50 C 6 46, 14 44, 24 44 L 78 44 C 88 44, 94 48, 96 52 C 92 55, 86 56, 78 56 L 24 56 C 14 56, 8 54, 6 50 Z" />
          <path {...S} d="M 10 46 L 4 22 L 13 22 L 27 44" />
          <path {...S} strokeWidth={2.4} d="M 3 50 L 20 52" />
          <path {...S} d="M 42 55 L 30 70 L 37 70 L 58 55" />
          <path {...S} strokeWidth={2} d="M 30 70 Q 27 67 26 63" />
          <rect x={40} y={56} width={15} height={7} rx={3.5} fill="currentColor" />
          <path {...S} strokeWidth={2.6} d="M 85 47.5 Q 90 47.5 92.5 50.5" />
          <path {...S} strokeWidth={2} strokeDasharray="1.2 2.8" d="M 30 48.5 L 78 48.5" />
        </g>
      )
    case "globe":
      return (
        <g>
          <circle cx={50} cy={50} r={32} {...S} />
          <ellipse cx={50} cy={50} rx={14} ry={32} {...S} strokeWidth={1.8} />
          <ellipse cx={50} cy={50} rx={26} ry={32} {...S} strokeWidth={1.2} opacity={0.6} />
          <path {...S} strokeWidth={1.8} d="M 22.3 34 L 77.7 34 M 18 50 L 82 50 M 22.3 66 L 77.7 66" />
          <path {...S} strokeWidth={1.6} strokeDasharray="2 3" d="M 8 66 Q 50 100 92 40" />
          <MiniPlane x={90} y={36} r={40} s={0.95} />
        </g>
      )
    case "b747":
      return (
        <g>
          <path {...S} d="M 6 53 C 6 49, 14 47, 24 47 L 58 47 C 64 47, 68 38, 79 38 C 88 38, 94 45, 96 53 C 92 57, 86 58, 78 58 L 24 58 C 14 58, 8 57, 6 53 Z" />
          <path {...S} d="M 10 49 L 4 22 L 13 22 L 29 47" />
          <path {...S} strokeWidth={2.4} d="M 3 53 L 20 55" />
          <path {...S} strokeWidth={2} strokeDasharray="1.2 2.8" d="M 70 43 L 86 43 M 28 51.5 L 82 51.5" />
          <path {...S} d="M 44 57 L 32 73 L 39 73 L 60 57" />
          <rect x={35} y={61} width={10} height={6} rx={3} fill="currentColor" />
          <rect x={48} y={59} width={10} height={6} rx={3} fill="currentColor" />
          <path {...S} strokeWidth={2.4} d="M 86 44 Q 91 45 93 49" />
        </g>
      )
    case "checkerboard":
      return (
        <g>
          <path {...S} strokeWidth={1.6} strokeDasharray="2.5 3" d="M 92 12 Q 64 26 34 30" />
          <MiniPlane x={60} y={22} r={-95} s={1.05} />
          <path {...S} d="M 6 84 Q 28 50 50 48 Q 72 46 94 84 Z" />
          {[0, 1, 2, 3].flatMap((c) =>
            [0, 1].map((r) => <rect key={`${c}${r}`} x={30 + c * 10} y={56 + r * 10} width={10} height={10} fill={(c + r) % 2 === 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.4} />),
          )}
        </g>
      )
    case "moonshot":
      return (
        <g>
          <path d="M 40 14 A 23 23 0 1 0 40 60 A 18 18 0 1 1 40 14 Z" fill="currentColor" />
          <circle cx={73} cy={73} r={14} {...S} />
          <path {...S} strokeWidth={1.6} d="M 63 64 Q 73 70 84 64 M 60 76 Q 72 82 86 77" opacity={0.7} />
          <path {...S} strokeWidth={1.8} strokeDasharray="2 3" d="M 62 61 Q 58 40 38 42" />
          <MiniPlane x={55} y={46} r={-60} s={0.9} />
        </g>
      )
    case "polar":
      return (
        <g>
          <circle cx={50} cy={52} r={30} {...S} strokeWidth={1.4} />
          <path {...S} strokeWidth={2.4} d="M 50 16 L 56 46 L 86 52 L 56 58 L 50 88 L 44 58 L 14 52 L 44 46 Z" />
          <path d="M 50 16 L 56 46 L 50 52 Z M 86 52 L 56 58 L 50 52 Z M 50 88 L 44 58 L 50 52 Z M 14 52 L 44 46 L 50 52 Z" fill="currentColor" />
          <text x={50} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor" fontFamily="var(--font-sans)">
            N
          </text>
        </g>
      )
    case "hundred": {
      const leaves = (side: 1 | -1) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = ((side === 1 ? 125 : 55) + side * i * 21) * (Math.PI / 180)
          const x = 50 + 34 * Math.cos(a)
          const y = 54 + 34 * Math.sin(a)
          const rot = (a * 180) / Math.PI + 90 + side * 25
          return <ellipse key={`${side}${i}`} cx={x} cy={y} rx={2.6} ry={6} transform={`rotate(${rot} ${x} ${y})`} fill="currentColor" />
        })
      return (
        <g>
          {leaves(1)}
          {leaves(-1)}
          <text x={50} y={62} textAnchor="middle" fontSize={27} fontWeight={700} letterSpacing={-0.5} fill="currentColor" fontFamily="var(--font-sans)">
            100
          </text>
        </g>
      )
    }
  }
}

/** Enamel-pin badge artwork. Locked pins render desaturated. */
export function BadgeArt({
  art,
  metal,
  earned = true,
  size = 120,
  level,
  animate,
  className,
}: {
  art: BadgeArtId
  metal: Metal
  earned?: boolean
  size?: number
  level?: string
  animate?: boolean
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const m = METALS[metal]
  const outer = poly(10, 90 * 1.02, -Math.PI / 2)
  const inner = poly(10, 90 * 0.8, -Math.PI / 2)
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", animate && "badge-unlock", className)}
      style={earned ? undefined : { filter: "grayscale(1)", opacity: 0.38 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`m${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.42" stopColor={m.mid} />
          <stop offset="0.72" stopColor={m.lo} />
          <stop offset="1" stopColor={m.mid} />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="0.9" y1="1" x2="0.1" y2="0">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.5" stopColor={m.mid} />
          <stop offset="1" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.fieldHi} />
          <stop offset="1" stopColor={m.field} />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <Outline metal={metal} s={1} />
        </clipPath>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="translate(0 5)" opacity="0.2">
        <Outline metal={metal} s={1} fill="#000" />
      </g>
      <Outline metal={metal} s={1} fill={`url(#m${id})`} />
      {metal === "diamond" ? (
        outer.map((p, i) => {
          const q = outer[(i + 1) % 10]
          const ip = inner[i]
          const iq = inner[(i + 1) % 10]
          return <polygon key={i} points={pts([p, q, iq, ip])} fill={i % 2 === 0 ? m.hi : m.mid} opacity={i % 3 === 0 ? 0.95 : 0.75} stroke={m.lo} strokeWidth={0.6} />
        })
      ) : (
        <>
          <Outline metal={metal} s={0.9} fill={`url(#r${id})`} />
          <Outline metal={metal} s={0.86} fill={`url(#m${id})`} opacity={0.5} />
        </>
      )}
      {metal === "jade" ? (
        <Outline metal="jade" s={0.76} fill={`url(#f${id})`} stroke={m.lo} strokeWidth={1.5} />
      ) : (
        <circle cx={100} cy={100} r={metal === "diamond" ? 66 : 62} fill={`url(#f${id})`} stroke={m.lo} strokeWidth={1.5} />
      )}
      {metal !== "jade" && <circle cx={100} cy={100} r={metal === "diamond" ? 59 : 55} fill="none" stroke={m.ink} strokeOpacity={0.3} strokeWidth={1.2} />}
      {metal === "gold" &&
        Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2
          return <circle key={i} cx={100 + 58.5 * Math.cos(a)} cy={100 + 58.5 * Math.sin(a)} r={1} fill={m.ink} opacity={0.55} />
        })}
      <g color={m.ink} transform={`translate(${metal === "jade" ? 59 : 58} ${metal === "jade" ? 54 : 58}) scale(0.84)`}>
        <Art id={artFor(metal, art)} />
      </g>
      <path d="M 44 80 Q 100 34 156 80" fill="none" stroke="#ffffff" strokeOpacity={metal === "jade" ? 0.35 : 0.09} strokeWidth={9} strokeLinecap="round" clipPath={`url(#c${id})`} />
      {level && (
        <g>
          <path d="M 70 168 L 130 168 L 138 182 L 130 196 L 70 196 L 62 182 Z" fill={`url(#m${id})`} stroke={m.lo} strokeWidth={1.2} />
          <text x="100" y="188" textAnchor="middle" fontSize="15" fontWeight="700" fill={m.lo} fontFamily="var(--font-sans)">
            {level}
          </text>
        </g>
      )}
      {earned && (
        <g clipPath={`url(#c${id})`}>
          <g transform="rotate(24 100 100)">
            <rect className="pin-shine" x="-110" y="-60" width="90" height="320" fill={`url(#s${id})`} style={{ animationDelay: `${(hash(art + metal) % 9) * 0.45}s` }} />
          </g>
        </g>
      )}
      {animate && (
        <g clipPath={`url(#c${id})`}>
          <g transform="rotate(22 100 100)">
            <rect className="badge-shine" x="-80" y="-40" width="34" height="280" fill="#ffffff" opacity="0.4" />
          </g>
        </g>
      )}
    </svg>
  )
}

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

function artFor(_metal: Metal, art: BadgeArtId) {
  return art
}

/** Pin artwork with an outer progress arc for locked pins. */
export function PinWithProgress({ art, metal, earned, progress, size, level, animate, ring = "#dfe3e2" }: { art: BadgeArtId; metal: Metal; earned: boolean; progress: number; size: number; level?: string; animate?: boolean; ring?: string }) {
  const r = size / 2 + 3
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <BadgeArt art={art} metal={metal} earned={earned} size={size} level={level} animate={animate} />
      {!earned && (
        <svg className="pointer-events-none absolute -rotate-90" style={{ left: -6, top: -6, width: size + 12, height: size + 12 }} viewBox={`0 0 ${size + 12} ${size + 12}`}>
          <circle cx={size / 2 + 6} cy={size / 2 + 6} r={r} fill="none" stroke={ring} strokeWidth={3} />
          <circle cx={size / 2 + 6} cy={size / 2 + 6} r={r} fill="none" stroke="#006564" strokeWidth={3} strokeDasharray={`${c * Math.max(progress, 0.015)} ${c}`} />
        </svg>
      )}
    </div>
  )
}
