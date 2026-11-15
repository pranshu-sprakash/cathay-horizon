import { Armchair, Moon, Tv, Utensils } from "lucide-react"
import { INTERESTS, PROFILES, type Prefs, type ProfileId } from "./data"

export function summaryRows(profileId: ProfileId, prefs: Prefs, mealName?: string) {
  const p = PROFILES[profileId]
  const meal = p.meals.find((m) => m.id === prefs.meal)
  const timing = p.mealTimings.find((m) => m.id === prefs.mealTiming)
  const dish = mealName ?? meal?.name
  const interests = INTERESTS.filter((i) => prefs.interests.includes(i.id)).map((i) => i.label)
  return [
    { icon: Utensils, label: "Meal", value: dish ? `${dish}${timing ? `, ${timing.label.toLowerCase()}` : ""}` : "Not chosen yet", step: 0 },
    {
      icon: Moon,
      label: "Rest",
      value: [prefs.dndAfterMeal ? "Do not disturb after the meal" : "Crew check in as normal", prefs.makeBed && p.trip.cabin === "Business" ? "bed made up" : null, prefs.wake === "Don't wake me" ? "no wake-up" : `wake ${prefs.wake}`]
        .filter(Boolean)
        .join(", "),
      step: 1,
    },
    { icon: Armchair, label: "Seat", value: `${prefs.seat}${prefs.quietZone ? ", quiet zone" : ""}`, step: 2 },
    { icon: Tv, label: "Screen", value: `${prefs.language}, subtitles ${prefs.subtitles.toLowerCase() === "off" ? "off" : prefs.subtitles}. ${interests.join(", ")} first`, step: 3 },
  ]
}

export function onboardPlan(profileId: ProfileId, prefs: Prefs) {
  const p = PROFILES[profileId]
  const meal = p.meals.find((m) => m.id === prefs.meal)?.name
  if (profileId === "anil") {
    return [
      { at: "Boarding · 19:25", label: "Seat screen opens on cricket and news, English, no subtitles" },
      { at: prefs.mealTiming === "early" ? "After take-off · about 20:40" : "When you ask", label: `${meal} served${prefs.mealTiming === "early" ? " first in the cabin" : ""}` },
      { at: "After dinner", label: [prefs.makeBed ? "Bed made up" : null, prefs.lighting === "Dim and warm" ? "lights dimmed" : null, prefs.dndAfterMeal ? "do not disturb on" : null].filter(Boolean).join(", ") || "Normal service" },
      { at: prefs.wake === "Don't wake me" ? "Before landing" : prefs.wake.replace(" min", " minutes"), label: prefs.wake === "Don't wake me" ? "Crew leave you to rest" : "Woken with tea and a hot towel" },
    ]
  }
  return [
    { at: "Boarding · 08:10", label: `Seat screen opens on Japan picks, ${prefs.subtitles === "Off" ? "no subtitles" : `subtitles in ${prefs.subtitles}`}` },
    { at: "About 09:35", label: `${meal}${prefs.mealTiming === "wake" ? ", crew wake you for it" : ""}` },
    { at: prefs.wake === "Don't wake me" ? "Before landing" : prefs.wake.replace(" min", " minutes"), label: "Arrival card and Osaka transport tips on screen" },
  ]
}

/** Elapsed minutes used for the in-flight scenes. */
export const ELAPSED_MIN = { anil: 60, chloe: 60 } as const

export function remaining(profileId: ProfileId) {
  const left = PROFILES[profileId].trip.durationMin - ELAPSED_MIN[profileId]
  return `${Math.floor(left / 60)}h ${String(left % 60).padStart(2, "0")}m`
}
