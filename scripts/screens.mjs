// Captures 1920x1080 screenshots of every finished screen for both profiles.
// Usage: node scripts/screens.mjs [outDir] [baseUrl]   (ONLY=tv-map,pins to filter)
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const out = process.argv[2] ?? "screens"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
mkdirSync(out, { recursive: true })

// [name, query, scroll long phone screens, wait ms]
const shots = [
  ["01-tv-idle", "view=tv&tv=idle&saved=1"],
  ["02-tv-recognised", "view=tv&tv=welcome&saved=1", false, 3400],
  ["03-phone-home", "view=phone&phone=home&saved=0", true],
  ["04-phone-setup-meal", "view=phone&phone=setup&step=0"],
  ["05-phone-setup-rest", "view=phone&phone=setup&step=1"],
  ["06-phone-setup-seat", "view=phone&phone=setup&step=2"],
  ["07-phone-setup-screen", "view=phone&phone=setup&step=3"],
  ["08-phone-setup-review", "view=phone&phone=setup&step=4"],
  ["09-phone-saved", "view=phone&phone=saved&saved=1"],
  ["10-tv-home", "view=tv&tv=home&saved=1"],
  ["11-tv-menu", "view=tv&tv=home&saved=1", false, 600, "[data-demo=tv-menu]"],
  ["12-tv-flight-map", "view=tv&tv=map&saved=1"],
  ["13-tv-news", "view=tv&tv=news&saved=1"],
  ["14-tv-sport", "view=tv&tv=sport&saved=1"],
  ["15-tv-arrival-pin-unlock", "view=tv&tv=arrival&saved=1", false, 2600],
  ["16-phone-recap", "view=phone&phone=recap&saved=1&flown=1", true],
  ["17-phone-pins", "view=phone&phone=pins&saved=1&flown=1", true],
  ["18-phone-badge-unlocked", "view=phone&phone=badge&badge=set-once&saved=1&flown=1", true, 2200],
  ["19-phone-badge-in-progress", "view=phone&phone=badge&badge=night-shift&saved=1&flown=1", true, 1200],
  ["20-phone-badge-rare", "view=phone&phone=badge&badge=jade-century&saved=1&flown=1", false, 1200],
  ["21-phone-profile-status", "view=phone&phone=profile&saved=1&flown=1", true, 1200],
  ["22-phone-tier-ladder", "view=phone&phone=tiers&saved=1&flown=1", true, 1200],
  ["23-phone-status-card", "view=phone&phone=card&saved=1&flown=1", false, 600, "[data-demo=share-card]"],
  ["24-phone-offers", "view=phone&phone=offers&saved=1"],
  ["25-cathay-sees", "view=cathay&saved=1"],
  ["26-tv-home-no-profile", "view=tv&tv=home&saved=0"],
  ["27-phone-your-data", "view=phone&phone=data&saved=1&flown=1", true],
  ["28-seat-zoom-start", "view=tv&tv=idle&saved=1&zoom=1", false, 150],
  ["29-seat-zoom-mid", "view=tv&tv=idle&saved=1&zoom=1", false, 1150],
]

const pitch = [
  ["pitch-01-cover", 0],
  ["pitch-02-problem", 1],
  ["pitch-03-passenger", 2],
  ["pitch-04-product", 3],
  ...[1, 2, 3, 4, 5].map((k) => [`pitch-05-pipeline-step${k}`, 4, k]),
  ["pitch-06-value", 5],
  ["pitch-07-feasibility", 6],
  ["pitch-08-pilot", 7],
]

const only = process.env.ONLY?.split(",")
const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const profile of ["anil", "chloe"]) {
  for (const [name, q, scroll, wait = 700, click] of shots) {
    if (only && !only.some((o) => name.includes(o))) continue
    if (profile === "chloe" && name.includes("sport")) continue
    let query = q
    if (profile === "chloe") query = query.replace("badge=night-shift", "badge=route-regular")
    if (!query.includes("zoom=")) query += "&zoom=0"
    await page.goto(`${base}/?fresh=1&bare=1&profile=${profile}&${query}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(wait)
    if (click) {
      await page.locator(click).first().click()
      await page.waitForTimeout(700)
    }
    await page.screenshot({ path: `${out}/${profile}-${name}.png` })
    if (!scroll) continue
    const scroller = page.locator("[data-scroll]").first()
    const h = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight)
    const steps = Math.ceil((h - 40) / 560)
    for (let i = 1; i <= steps; i++) {
      await scroller.evaluate((el, y) => (el.scrollTop = y), i * 560)
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${out}/${profile}-${name}-part${i + 1}.png` })
    }
  }
}
for (const [name, slide, pstep = 1] of pitch) {
  if (only && !only.some((o) => name.includes(o))) continue
  await page.goto(`${base}/?fresh=1&bare=1&view=pitch&slide=${slide}&pstep=${pstep}`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${out}/${name}.png` })
}
await browser.close()
console.log("done", out)
