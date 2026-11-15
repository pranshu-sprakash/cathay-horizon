"use client"

import { useEffect, useState } from "react"
import { Check, ChevronRight, Copy, CreditCard, Download, Layers, Lock, Share2, Trash2, Award } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BADGES, METAL_BONUS, METAL_LABEL, TIERS, tierColour, tierIndex, type Metal, type TierName } from "@/lib/data"
import { summaryRows } from "@/lib/plan"
import { badgeState, statusSummary, useProfile } from "@/lib/store"
import { BadgeArt, PinWithProgress } from "./badge-art"
import { AppHeader, AppHeaderDark, Card, MILES, Scroll, SectionHead } from "./phone-ui"
import { Brushwing, Disclaimer, Logo, Sim } from "./shared"

const METAL_ORDER: Metal[] = ["diamond", "gold", "silver", "bronze", "jade"]
const METAL_DOT: Record<Metal, string> = { jade: "#2f7d6d", bronze: "#a8673a", silver: "#9aa3a8", gold: "#c69a3a", diamond: "#5b6670" }
const PIN_GOLD = "#c69a3a"

function useSummary() {
  const { profileId, isSaved, hasFlown, prefs } = useProfile()
  return statusSummary(profileId, isSaved, hasFlown, prefs)
}

function StatusPointsBar({ compact }: { compact?: boolean }) {
  const sum = useSummary()
  const max = sum.next.points
  const marks = TIERS.filter((t) => t.points > 0 && t.points <= max)
  const fp = Math.min(sum.flightPoints, max) / max
  const tp = Math.min(sum.total, max) / max
  return (
    <div>
      <div className="relative mx-2 mt-5 h-[4px] rounded-full bg-[#e3e7e6]">
        <div className="fill-x absolute inset-y-0 left-0 rounded-full bg-jade" style={{ width: `${fp * 100}%` }} />
        <div className="fill-x absolute inset-y-0" style={{ left: `${fp * 100}%`, width: `${(tp - fp) * 100}%`, background: PIN_GOLD, animationDelay: "300ms" }} />
        <span className="absolute top-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" style={{ left: 0 }} />
        {marks.map((t) => {
          const reached = sum.total >= t.points
          const c = tierColour(t.name)
          return (
            <span key={t.name} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(t.points / max) * 100}%` }}>
              <span className={cn("flex h-[20px] w-[28px] items-center justify-center rounded-[5px] border-2", reached ? "border-white" : "border-[#d8dcdb] bg-white")} style={reached ? { background: c.bg } : undefined}>
                <span className="h-[3px] w-[12px] rounded-full" style={{ background: reached ? "rgba(255,255,255,.7)" : c.bg }} />
              </span>
              {!compact && <span className={cn("absolute top-[24px] whitespace-nowrap text-[10px] text-[#5d6766]", t.points === max ? "-right-1" : "left-1/2 -translate-x-1/2")}>{t.name}</span>}
            </span>
          )
        })}
      </div>
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5d6766]", compact ? "mt-4" : "mt-8")}>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-jade" /> {sum.flightPoints.toLocaleString()} from flights
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: PIN_GOLD }} /> +{sum.pinPoints} from pins
        </span>
        <Sim className="text-[10px]">Pin points simulated</Sim>
      </div>
    </div>
  )
}

function ToNext() {
  const { profile } = useProfile()
  const sum = useSummary()
  return (
    <p className="mt-3 text-[13px] text-ink">
      {sum.promoted ? (
        <>
          <span className="font-semibold">{sum.tier}</span> unlocked on {profile.trip.flight}
          <span className="text-[#5d6766]"> · {sum.total - sum.current.points} points over</span>
        </>
      ) : (
        <>
          <span className="font-semibold">{sum.toNext.toLocaleString()}</span> more for {sum.next.name}
          {sum.next.invitation ? <span className="text-[#5d6766]"> · by invitation</span> : null}
        </>
      )}
    </p>
  )
}

export function ProfileScreen() {
  const { profile, set, isSaved, prefs, saved } = useProfile()
  const sum = useSummary()
  const current = sum.current
  return (
    <Scroll>
      <AppHeader />
      <div className="px-4">
        <div className="relative overflow-hidden rounded-t-[14px] bg-[linear-gradient(135deg,#2f6f68,#1f5751)] px-5 pb-12 pt-5 text-white">
          <Brushwing white className="absolute -right-6 -top-4 w-[150px] opacity-[0.08]" />
          <p className="text-[22px]">{profile.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-white/85">
            {profile.memberNo} <Copy className="size-3.5" />
          </p>
          <p className="mt-5 text-[12px] text-white/85">{sum.tier} member</p>
        </div>
        <Card className="relative -mt-7 pb-4 pt-3.5">
          <button onClick={() => set({ phone: "tiers" })} data-demo="status-points" className="flex w-full items-start justify-between text-left">
            <div>
              <p className="text-[12px] text-[#8a7232]">Status Points</p>
              <p className="text-[19px] text-ink">{sum.total.toLocaleString()}</p>
            </div>
            <ChevronRight className="mt-2 size-5 text-ink" />
          </button>
          <StatusPointsBar />
          <ToNext />
        </Card>
        <Card className="mt-3 flex items-center justify-between py-3.5">
          <p className="text-[12px] text-[#8a7232]">Asia Miles</p>
          <p className="flex items-center gap-2 text-[17px] text-ink">
            {MILES} {profile.asiaMiles.toLocaleString()} <ChevronRight className="size-5" />
          </p>
        </Card>
        <div className="mt-5 grid grid-cols-3">
          {[
            { label: "My pins", icon: Award, go: "pins" as const },
            { label: "Tier ladder", icon: Layers, go: "tiers" as const },
            { label: "Status card", icon: CreditCard, go: "card" as const },
          ].map((q) => (
            <button key={q.label} data-demo={`quick-${q.go}`} onClick={() => set({ phone: q.go })} className="flex flex-col items-center gap-1.5 text-[12px] text-ink">
              <span className="flex size-[46px] items-center justify-center rounded-full border border-ink/70 bg-white">
                <q.icon className="size-5" strokeWidth={1.5} />
              </span>
              {q.label}
            </button>
          ))}
        </div>
        <SectionHead title="My benefits" action="View all" onAction={() => set({ phone: "tiers" })} />
        <Card className="py-4">
          <div className="flex items-center gap-3">
            <TierChipCard tier={sum.tier} />
            <div>
              <p className="text-[11px] text-[#8a7232]">{sum.promoted ? `New on ${profile.trip.flight}` : "Current status"}</p>
              <p className="text-[16px] font-semibold text-ink">{sum.tier}</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-[#5d6766]">You&apos;ve unlocked</p>
          <ul className="mt-1">
            {current.benefits.slice(0, 3).map((b) => (
              <li key={b} className="flex gap-2 py-1 text-[13px] text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-jade" strokeWidth={2.2} /> {b}
              </li>
            ))}
            {current.pinPerks.map((b) => (
              <li key={b} className="flex items-center gap-2 py-1 text-[13px] text-ink">
                <PinGlyph /> {b} <Sim className="text-[10px]" />
              </li>
            ))}
          </ul>
        </Card>
        <SectionHead title="Flight profile" />
        <Card className="py-1">
          {isSaved ? (
            <>
              {summaryRows(profile.id, prefs).map((r) => (
                <div key={r.label} className="flex gap-3 border-b border-[#eef0ef] py-2.5">
                  <r.icon className="mt-0.5 size-4 text-jade" />
                  <p className="flex-1 text-[13px] leading-5 text-ink">{r.value}</p>
                </div>
              ))}
              <div className="flex gap-2 py-3">
                <Button variant="outline" className="h-9 flex-1 rounded-full" onClick={() => set({ phone: "setup", setupStep: 0 })}>
                  Edit
                </Button>
                <Button variant="outline" className="h-9 flex-1 rounded-full text-[#a33b2b]" onClick={() => set({ saved: { ...saved, [profile.id]: false }, phone: "home" })}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </>
          ) : (
            <p className="py-3 text-[13px] leading-5 text-[#5d6766]">No flight profile yet. Set one up from Home.</p>
          )}
        </Card>
        <button data-demo="your-data" onClick={() => set({ phone: "data" })} className="mt-3 flex w-full items-center justify-between rounded-[14px] bg-white px-4 py-3.5 text-left">
          <span>
            <span className="block text-[14px] text-ink">Your data and privacy</span>
            <span className="block text-[12px] text-[#5d6766]">See and delete what Cathay stores</span>
          </span>
          <ChevronRight className="size-4 text-[#7c8786]" />
        </button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

function TierChipCard({ tier }: { tier: TierName }) {
  const c = tierColour(tier)
  return (
    <span className="flex h-[30px] w-[44px] items-center justify-center rounded-[6px]" style={{ background: c.bg }}>
      <span className="h-[4px] w-[18px] rounded-full bg-white/70" />
    </span>
  )
}

function PinGlyph() {
  return <span className="size-3 shrink-0 rounded-full border-2" style={{ borderColor: PIN_GOLD }} />
}

export function PinsScreen() {
  const { profile, set, profileId, isSaved, hasFlown, prefs } = useProfile()
  const sum = useSummary()
  return (
    <Scroll>
      <AppHeader />
      <div className="px-4">
        <h1 className="mt-1 px-1 text-[24px] text-ink">My pins</h1>
        <p className="px-1 text-[13px] text-[#5d6766]">
          {sum.earnedCount} of {BADGES.length} earned · <span className="font-semibold text-ink">+{sum.pinPoints}</span> bonus status points this year
        </p>
        <Card className="mt-3 py-3.5">
          <p className="text-[13px] leading-[18px] text-ink">
            Pins add bonus status points towards {sum.next.name} in the year you earn them. The metal shows how rare a pin is.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {[...METAL_ORDER].reverse().map((m) => (
              <span key={m} className="flex items-center gap-1.5 text-[11px] text-[#5d6766]">
                <span className="size-2.5 rounded-full" style={{ background: METAL_DOT[m] }} />
                {METAL_LABEL[m]} +{METAL_BONUS[m]}
              </span>
            ))}
            <Sim className="text-[10px]" />
          </div>
        </Card>
        {METAL_ORDER.map((m) => {
          const pins = BADGES.filter((b) => b.metal === m)
          return (
            <div key={m}>
              <p className="mb-2 mt-5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5d6766]">{METAL_LABEL[m]}</p>
              <div className="grid grid-cols-3 gap-2">
                {pins.map((b) => {
                  const st = badgeState(profileId, b.id, isSaved, hasFlown, prefs)
                  return (
                    <button key={b.id} data-demo={`pin-${b.id}`} onClick={() => set({ phone: "badge", badgeId: b.id, badgeFrom: "pins" })} className="flex flex-col items-center rounded-[12px] bg-white px-1.5 pb-2.5 pt-3.5 text-center">
                      <PinWithProgress art={b.art} metal={b.metal} earned={st.earned} progress={st.progress} level={st.level} size={70} />
                      <p className="mt-2 text-[12px] font-semibold leading-4 text-ink">{b.name}</p>
                      <p className={cn("text-[11px] leading-[14px]", st.justEarned ? "font-semibold text-jade" : "text-[#5d6766]")}>{st.justEarned ? `New on ${profile.trip.flight}` : st.earned ? st.earnedOn : st.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        <SectionHead title="Where you stand" sim />
        <Card className="py-1">
          {profile.percentiles.map((p) => (
            <div key={p.line} className="border-b border-[#eef0ef] py-2.5 last:border-0">
              <p className="text-[14px] text-ink">{p.line}</p>
              <p className="text-[12px] text-[#5d6766]">{p.detail}</p>
            </div>
          ))}
        </Card>
        <p className="mt-1.5 px-1 text-[11px] text-[#5d6766]">Anonymous percentiles. Other members are never named.</p>
        <SectionHead title="Friends" action="Invite" sim />
        <Card className="py-1">
          <FriendRow name={`${profile.name} (you)`} role={`${profile.stats.flights} flights in ${profile.stats.year}`} tier={sum.tier} pins={sum.earnedCount} you />
          {profile.friends.map((f) => (
            <FriendRow key={f.name} name={f.name} role={`${f.role} · ${f.flights} flights`} tier={f.tier} pins={f.pins} top={f.topPin} />
          ))}
        </Card>
        <p className="mt-1.5 px-1 text-[11px] text-[#5d6766]">Only colleagues who accept your invite appear here.</p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

function FriendRow({ name, role, tier, pins, top, you }: { name: string; role: string; tier: TierName; pins: number; top?: string; you?: boolean }) {
  const c = tierColour(tier)
  const initials = name
    .replace(" (you)", "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
  const topBadge = top ? BADGES.find((b) => b.name === top) : undefined
  return (
    <div className={cn("flex items-center gap-3 border-b border-[#eef0ef] py-2.5 last:border-0", you && "")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: c.bg }}>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[14px] text-ink", you && "font-semibold")}>{name}</p>
        <p className="truncate text-[11px] text-[#5d6766]">
          {tier} · {role}
        </p>
      </div>
      {topBadge && <BadgeArt art={topBadge.art} metal={topBadge.metal} size={28} />}
      <span className="w-[44px] text-right text-[12px] text-ink">
        <span className="font-semibold">{pins}</span> pins
      </span>
    </div>
  )
}

export function BadgeDetail() {
  const { profile, set, profileId, isSaved, hasFlown, prefs, badgeId, badgeFrom } = useProfile()
  const b = BADGES.find((x) => x.id === badgeId) ?? BADGES[0]
  const st = badgeState(profileId, b.id, isSaved, hasFlown, prefs)
  const sum = useSummary()
  const bonus = METAL_BONUS[b.metal]
  const share = sum.toNext > 0 ? Math.max(1, Math.round((bonus / (sum.toNext + (st.earned && st.thisYear ? bonus : 0))) * 100)) : 0
  const back = badgeFrom === "recap" ? "Recap" : "My pins"
  return (
    <Scroll>
      <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#1f5d58_0%,#0f2f2d_70%)] px-5 pb-6 text-white">
        <AppHeaderDark onBack={() => set({ phone: badgeFrom })} back={back} right={<Share2 className="size-[18px]" strokeWidth={1.6} />} />
        <div className="mt-3 flex justify-center" key={`${b.id}-${st.justEarned}`}>
          <BadgeArt art={b.art} metal={b.metal} earned={st.earned} size={200} level={st.level} animate={st.justEarned} />
        </div>
        {st.justEarned && <p className="rise mt-3 text-center text-[13px] font-semibold text-[#9fd3bf]">Unlocked on {profile.trip.flight}</p>}
        <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-white/80">
          <span className="rounded-[4px] border border-white/30 px-1.5 py-px">{METAL_LABEL[b.metal]} pin</span>
          <span>Held by {b.heldBy} of members</span>
          <Sim dark className="text-[10px]" />
        </div>
      </div>
      <div className="px-4">
        <h1 className="mt-4 px-1 text-[25px] leading-8 text-ink">{b.name}</h1>
        <p className="px-1 text-[14px] text-ink">{b.rule}</p>
        <p className="mt-1.5 px-1 text-[13px] leading-[18px] text-[#5d6766]">{b.story}</p>

        <Card className="mt-4 py-4">
          {st.earned ? (
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-jade text-white">
                <Check className="size-4" strokeWidth={2.6} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink">{st.justEarned ? `Earned today on ${profile.trip.flight}` : `Earned ${st.earnedOn}`}</p>
                {st.level && <p className="text-[12px] text-[#5d6766]">Level {st.level}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-semibold text-ink">{st.note ?? st.label}</p>
                <p className="text-[12px] text-[#5d6766]">{Math.round(st.progress * 100)}%</p>
              </div>
              <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-[#e3e7e6]">
                <div className="fill-x h-full rounded-full bg-jade" style={{ width: `${Math.max(st.progress, 0.02) * 100}%` }} />
              </div>
              {b.goal > 1 && b.goal <= 10 && (
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: b.goal }, (_, i) => (
                    <span key={i} className={cn("h-[4px] flex-1 rounded-full", i < st.value ? "bg-jade" : "bg-[#e3e7e6]")} />
                  ))}
                </div>
              )}
              {st.left && (
                <p className="mt-3 text-[13px] leading-[18px] text-ink">
                  <span className="text-[#5d6766]">What&apos;s left: </span>
                  {st.left}
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="mt-3 py-4">
          <div className="flex items-center gap-2">
            <p className="text-[12px] text-[#8a7232]">{sum.promoted ? `Counted towards ${sum.tier}` : `Towards ${sum.next.name}`}</p>
            <Sim className="text-[10px]" />
          </div>
          <p className="mt-1 text-[20px] text-ink">+{bonus} bonus status points</p>
          <p className="mt-0.5 text-[13px] leading-[18px] text-[#5d6766]">
            {sum.promoted
              ? st.justEarned
                ? `Earned tonight. Your pins took you over ${sum.current.points.toLocaleString()} to ${sum.tier}.`
                : st.earned && st.thisYear
                  ? `Counted this year, and part of your move to ${sum.tier}.`
                  : `Pins you earn now count towards keeping ${sum.tier} next year.`
              : st.earned && st.thisYear
                ? `Counted this year. ${sum.toNext.toLocaleString()} more for ${sum.next.name}.`
                : st.earned
                  ? `Counted in the year you earned it. Pins earned this year add to ${sum.next.name}.`
                  : `About ${share}% of the ${sum.toNext.toLocaleString()} points you still need for ${sum.next.name}.`}
          </p>
          <StatusPointsBar compact />
        </Card>

        {st.stats.length > 0 && (
          <>
            <SectionHead title="Your stats" />
            <Card className="py-1">
              {st.stats.map((s) => (
                <p key={s} className="border-b border-[#eef0ef] py-2.5 text-[13px] leading-5 text-ink last:border-0">
                  {s}
                </p>
              ))}
            </Card>
          </>
        )}
        <Button variant="outline" className="mt-4 h-10 w-full rounded-full bg-white text-[14px]">
          <Share2 className="size-4" /> Share pin
        </Button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

export function TiersScreen() {
  const { profile, set } = useProfile()
  const sum = useSummary()
  /** A promotion replays as: old tier, the ladder fills to the new one, then the new tier lands. */
  const [stage, setStage] = useState(sum.promoted ? 0 : 2)
  useEffect(() => {
    if (!sum.promoted) return
    const a = setTimeout(() => setStage(1), 1000)
    const b = setTimeout(() => setStage(2), 1900)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [sum.promoted])
  const cur = tierIndex(stage < 2 ? sum.previous.name : sum.tier)
  const nxt = sum.top && stage === 2 ? -1 : cur + 1
  const landed = sum.promoted && stage === 2
  const tonight = sum.pins.filter((x) => x.st.justEarned).reduce((n, x) => n + METAL_BONUS[x.b.metal], 0)
  return (
    <Scroll>
      <AppHeader />
      <div className="px-4">
        <h1 className="mt-1 px-1 text-[24px] text-ink">Tiers and benefits</h1>
        <p className="px-1 text-[13px] text-[#5d6766]">Membership year ends {profile.yearEnds}</p>
        <Card className="mt-3 pb-4 pt-3.5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[12px] text-[#8a7232]">Status Points</p>
              <p className="text-[19px] text-ink">{sum.total.toLocaleString()}</p>
            </div>
            <p className="text-[12px] text-[#5d6766]">{TIERS[cur].name} member</p>
          </div>
          <StatusPointsBar />
          <ToNext />
        </Card>
        {landed && (
          <div className="rise mt-3 flex items-center gap-3 rounded-[14px] bg-[#101515] px-4 py-3.5 text-white" data-demo="tier-up">
            <span className="rounded-[7px] ring-1 ring-[#e6d29c]/70">
              <TierChipCard tier={sum.tier} />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">You moved up to {sum.tier}</p>
              <p className="text-[12px] text-white/70">
                From {sum.previous.name} on {profile.trip.flight}. Tonight&apos;s pins took you over {sum.current.points.toLocaleString()}.
              </p>
            </div>
          </div>
        )}
        <div className="relative mt-5">
          <span className="absolute bottom-6 left-[15px] top-6 w-px bg-[#d6dcda]" />
          {[...TIERS].reverse().map((t) => {
            const i = tierIndex(t.name)
            const state = i === cur ? "current" : i === nxt ? "next" : i < cur ? "unlocked" : "locked"
            const c = tierColour(t.name)
            return (
              <div key={t.name} className="relative mb-3 flex gap-3" data-tier={t.name}>
                {sum.promoted && t.name === sum.tier && (
                  <span className="absolute left-[15px] top-[47px] z-[5] w-[2px] -translate-x-[0.5px] origin-bottom bg-jade transition-transform duration-[900ms] ease-out" style={{ height: "calc(100% - 19px)", transform: `scaleY(${stage >= 1 ? 1 : 0})` }} />
                )}
                <span className={cn("relative z-10 mt-4 flex size-[31px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500", state === "locked" || state === "next" ? "border-[#d6dcda] bg-[#f4f5f5]" : "border-white")} style={state === "current" || state === "unlocked" ? { background: c.bg } : undefined}>
                  {state === "unlocked" || state === "current" ? <Check className="size-4 text-white" strokeWidth={2.6} /> : <Lock className="size-3.5 text-[#7c8786]" strokeWidth={2} />}
                </span>
                <div className={cn("flex-1 rounded-[14px] bg-white px-4 py-3.5", state === "current" && "ring-2 ring-jade", state === "locked" && "opacity-70")}>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-semibold text-ink">{t.name}</p>
                    {state === "current" && <span className="rounded-[4px] bg-jade px-1.5 py-px text-[10px] font-semibold text-white">Your tier</span>}
                    {state === "next" && (
                      <span className="rounded-[4px] border px-1.5 py-px text-[10px] font-semibold" style={{ borderColor: PIN_GOLD, color: "#8a6a1f" }}>
                        Next
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5d6766]">{t.pointsLabel}</p>
                  {state === "next" && (
                    <p className="mt-1 text-[13px] text-ink">
                      {sum.promoted ? (
                        <>
                          <span className="font-semibold">+{tonight}</span> from tonight&apos;s pins takes you over
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{sum.toNext.toLocaleString()}</span> points to go, {sum.pinPoints} already from pins
                        </>
                      )}
                    </p>
                  )}
                  {landed && t.name === sum.tier && <p className="rise mt-1 text-[13px] font-semibold text-jade">Unlocked today on {profile.trip.flight}</p>}
                  <ul className="mt-2">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex gap-2 py-0.5 text-[13px] leading-[18px] text-ink">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-jade" strokeWidth={2.4} /> {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t border-[#eef0ef] pt-2">
                    <p className="flex items-center gap-1.5 text-[11px] text-[#8a7232]">
                      Pin perks <Sim className="text-[10px]" />
                    </p>
                    {t.pinPerks.map((b, k) => (
                      <p key={b} className={cn("mt-1 flex items-center gap-2 text-[13px] text-ink", landed && t.name === sum.tier && "rise -mx-1.5 rounded-[6px] bg-[#f6efdc] px-1.5 py-0.5")} style={landed && t.name === sum.tier ? { animationDelay: `${300 + k * 200}ms` } : undefined}>
                        <PinGlyph /> {b}
                        {landed && t.name === sum.tier && <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8a6a1f]">Unlocked</span>}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-1 px-1 text-[11px] leading-4 text-[#5d6766]">Tier benefits follow the Cathay membership programme. Pin perks and pin status points are part of this concept and simulated.</p>
        <Button variant="outline" className="mt-4 h-10 w-full rounded-full bg-white text-[14px]" onClick={() => set({ phone: "card" })}>
          <CreditCard className="size-4" /> View your status card
        </Button>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}

const CARD_BG: Record<TierName, string> = {
  Green: "linear-gradient(135deg,#2f7d6d 0%,#145a4f 48%,#2a7466 72%,#0f4a41 100%)",
  Silver: "linear-gradient(135deg,#c9cfd3 0%,#8d969c 45%,#b8bfc4 70%,#7b8489 100%)",
  Gold: "linear-gradient(135deg,#d9bb74 0%,#a8853c 45%,#c9a65a 70%,#8f6f2c 100%)",
  Diamond: "linear-gradient(135deg,#4a4e54 0%,#1e2024 42%,#3b3f45 68%,#141518 100%)",
  "Diamond Exec": "linear-gradient(135deg,#2a2c30 0%,#0b0c0e 45%,#2c2f33 70%,#050506 100%)",
}

export function StatusCardScreen() {
  const { profile, set, profileId, isSaved, hasFlown, prefs } = useProfile()
  const [shared, setShared] = useState(false)
  const sum = statusSummary(profileId, isSaved, hasFlown, prefs)
  const top = sum.pins
    .filter((x) => x.st.earned)
    .sort((a, b) => METAL_ORDER.indexOf(a.b.metal) - METAL_ORDER.indexOf(b.b.metal))
    .slice(0, 3)
  return (
    <Scroll className="bg-[#101515]">
      <div className="px-5 text-white">
        <AppHeaderDark onBack={() => set({ phone: "profile" })} back="Profile" />
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-[22px]">Status card</h1>
          <Sim dark />
        </div>
        <div className="relative mt-5 aspect-[1.586] w-full overflow-hidden rounded-[16px] p-5 shadow-[0_24px_40px_-20px_rgba(0,0,0,0.9)]" style={{ background: CARD_BG[sum.tier] }}>
          <div className="absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_6px)]" />
          <Brushwing white className="absolute -bottom-10 -right-8 w-[190px] opacity-[0.1]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <Logo white className="w-[118px]" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">Member since {profile.memberSince}</p>
            </div>
            <p className={cn("mt-4 text-[26px] font-light uppercase tracking-[0.18em]", sum.tier === "Diamond Exec" && "bg-[linear-gradient(90deg,#f3e3b4,#c9a65a_50%,#f3e3b4)] bg-clip-text text-transparent")}>{sum.tier}</p>
            {sum.promoted && <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#e6d29c]">New on {profile.trip.flight}</p>}
            <div className="mt-1 flex -space-x-1.5">
              {top.map(({ b }) => (
                <BadgeArt key={b.id} art={b.art} metal={b.metal} size={30} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-between">
              <div>
                <p className="text-[13px] uppercase tracking-[0.14em]">{profile.name}</p>
                <p className="mt-0.5 font-mono text-[12px] tracking-[0.14em] text-white/80">{profile.memberNo}</p>
              </div>
              <p className="text-right text-[10px] leading-[14px] text-white/75">
                {sum.earnedCount} pins
                <br />
                {sum.total.toLocaleString()} status points
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 border-y border-white/12 py-3 text-center">
          {[
            [profile.stats.flights.toString(), `Flights in ${profile.stats.year}`],
            [`${Math.round(profile.stats.km / 1000)}k`, "Kilometres"],
            [sum.earnedCount.toString(), "Pins"],
          ].map(([v, k]) => (
            <div key={k}>
              <p className="text-[19px] font-semibold">{v}</p>
              <p className="text-[11px] text-white/60">{k}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[14px]">{profile.percentiles[0].line}</p>
        <p className="text-[12px] text-white/60">{profile.percentiles[1].line}</p>
        <Button data-demo="share-card" onClick={() => setShared(true)} className="mt-5 h-11 w-full rounded-full bg-white text-[14px] font-semibold text-[#101515] hover:bg-white/90">
          <Share2 className="size-4" /> Share card
        </Button>
        {shared && (
          <div className="rise mt-3 rounded-[12px] border border-white/15 bg-white/5 px-4 py-3">
            <p className="text-[13px]">Card image ready</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px] text-white/75">
              {["Messages", "WhatsApp", "LinkedIn", "Save image"].map((s) => (
                <span key={s} className="rounded-[8px] bg-white/8 py-2">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/55">Shows tier, pins and percentile only. No member number.</p>
          </div>
        )}
        <Disclaimer dark className="py-6 text-center" />
      </div>
    </Scroll>
  )
}


export function DataScreen() {
  const { profile, prefs, set, saved, isSaved } = useProfile()
  const [viewing, setViewing] = useState(true)
  const [friends, setFriends] = useState(true)
  const meal = profile.meals.find((m) => m.id === prefs.meal)?.name
  const stored = [
    { title: "Flight profile", detail: isSaved ? `${meal}, rest and seat choices, screen language and interests` : "Not set up", who: "Crew on your aisle see meal, rest and approach for your seat only" },
    { title: "Flights for pins and tiers", detail: `${profile.stats.flights} flights in ${profile.stats.year}, routes and distances`, who: "Only you, and friends you invite see pin counts" },
    { title: "Viewing on board", detail: "Titles and minutes watched, e.g. 48 min of cricket on CX695", who: "Used for your recommendations. Planners see totals, never names" },
  ]
  return (
    <Scroll>
      <AppHeader back="Profile" title="Your data" onBack={() => set({ phone: "profile" })} />
      <div className="px-4">
        <h1 className="mt-2 px-1 text-[22px] leading-7 text-ink">You can see and delete this</h1>
        <p className="mt-1 px-1 text-[13px] leading-[18px] text-[#5d6766]">Everything Cathay stores for your flight profile, and who can see it. You opted in on 1 Sep 2026.</p>
        <Card className="mt-3 py-1">
          {stored.map((r) => (
            <div key={r.title} className="flex gap-3 border-b border-[#eef0ef] py-3 last:border-0">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">{r.title}</p>
                <p className="text-[13px] leading-[18px] text-ink">{r.detail}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-[#5d6766]">{r.who}</p>
              </div>
              <button className="self-start text-[12px] font-semibold text-[#a33b2b]">Delete</button>
            </div>
          ))}
        </Card>
        <Card className="mt-3 py-1">
          <label className="flex items-center gap-3 border-b border-[#eef0ef] py-3">
            <span className="flex-1 text-[13px] text-ink">Use my viewing for recommendations</span>
            <Switch checked={viewing} onCheckedChange={(v) => setViewing(!!v)} className="data-checked:bg-jade" />
          </label>
          <label className="flex items-center gap-3 py-3">
            <span className="flex-1 text-[13px] text-ink">Show my pins to friends</span>
            <Switch checked={friends} onCheckedChange={(v) => setFriends(!!v)} className="data-checked:bg-jade" />
          </label>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="h-10 flex-1 rounded-full bg-white text-[13px]">
            <Download className="size-4" /> Download
          </Button>
          <Button variant="outline" className="h-10 flex-1 rounded-full bg-white text-[13px] text-[#a33b2b]" onClick={() => set({ saved: { ...saved, [profile.id]: false }, phone: "home" })}>
            <Trash2 className="size-4" /> Delete all
          </Button>
        </div>
        <p className="mt-3 px-1 text-[11px] leading-4 text-[#5d6766]">Deleting removes your profile from the next aircraft update. The seat then uses standard settings.</p>
        <Disclaimer className="py-6 text-center" />
      </div>
    </Scroll>
  )
}
