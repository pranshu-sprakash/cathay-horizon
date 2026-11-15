"use client"

import { useProfile } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Disclaimer, Logo, Sim } from "./shared"

const INSIGHTS = {
  anil: {
    flight: "CX695 · Hong Kong to Delhi · Thu 15 Oct",
    cabin: "Business, 38 seats",
    profiles: { set: 31, of: 38 },
    meals: [
      { dish: "Dal makhani", standard: 9, chosen: 15 },
      { dish: "Chicken Chettinad", standard: 11, chosen: 10 },
      { dish: "Steamed garoupa", standard: 9, chosen: 4 },
      { dish: "Beef tenderloin", standard: 9, chosen: 2 },
    ],
    mealNote: "Load 15 dal makhani instead of 9. Fewer beef dishes uplifted and left over.",
    rest: [
      ["22", "do not disturb after dinner", "Crew finish the main service by 21:20 in rows 11 to 14"],
      ["18", "wake 45 minutes before landing", "Tea and hot towels from 00:55 Hong Kong time"],
      ["14", "bed made up after dinner", "Turn-down starts row 11, window side first"],
    ],
    screen: [
      ["24", "put cricket first", "Keep the Sport24 live cricket feed on HKG to DEL"],
      ["27", "follow world or business news", "Refresh the news pack at the gate, not the day before"],
    ],
    crew: { seat: "11A", name: "Mr Mathur, Diamond", lines: ["Dal makhani, straight after take-off", "Do not disturb after dinner, bed made up", "Wake 45 min before landing with tea", "Keep it brief"] },
  },
  chloe: {
    flight: "CX566 · Hong Kong to Osaka · Sat 17 Oct",
    cabin: "Economy, 280 seats",
    profiles: { set: 96, of: 280 },
    meals: [
      { dish: "Congee with fish slices", standard: 140, chosen: 61 },
      { dish: "Scrambled eggs", standard: 140, chosen: 31 },
      { dish: "Fruit platter (FPML)", standard: 2, chosen: 4 },
    ],
    mealNote: "Congee leads two to one among passengers who chose. Load mix moves from 50/50 to 60/40.",
    rest: [
      ["58", "want waking for breakfast", "Crew wake passengers marked on the manifest first"],
      ["21", "do not disturb", "Leave a snack box at the seat"],
    ],
    screen: [
      ["44", "picked Japanese film or animation", "Feature a Japan row on all KIX flights"],
      ["37", "watch with Chinese subtitles", "Check subtitle coverage on new titles"],
    ],
    crew: { seat: "54K", name: "Ms Leung, Green", lines: ["Congee, wake me for breakfast", "Wake 30 min before landing", "Happy to chat"] },
  },
}

export function CathayView() {
  const { profileId } = useProfile()
  const d = INSIGHTS[profileId]
  const maxMeal = Math.max(...d.meals.flatMap((m) => [m.standard, m.chosen]))
  return (
    <div className="flex h-[1080px] w-[1920px] flex-col bg-[#f4f5f4] px-20 pb-12 pt-14 text-ink">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <Logo className="w-[260px]" />
          <h1 className="mt-6 text-[48px] font-semibold leading-tight">What Cathay sees before departure</h1>
          <p className="mt-1 text-[24px] text-muted-foreground">
            {d.flight} · {d.cabin}
          </p>
        </div>
        <div className="text-right">
          <Sim className="text-[15px] px-2 py-0.5">All figures simulated</Sim>
          <p className="mt-3 text-[64px] font-semibold leading-none text-jade">
            {d.profiles.set}
            <span className="text-[32px] text-muted-foreground"> of {d.profiles.of}</span>
          </p>
          <p className="text-[20px] text-muted-foreground">passengers set a flight profile</p>
        </div>
      </header>

      <div className="mt-10 grid flex-1 grid-cols-[1.1fr_1fr_0.8fr] gap-16">
        <section>
          <h2 className="text-[26px] font-semibold">Meal load</h2>
          <p className="mt-1 text-[18px] text-muted-foreground">Standard load against pre-selected choices</p>
          <div className="mt-6 flex flex-col gap-5">
            {d.meals.map((m) => (
              <div key={m.dish}>
                <p className="text-[20px] font-medium">{m.dish}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-[10px] bg-stone" style={{ width: `${(m.standard / maxMeal) * 360}px` }} />
                  <span className="text-[16px] text-muted-foreground">{m.standard} standard</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-[10px] bg-jade" style={{ width: `${(m.chosen / maxMeal) * 360}px` }} />
                  <span className="text-[16px] font-semibold text-jade">{m.chosen} chosen</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 border-l-4 border-jade pl-4 text-[20px] leading-7">{d.mealNote}</p>
        </section>

        <section>
          <h2 className="text-[26px] font-semibold">Service plan</h2>
          <p className="mt-1 text-[18px] text-muted-foreground">Rest and screen choices, and what changes</p>
          <div className="mt-5 border-t border-border">
            {[...d.rest, ...d.screen].map(([n, what, action]) => (
              <div key={what} className="flex gap-5 border-b border-border py-4">
                <span className="w-[64px] shrink-0 text-[36px] font-semibold leading-none text-jade">{n}</span>
                <div>
                  <p className="text-[20px] font-medium">{what}</p>
                  <p className="text-[18px] text-muted-foreground">{action}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[26px] font-semibold">Crew card</h2>
          <p className="mt-1 text-[18px] text-muted-foreground">What the crew tablet shows for one seat</p>
          <div className="mt-5 bg-white p-6 shadow-[0_1px_0_#dfe3e2]">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <span className="text-[40px] font-semibold text-jade">{d.crew.seat}</span>
              <span className="text-[18px] text-muted-foreground">{d.crew.name}</span>
            </div>
            <ul className="mt-3">
              {d.crew.lines.map((l, i) => (
                <li key={l} className={cn("py-2.5 text-[20px]", i > 0 && "border-t border-border")}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-[17px] leading-6 text-muted-foreground">
            Crew see meal, rest and approach choices only. Viewing history and badges stay in the passenger&apos;s account.
          </p>
        </section>
      </div>
      <Disclaimer className="text-[15px]" />
    </div>
  )
}
