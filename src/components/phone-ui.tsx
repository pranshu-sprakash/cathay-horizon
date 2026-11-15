"use client"

import { Bell, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Brushwing, Sim } from "./shared"

export const MILES = "₳"

export function Scroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-scroll className={cn("absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none]", className)}>
      {children}
    </div>
  )
}

export function AppHeader({ back, title, onBack }: { back?: string; title?: string; onBack?: () => void }) {
  return (
    <div className="relative flex h-11 items-center justify-center px-4">
      {onBack ? (
        <button onClick={onBack} className="absolute left-3 flex items-center text-[13px] text-ink">
          <ChevronLeft className="size-5" /> {back}
        </button>
      ) : null}
      {title ? <p className="text-[15px] font-semibold text-ink">{title}</p> : <Brushwing className="w-[26px]" />}
      {!onBack && (
        <span className="absolute right-4 flex items-center gap-4 text-ink">
          <span className="relative">
            <Bell className="size-[19px]" strokeWidth={1.6} />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#c8102e]" />
          </span>
          <svg width="18" height="14" viewBox="0 0 18 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 1h16M1 7h16M1 13h16" />
          </svg>
        </span>
      )}
    </div>
  )
}

export function AppHeaderDark({ onBack, back = "Back", right }: { onBack: () => void; back?: string; right?: React.ReactNode }) {
  return (
    <div className="relative flex h-11 items-center justify-center">
      <button onClick={onBack} className="absolute -left-1.5 flex items-center text-[13px] text-white/90">
        <ChevronLeft className="size-5" /> {back}
      </button>
      <Brushwing white className="w-[24px]" />
      {right && <span className="absolute right-0">{right}</span>}
    </div>
  )
}

export function SectionHead({ title, action, onAction, sim }: { title: string; action?: string; onAction?: () => void; sim?: boolean }) {
  return (
    <div className="mb-2.5 mt-6 flex items-baseline justify-between">
      <h3 className="flex items-center gap-2 text-[17px] text-ink">
        {title} {sim && <Sim />}
      </h3>
      {action && (
        <button onClick={onAction} className="text-[13px] text-jade">
          {action}
        </button>
      )}
    </div>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[14px] bg-white px-4 shadow-[0_6px_20px_-16px_rgba(0,50,50,0.4)]", className)}>{children}</div>
}
