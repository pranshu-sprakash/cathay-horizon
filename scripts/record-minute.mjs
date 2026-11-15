// Records the live part of the one-minute cut (everything after the photo push-in), with captions and the end card.
// One passenger, the whole journey: set up at home, recognised at the seat, flight map, briefing and sport, pins on
// landing, the tier they unlock, Cathay Shop for the flight home, what Cathay sees.
// Usage: node scripts/record-minute.mjs [outDir] [baseUrl]   (HOLD=1.0 scales every hold)
// Writes <outDir>/journey-minute-live.webm, <outDir>/journey-minute-marks.json and <outDir>/minute-end-card.png.
// Build the video with: CUT=minute node scripts/make-final.mjs <workDir> <mediaDir>
import { chromium } from "playwright"
import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import { POINTER } from "./pointer.mjs"

const out = process.argv[2] ?? "recording"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
const HOLD = Number(process.env.HOLD ?? 1)
mkdirSync(out, { recursive: true })

// Captions: bullets beside the phone, or a white rounded box over the seat screen (bottom right, or top right
// where the screen has content low down). Plus the closing card.
const CAPTIONS = `(() => {
  addEventListener('DOMContentLoaded', () => {
    const font = getComputedStyle(document.body).fontFamily;
    const root = document.createElement('div');
    root.id = '__cap';
    Object.assign(root.style, { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2147483600, fontFamily: font });
    document.documentElement.appendChild(root);
    let current = null;
    const fadeOut = (el) => { if (!el) return; el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => el.remove(); };
    const bullet = (text, size) => {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: size * 0.5 + 'px', fontSize: size + 'px', lineHeight: 1.25, fontWeight: 500, color: '#18302d', whiteSpace: 'nowrap' });
      const dot = document.createElement('span');
      Object.assign(dot.style, { flex: 'none', width: size * 0.32 + 'px', height: size * 0.32 + 'px', borderRadius: '50%', background: '#006564' });
      const t = document.createElement('span');
      t.textContent = text;
      row.append(dot, t);
      return row;
    };
    window.__cap = (lines, kind) => {
      fadeOut(current);
      current = null;
      if (!lines || !lines.length) return;
      const box = document.createElement('div');
      if (kind === 'tv' || kind === 'tv-top') {
        Object.assign(box.style, { position: 'absolute', right: '64px', padding: '26px 34px', borderRadius: '24px', background: '#fff',
          boxShadow: '0 14px 40px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', gap: '12px' });
        if (kind === 'tv') box.style.bottom = '118px'; else box.style.top = '132px';
        lines.forEach((l) => box.append(bullet(l, 31)));
      } else {
        Object.assign(box.style, { position: 'absolute', left: '1290px', top: '540px', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '22px' });
        lines.forEach((l) => box.append(bullet(l, 40)));
      }
      root.appendChild(box);
      box.animate([{ opacity: 0, transform: box.style.transform + ' translateY(10px)' }, { opacity: 1, transform: box.style.transform }], { duration: 360, delay: 240, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      current = box;
    };
    window.__end = (line) => {
      document.getElementById('__pointer')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      fadeOut(current);
      current = null;
      const card = document.createElement('div');
      Object.assign(card.style, { position: 'absolute', inset: 0, background: '#f4f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '72px' });
      const text = document.createElement('div');
      text.textContent = line;
      Object.assign(text.style, { fontSize: '76px', lineHeight: 1.1, fontWeight: 600, color: '#18302d', letterSpacing: '-0.02em' });
      const logo = document.createElement('img');
      logo.src = '/cathay-pacific-logo.svg';
      Object.assign(logo.style, { height: '64px', width: 'auto' });
      card.append(text, logo);
      root.appendChild(card);
      card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out', fill: 'both' });
      text.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: 1500, easing: 'ease-out', fill: 'both' });
    };
  });
})();`

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
})
const page = await context.newPage()
await page.addInitScript(POINTER)
await page.addInitScript(CAPTIONS)
const t0 = Date.now()

const hold = (ms) => page.waitForTimeout(Math.round(ms * HOLD))
const pause = (ms) => page.waitForTimeout(ms)
const now = () => Number(((Date.now() - t0) / 1000 - startOffset).toFixed(3))
const marks = []
const clicks = []
const mark = (label) => marks.push({ t: Number(now().toFixed(1)), label })
const cap = (lines, kind = "phone") => page.evaluate(([l, k]) => window.__cap(l, k), [lines, kind])

// The arrow settles just inside the target's bottom-right corner, then presses.
async function press(x, y, wait) {
  await page.mouse.move(x, y, { steps: 13 })
  await pause(wait)
  await page.mouse.down()
  clicks.push(now())
  await page.mouse.up()
}
async function click(locator, wait = 220) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await press(b.x + b.width - Math.min(14, b.width * 0.15), b.y + b.height - Math.min(10, b.height * 0.25), wait)
}
const demo = (id) => page.locator(`[data-demo="${id}"]`).first()
async function cut(query) {
  await page.goto(`${base}/?fresh=1&bare=1&profile=anil&zoom=0&${query}`)
  await page.waitForLoadState("networkidle")
}
async function scrollToDemo(selector) {
  await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }))
  await pause(800)
}

