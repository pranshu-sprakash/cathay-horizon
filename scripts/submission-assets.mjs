// Captures the screenshots used by the submission document (/submission) into public/submission/.
// Phone screens are cut to the device, seat screens and the Cathay view are full 1920×1080 frames.
// Usage: node scripts/submission-assets.mjs [baseUrl]   (ONLY=tv-map,shop to filter)
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const base = process.argv[2] ?? "http://127.0.0.1:4317"
const out = "public/submission"
mkdirSync(out, { recursive: true })
const only = process.env.ONLY?.split(",")

// [name, query, steps before the shot]
const phone = [
  ["phone-home", "phone=home&blank=1"],
  ["phone-meal", "phone=setup&step=0"],
  ["phone-rest", "phone=setup&step=1"],
  ["phone-screen", "phone=setup&step=3"],
  ["phone-review", "phone=setup&step=4"],
  ["phone-saved", "phone=saved&saved=1"],
  ["phone-recap", "phone=recap&saved=1&flown=1"],
  ["phone-pins", "phone=pins&saved=1&flown=1", async (p) => p.locator('[data-demo="pin-set-once"]').evaluate((el) => el.scrollIntoView({ block: "center" }))],
  ["phone-pin-detail", "phone=badge&badge=set-once&saved=1&flown=1", async (p) => p.waitForTimeout(1800)],
  ["phone-tiers", "phone=tiers&saved=1&flown=1", async (p) => p.waitForTimeout(1400)],
  ["phone-card", "phone=card&saved=1&flown=1"],
  ["phone-data", "phone=data&saved=1&flown=1"],
  ["phone-shop", "phone=shop&saved=1&flown=1"],
  ["phone-shop-item", "phone=shop&saved=1&flown=1", async (p) => p.click("[data-demo=shop-milk-tea]")],
  ["phone-shop-done", "phone=shop&saved=1&flown=1", async (p) => { await p.click("[data-demo=shop-milk-tea]"); await p.click("[data-demo=shop-buy]") }],
]
const wide = [
  ["tv-idle", "view=tv&tv=idle&saved=1"],
  ["tv-welcome", "view=tv&tv=welcome&saved=1", async (p) => p.waitForTimeout(3000)],
  ["tv-home", "view=tv&tv=home&saved=1"],
  ["tv-map", "view=tv&tv=map&saved=1"],
  ["tv-news", "view=tv&tv=news&saved=1"],
  ["tv-sport", "view=tv&tv=sport&saved=1"],
  ["tv-arrival", "view=tv&tv=arrival&saved=1", async (p) => p.waitForTimeout(2600)],
  ["cathay-sees", "view=cathay&saved=1"],
]

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
const go = async (q) => {
  await page.goto(`${base}/?fresh=1&bare=1&profile=anil&zoom=0&${q}`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(700)
}
for (const [name, q, act] of phone) {
  if (only && !only.some((o) => name.includes(o))) continue
  await go(`view=phone&${q}`)
  if (act) await act(page)
  await page.waitForTimeout(500)
  await page.locator(".rounded-\\[56px\\]").first().screenshot({ path: `${out}/${name}.png`, omitBackground: true })
}
await page.setViewportSize({ width: 1920, height: 1080 })
const flat = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [name, q, act] of wide) {
  if (only && !only.some((o) => name.includes(o))) continue
  await flat.goto(`${base}/?fresh=1&bare=1&profile=anil&zoom=0&${q}`)
  await flat.waitForLoadState("networkidle")
  await flat.waitForTimeout(700)
  if (act) await act(flat)
  await flat.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 86 })
}
await browser.close()
console.log("done", out)
