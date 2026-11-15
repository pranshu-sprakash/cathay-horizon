// One screenshot: node scripts/shot.mjs out.png 'query' [waitMs] [p = press p after load]
import { chromium } from "playwright"
const [,, out, q, wait = "800", act = ""] = process.argv
const b = await chromium.launch({ args: ["--font-render-hinting=none"] }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await p.goto(`http://127.0.0.1:4317/?fresh=1&bare=1&zoom=0&${q}`); await p.waitForLoadState("networkidle")
if (act === "p") { await p.waitForTimeout(600); await p.keyboard.press("p") }
await p.waitForTimeout(Number(wait)); await p.screenshot({ path: out }); await b.close()
