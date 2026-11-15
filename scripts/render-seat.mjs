// Renders the photo push-in onto seat 11A offline, one fully rasterised frame at a time, so headless capture never drops frames.
// Usage: node scripts/render-seat.mjs <outDir> [baseUrl]   (INTRO=1 adds the title hold; FRAMES=0,40,80 renders only those frames)
// Encode: ffmpeg -framerate 30 -i <outDir>/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p seat.mp4
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const out = process.argv[2] ?? "seat-frames"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
const FPS = 30
const INTRO = process.env.INTRO === "1"
/** Matches photoZoomMs() in src/components/seat-zoom-photo.tsx. */
const DURATION = (INTRO ? 3200 : 200) + 3300 + 1000 + 150
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ["--font-render-hinting=none", "--force-gpu-mem-available-mb=8192", "--force-gpu-mem-discardable-limit-mb=4096"] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(`${base}/?fresh=1&bare=1&profile=anil&view=tv&tv=idle&saved=1&zoom=0`)
await page.waitForLoadState("networkidle")
await page.waitForTimeout(600)
await page.goto(`${base}/?fresh=1&bare=1&profile=anil&view=tv&tv=idle&saved=1&zoom=1&zoomstill=1${INTRO ? "&intro=1" : ""}`)
await page.waitForLoadState("networkidle")
await page.locator("[data-demo=seat-zoom][data-ready='1']").waitFor()
await page.waitForTimeout(400)
await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()))
await page.waitForTimeout(800)

const total = Math.round((DURATION / 1000) * FPS)
const only = process.env.FRAMES?.split(",").map(Number)
for (let f = 0; f <= total; f++) {
  if (only && !only.includes(f)) continue
  await page.evaluate((ms) => {
    document.getAnimations().forEach((a) => (a.currentTime = ms))
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, (f * 1000) / FPS)
  await page.waitForTimeout(f === 0 ? 800 : 90)
  await page.screenshot({ path: `${out}/${String(f).padStart(4, "0")}.png` })
}
await browser.close()
console.log("done", out, total + 1, "frames")