// Warm the caches, then open on the seat screen exactly as the push-in leaves it.
await cut("view=phone&phone=shop&saved=1&flown=1")
await cut("view=phone&phone=tiers&saved=1&flown=1")
await cut("view=tv&tv=arrival&saved=1")
await cut("view=tv&tv=map&saved=1")
await cut("view=cathay&saved=1")
await cut("view=tv&tv=idle&saved=1")
await pause(900)
const startOffset = (Date.now() - t0) / 1000

// 1. Seat 11A knows him
await page.mouse.move(1560, 760, { steps: 8 })
await press(1560, 760, 150)
mark("Recognised at seat 11A")
await cap(["Recognised at seat 11A", "No sign in, no setup on board"], "tv")
await hold(2400)

// 2. Before the trip: set once in the Cathay app
await cut("view=phone&phone=home&blank=1")
mark("Before the trip: Cathay app")
await cap(["Before the trip", "Set once in the Cathay app"])
await page.mouse.move(1080, 700, { steps: 6 })
await hold(1200)
await click(demo("start-setup"))
mark("Setup: meal")
await cap(["Meal picked once", "Served first, every flight"])
await hold(600)
await click(demo("opt-dal"))
await hold(450)
await click(demo("opt-early"))
await hold(900)
await click(demo("next"))
mark("Setup: rest")
await cap(["Left alone after dinner", "Bed made, woken on time"])
await hold(500)
await click(page.locator('[data-demo="dnd"] [role="switch"]'))
await hold(350)
await click(page.locator('[data-demo="bed"] [role="switch"]'))
await hold(350)
await click(demo("choice-45 min before landing"))
await hold(800)
await click(demo("next"))
mark("Setup: seat and screen")
await cap(["Seat and screen too"])
await hold(450)
await click(demo("next"))
await hold(450)
await click(demo("next"))
mark("Review and save")
await cap(["One summary to check"])
await hold(900)
await click(demo("save"))
mark("Sent to seat 11A and the crew")
await cap(["Sent to seat 11A", "And to the crew plan"])
await hold(1600)
await click(demo("to-tv"))

// 3. On board: flight map, briefing, sport
mark("On board: flight map with his plan")
await cap(["On board, his plan on the map", "Crew work to the same plan"], "tv-top")
await hold(2700)
await click(demo("tv-menu"))
await hold(350)
await click(demo("menu-news"))
mark("His briefing")
await cap(["Briefing picked for him", "Downloaded at the gate"], "tv")
await hold(1900)
await click(demo("tv-menu"))
await hold(350)
await click(demo("menu-sport"))
mark("Live cricket")
await cap(["Live cricket first"], "tv")
await hold(1900)

// 4. Landing: pins unlock
await click(demo("tv-arrive"))
mark("Landing in Delhi, pins unlock")
await cap(["Landing: three pins unlocked", "Diamond Exec reached"], "tv-top")
await hold(3800)

// 5. Pins, a game in every flight
await cut("view=phone&phone=pins&saved=1&flown=1")
mark("His pins, Set Once new on CX695")
await cap(["15 pins to collect", "Each one adds status points"])
await hold(700)
await page.locator('[data-demo="pin-set-once"]').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }))
await pause(500)
await cap(["Set Once, new on CX695", "Held by 14% of members"])
await hold(1900)
await click(demo("tab-redeem"))
mark("Tier ladder: Diamond Exec")
await cap(["Pins push him to Diamond Exec", "New perks unlock"])
await hold(2500)

// 6. After the trip: Cathay Shop
await cut("view=phone&phone=shop&saved=1&flown=1")
mark("After the trip: Cathay Shop from his flight")
await cap(["After the trip: Cathay Shop", "Picked from his flight"])
await hold(1200)
await click(demo("shop-milk-tea"))
await hold(600)
await scrollToDemo('[data-demo="get-seat"]')
await click(demo("shop-buy"))
mark("Paid in Asia Miles, waiting at seat 11A on CX694")
await cap(["Paid with Asia Miles", "Waiting at 11A on the way home"])
await hold(2600)

// 7. What Cathay sees
await cut("view=cathay&saved=1")
mark("What Cathay sees before departure")
await cap(["Meal loads and crew plans", "From profiles set once"], "tv")
await hold(2900)

// 8. Closing line, logo last
await page.evaluate(() => window.__end("Set it once. Every flight remembers."))
mark("End line, Cathay Pacific logo")
await pause(2800)
await page.screenshot({ path: `${out}/minute-end-card.png` })
await pause(150)
const total = now()

await context.close()
await browser.close()
const file = readdirSync(out).find((f) => f.endsWith(".webm") && !f.startsWith("journey"))
renameSync(`${out}/${file}`, `${out}/journey-minute-live.webm`)
writeFileSync(`${out}/journey-minute-marks.json`, JSON.stringify({ startOffset, total, marks, clicks }, null, 2))
console.log(JSON.stringify({ startOffset, total, clicks: clicks.length }))
