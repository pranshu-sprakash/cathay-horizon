// Records the scripted passenger journey at 1920x1080.
// Usage: [CUT=long|short|30] node scripts/record.mjs [outDir] [baseUrl]
// Writes <outDir>/<name>.webm and <outDir>/<name>-marks.json (scene times and the startOffset to trim).
import { chromium } from "playwright"
import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import { POINTER } from "./pointer.mjs"

const out = process.argv[2] ?? "recording"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
const cut = process.env.CUT ?? "long"
const name = { long: "journey", short: "journey-short", 30: "journey-30s" }[cut]
if (!name) throw new Error(`Unknown CUT ${cut}`)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
})
const page = await context.newPage()
const t0 = Date.now()

await page.addInitScript(POINTER)

const pace = { long: 0.85, short: 0.75, 30: 1.2 }[cut]
const wait = (ms) => page.waitForTimeout(Math.round(ms * pace))
const hold = (ms) => page.waitForTimeout(ms)
const ZOOM = 2150

// Click inside the target near its bottom-right corner, so the arrow body sits beside or below the label.
async function click(locator, pause = 240) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  const x = b.x + b.width - Math.min(14, b.width * 0.15)
  const y = b.y + b.height - Math.min(10, b.height * 0.25)
  await page.mouse.move(x, y, { steps: cut === "long" ? 18 : 13 })
  await hold(pause)
  await page.mouse.down()
  await page.mouse.up()
}
async function clickAt(x, y, pause = 300) {
  await page.mouse.move(x, y, { steps: 14 })
  await hold(pause)
  await page.mouse.down()
  await page.mouse.up()
}
const demo = (id) => page.locator(`[data-demo="${id}"]`).first()
async function scrollPhone(px, steps = 10) {
  const box = await page.locator("[data-scroll]").first().boundingBox()
  await page.mouse.move(box.x + box.width - 40, box.y + box.height / 2, { steps: 8 })
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px / steps)
    await hold(60)
  }
}
async function tvMenu(item) {
  await click(demo("tv-menu"))
  await wait(900)
  await click(demo(`menu-${item}`))
}

// Load the seat behind the phone view, so the recording itself starts on the cabin seat push-in.
await page.goto(`${base}/?fresh=1&bare=1&profile=anil&view=phone&tv=idle&saved=1&zoom=flat`)
await page.waitForLoadState("networkidle")
await hold(900)
const startOffset = (Date.now() - t0) / 1000
const marks = []
const mark = (label) => marks.push({ t: Number(((Date.now() - t0) / 1000 - startOffset).toFixed(1)), label })

await page.keyboard.press("2")
mark("Cabin seat 11A, push in to the screen")
await hold(ZOOM)
mark("Seat 11A idle")
await page.mouse.move(1560, 760, { steps: 10 })
await wait(cut === "30" ? 2000 : 2800)
await clickAt(1560, 760)
mark("Recognises Mr Mathur, loads his profile")
await hold(cut === "long" ? 4600 : cut === "short" ? 3800 : 4000)

if (cut === "30") {
  await click(demo("tv-start"))
  mark("His seat screen")
  await wait(5600)
} else {
  // Hard cut back to how he set it up on his phone.
  await page.goto(`${base}/?fresh=1&bare=1&profile=anil&view=phone&phone=home&zoom=flat`)
  await page.waitForLoadState("networkidle")
  mark("Cut back: Cathay app home")
  await page.mouse.move(1080, 700, { steps: 6 })
  await wait(3000)
  await click(demo("start-setup"))
  mark("Setup: meal and timing")
  await wait(2200)
  if (cut === "long") {
    await click(page.getByText("Dal makhani", { exact: true }).first())
    await wait(1200)
  }
  await click(demo("next"))
  mark("Setup: rest")
  await wait(2400)
  await click(demo("next"))
  mark("Setup: seat")
  await wait(2000)
  await click(demo("next"))
  mark("Setup: screen")
  await wait(2400)
  await click(demo("next"))
  mark("Review")
  await wait(2600)
  await click(demo("save"))
  mark("Saved, sent to seat 11A")
  await wait(3000)
  await click(demo("to-tv"))
  mark("Cabin seat 11A, push in to the screen")
  await hold(ZOOM)
  mark("Seat screen home")
  await wait(5000)
  await tvMenu("flight-map")
  mark("Flight map")
  await wait(5000)
  if (cut === "long") {
    await tvMenu("news")
    mark("News briefing")
    await wait(4200)
    await tvMenu("sport")
    mark("Cricket")
    await wait(3800)
    await tvMenu("home")
    await wait(1200)
    await page.keyboard.press("p")
    mark("Same seat screen, Chloe's profile")
    await wait(5000)
    await page.keyboard.press("p")
    await wait(1200)
  }
}

await click(demo("tv-arrive"))
mark("Arrival, pin unlocked")
await hold(cut === "long" ? 6500 : 5400)
await click(demo("tv-to-badge"))
mark("Pin detail in the app")
await hold(cut === "long" ? 4200 : 3600)
if (cut !== "30") {
  await scrollPhone(520)
  await wait(3000)
}
if (cut === "long") {
  await click(page.getByText("My pins", { exact: true }).first())
  mark("My pins")
  await wait(2500)
  await scrollPhone(330)
  await wait(1500)
  await click(demo("pin-night-shift"))
  mark("Pin in progress: Night Shift")
  await wait(3600)
  await scrollPhone(420)
  await wait(2600)
  await click(demo("tab-earn"))
  await wait(800)
  await scrollPhone(1700, 16)
  mark("Percentiles and friends")
  await wait(4200)
}
await click(demo("tab-redeem"))
mark("Tier ladder, progress to Diamond Exec")
await wait(cut === "30" ? 5200 : 2800)
if (cut !== "30") {
  await scrollPhone(600)
  await wait(2800)
  await click(demo("tab-profile"))
  mark("Profile, status points")
  await wait(3000)
  await click(demo("quick-card"))
  mark("Status card")
  await wait(2200)
  await click(demo("share-card"))
  await wait(2600)
  await page.keyboard.press("3")
  mark("What Cathay sees")
  await page.mouse.move(1900, 1070, { steps: 8 })
  await hold(cut === "short" ? 4600 : 6500)
}
const total = Number(((Date.now() - t0) / 1000 - startOffset).toFixed(1))

await context.close()
await browser.close()
const file = readdirSync(out).find((f) => f.endsWith(".webm") && !f.startsWith("journey"))
renameSync(`${out}/${file}`, `${out}/${name}.webm`)
writeFileSync(`${out}/${name}-marks.json`, JSON.stringify({ startOffset, total, marks }, null, 2))
console.log(JSON.stringify({ name, startOffset, total }))
