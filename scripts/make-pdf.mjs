// Prints the submission document (/submission) to an A4 PDF, one section per page.
// Usage: node scripts/make-pdf.mjs <out.pdf> [baseUrl]   (PNG=dir also writes a preview image of every page)
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const out = process.argv[2] ?? "submission.pdf"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 })
await page.goto(`${base}/submission`)
await page.waitForLoadState("networkidle")
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)
if (process.env.PNG) {
  mkdirSync(process.env.PNG, { recursive: true })
  const pages = page.locator(".page")
  for (let i = 0; i < (await pages.count()); i++) await pages.nth(i).screenshot({ path: `${process.env.PNG}/page-${String(i + 1).padStart(2, "0")}.png` })
}
await page.emulateMedia({ media: "print" })
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log("done", out)
