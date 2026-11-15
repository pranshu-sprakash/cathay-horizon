"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function Sim({ className, children = "Simulated", dark }: { className?: string; children?: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[3px] border px-1.5 py-px align-middle text-[10px] font-semibold leading-4",
        dark ? "border-white/35 text-white/75" : "border-[#b9a46b] bg-[#fbf6e8] text-[#6f5a1c]",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Logo({ white, className }: { white?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={white ? "/cathay-pacific-logo-white.svg" : "/cathay-pacific-logo.svg"}
      alt="Cathay Pacific"
      className={cn("block h-auto", className)}
      style={{ aspectRatio: "430 / 60" }}
    />
  )
}

export function Brushwing({ white, className }: { white?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={white ? "/brushwing-white.svg" : "/brushwing.svg"} alt="Cathay Pacific" className={cn("block h-auto", className)} style={{ aspectRatio: "54 / 50" }} />
  )
}

export function Disclaimer({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <p className={cn("text-[11px] leading-4", dark ? "text-white/55" : "text-[#5d6766]", className)}>
      Concept demo, not affiliated with Cathay Pacific.
    </p>
  )
}

/** Renders children at a fixed design size and scales them to fit the parent. */
export function Fit({ width, height, children, className }: { width: number; height: number; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(() => (typeof window === "undefined" ? 1 : Math.min(window.innerWidth / width, window.innerHeight / height) || 1))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(Math.min(el.clientWidth / width, el.clientHeight / height) || 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height])
  return (
    <div ref={ref} className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}>
      <div style={{ width: width * scale, height: height * scale }} className="relative shrink-0">
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }} className="absolute left-0 top-0">
          {children}
        </div>
      </div>
    </div>
  )
}
