"use client"

import { RotateCcw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { PROFILES, type ProfileId } from "@/lib/data"
import { useDemo, type View } from "@/lib/store"
import { CathayView } from "./cathay-view"
import { PhoneDevice } from "./phone"
import { PitchView } from "./pitch"
import { SeatZoom } from "./seat-zoom"
import { SeatZoomPhoto } from "./seat-zoom-photo"
import { CrewTabletStage } from "./idea2"
import { Disclaimer, Fit, Logo } from "./shared"
import { TV_H, TV_W, TvScreenView } from "./tv"

export function DemoShell() {
  const { view, bare, ready, zoomAt, flatZoom } = useDemo()
  if (!ready) return <div className="h-dvh bg-[#e9eceb]" />
  if (new URLSearchParams(window.location.search).get("device") === "1")
    return (
      <div className="flex h-dvh items-center justify-center" data-device-only>
        <PhoneDevice />
      </div>
    )
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#e9eceb]">
      {!bare && <DemoBar />}
      <main className={cn("relative min-h-0 flex-1", view !== "phone" && "bg-black")}>
        {view === "phone" && <PhoneStage />}
        {view === "tv" && (
          <Fit width={TV_W} height={TV_H}>
            {zoomAt ? flatZoom ? <SeatZoom /> : <SeatZoomPhoto /> : <TvScreenView />}
          </Fit>
        )}
        {view === "pitch" && (
          <Fit width={TV_W} height={TV_H}>
            <PitchView />
          </Fit>
        )}
        {view === "cathay" && (
          <Fit width={TV_W} height={TV_H}>
            <CathayView />
          </Fit>
        )}
        {view === "crew" && (
          <Fit width={TV_W} height={TV_H}>
            <CrewTabletStage />
          </Fit>
        )}
      </main>
    </div>
  )
}

function PhoneStage() {
  return (
    <Fit width={1920} height={1080}>
      <div className="relative flex h-[1080px] w-[1920px] items-center justify-center bg-[#e9eceb]">
        <Logo className="absolute left-[72px] top-[60px] w-[260px]" />
        {/* zoom, not a scale transform: text is laid out at the final size, so word spacing stays even */}
        <div style={{ zoom: 1.18 }}>
          <PhoneDevice />
        </div>
        <Disclaimer className="absolute bottom-6 left-[72px] text-[16px]" />
      </div>
    </Fit>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex rounded-[6px] border border-[#cfd5d3] bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          data-demo={`seg-${o.id}`}
          onClick={() => onChange(o.id)}
          className={cn("h-8 rounded-[4px] px-3 text-[13px] font-medium", value === o.id ? "bg-jade text-white" : "text-ink/75 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function DemoBar() {
  const { view, set, profileId, switchProfile, reset, skipZoom } = useDemo()
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-4 border-b border-[#cfd5d3] bg-[#f6f7f6] px-4">
      <div className="flex items-center gap-3">
        <Logo className="w-[120px]" />
        <span className="hidden text-[12px] text-muted-foreground lg:inline">Flight profile · concept demo controls</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Segmented<View>
          value={view}
          onChange={(v) => set({ view: v })}
          options={[
            { id: "phone", label: "Phone app" },
            { id: "tv", label: "Seatback TV" },
            { id: "cathay", label: "What Cathay sees" },
            { id: "pitch", label: "Pitch" },
          ]}
        />
        <Segmented<ProfileId>
          value={profileId}
          onChange={(v) => switchProfile(v)}
          options={(Object.keys(PROFILES) as ProfileId[]).map((id) => ({ id, label: `${PROFILES[id].name} · ${PROFILES[id].tier}` }))}
        />
        <label className="flex items-center gap-2 text-[13px] text-ink/80">
          <Switch checked={!skipZoom} onCheckedChange={(v) => set({ skipZoom: !v })} className="data-checked:bg-jade" data-demo="zoom-toggle" />
          Seat zoom
        </label>
        <button onClick={reset} data-demo="reset" className="flex h-9 items-center gap-1.5 rounded-[6px] border border-[#cfd5d3] bg-white px-3 text-[13px] font-medium text-ink hover:bg-mist">
          <RotateCcw className="size-3.5" /> Reset demo
        </button>
      </div>
    </div>
  )
}
