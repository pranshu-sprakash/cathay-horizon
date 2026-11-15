// Captures the app screenshots used inside the pitch slides into public/pitch/.
// Usage: node scripts/pitch-assets.mjs [baseUrl]   (dev server must be running)
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const base = process.argv[2] ?? "http://127.0.0.1:4317"
const out = "public/pitch"
mkdirSync(out, { recursive: true })
const q = `${base}/?fresh=1&bare=1&zoom=0&profile=anil`

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [name, query, wait] of [
  ["tv-recognised", "view=tv&tv=welcome&saved=1", 3400],
  ["tv-home", "view=tv&tv=home&saved=1", 800],
]) {
  await tv.goto(`${q}&${query}`)
  await tv.waitForLoadState("networkidle")
  await tv.waitForTimeout(wait)
  await tv.screenshot({ path: `${out}/${name}.jpg`, quality: 88, type: "jpeg" })
}
const phone = await browser.newPage({ viewport: { width: 520, height: 960 }, deviceScaleFactor: 2 })
for (const [name, query, wait] of [
  ["phone-setup", "phone=setup&step=0", 600],
  ["phone-pin", "phone=badge&badge=set-once&saved=1&flown=1", 2200],
  ["phone-data", "phone=data&saved=1", 600],
]) {
  await phone.goto(`${q}&device=1&${query}`)
  await phone.waitForLoadState("networkidle")
  await phone.evaluate(() => (document.body.style.background = "transparent"))
  await phone.waitForTimeout(wait)
  await phone.locator("[data-device-only] > div").screenshot({ path: `${out}/${name}.png`, omitBackground: true })
}
await browser.close()
console.log("done")
