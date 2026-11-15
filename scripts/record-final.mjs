// Records the live part of the final cut (everything after the photo push-in), with captions and the end card.
// Usage: node scripts/record-final.mjs [outDir] [baseUrl]   (HOLD=1.0 scales every hold)
// Writes <outDir>/journey-final-live.webm, <outDir>/journey-final-marks.json (scenes, click times, startOffset)
// and <outDir>/final-end-card.png. scripts/make-final.mjs joins it to the push-in and adds the click sounds.
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
      box.animate([{ opacity: 0, transform: box.style.transform + ' translateY(10px)' }, { opacity: 1, transform: box.style.transform }], { duration: 360, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
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
await cut("view=phone&phone=tiers&saved=1&flown=1")
await cut("view=tv&tv=arrival&saved=1")
await cut("view=tv&tv=map&saved=1")
await cut("view=cathay&saved=1")
await cut("view=tv&tv=idle&saved=1")
await pause(900)
const startOffset = (Date.now() - t0) / 1000

// 2. Idle, then recognition
mark("Seat 11A idle")
await page.mouse.move(1560, 760, { steps: 10 })
await hold(900)
await press(1560, 760, 250)
mark("Recognises Mr Mathur, loads his profile")
await cap(["Recognised at seat 11A", "His profile loads, no sign in"], "tv")
await hold(4000)

// 3. Phone setup, every step
await cut("view=phone&phone=home&blank=1")
mark("Cathay app home")
await cap(["Set up once in the Cathay app"])
await page.mouse.move(1080, 700, { steps: 6 })
await hold(1500)
await click(demo("start-setup"))
mark("Setup: meal")
await cap(["Meal chosen once", "Served first, every flight"])
await hold(900)
await click(demo("opt-dal"))
await hold(700)
await click(demo("opt-early"))
await hold(1400)
await click(demo("next"))
mark("Setup: rest")
await cap(["Do not disturb after dinner", "Bed made, woken on time"])
await hold(700)
await click(page.locator('[data-demo="dnd"] [role="switch"]'))
await hold(450)
await click(page.locator('[data-demo="bed"] [role="switch"]'))
await hold(450)
await click(demo("choice-45 min before landing"))
await hold(1400)
await click(demo("next"))
mark("Setup: seat")
await cap(["Window seat, quiet zone"])
await hold(1300)
await click(demo("next"))
mark("Setup: screen")
await cap(["Cricket and news first"])
await hold(1300)
await click(demo("next"))
mark("Review")
await cap(["One summary to check"])
await hold(1500)
await click(demo("save"))
mark("Saved, sent to seat 11A")
await cap(["Sent to seat 11A"])
await hold(1700)
await click(demo("to-tv"))

// 4. Back on the seat screen
mark("Seat screen home")
await cap(["His screen, already set up"], "tv")
await hold(1500)
await click(demo("tv-menu"))
mark("Menu drawer")
await cap(["Everything one tap away"], "tv")
await hold(1300)
await click(demo("menu-flight-map"))
mark("Flight map with his meal and rest")
await cap(["His meal and rest, on the map", "Crew work to the same plan"], "tv-top")
await hold(3400)
await click(demo("tv-menu"))
await hold(500)
await click(demo("menu-news"))
mark("News: his briefing")
await cap(["Briefing picked for him", "Downloaded at the gate"], "tv")
await hold(2900)
await click(demo("tv-menu"))
await hold(500)
await click(demo("menu-sport"))
mark("Cricket")
await cap(["Live cricket first"], "tv")
await hold(2500)
await cap([])

// 5. Same seat, different passenger
await page.keyboard.press("p")
mark("Same seat, different passenger: Ms Leung")
await pause(3000)
await cap(["Her language, her films", "Nothing of his carries over"], "tv")
await hold(2300)
await cap([])
await page.keyboard.press("Shift+P")
mark("Back to Mr Mathur")
await pause(3100)

// 6. Welcome to Delhi, pins unlock
await click(demo("tv-arrive"))
mark("Welcome to Delhi, pins unlock")
await cap(["Three pins unlocked on landing", "Diamond Exec reached"], "tv-top")
await hold(4800)

// 7. Pins, detail, where he stands, tier ladder
await cut("view=phone&phone=pins&saved=1&flown=1")
mark("His pins")
await cap(["15 pins to collect", "Each adds status points"])
await hold(1300)
await page.locator('[data-demo="pin-set-once"]').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }))
await pause(1000)
await hold(700)
await click(demo("pin-set-once"))
mark("Pin detail: Set Once")
await cap(["Set Once, earned on CX695", "Held by 14% of members"])
await hold(2600)
await click(page.getByText("My pins", { exact: true }).first())
await pause(400)
mark("Where he stands, anonymous percentiles")
await scrollToDemo("text=Where you stand")
await cap(["Top 1% on Hong Kong to Delhi", "Anonymous, nobody is named"])
await hold(2900)
await click(demo("tab-redeem"))
mark("Tier ladder: Diamond to Diamond Exec")
await cap(["Pins push him past 2,400", "Diamond Exec perks unlock"])
await hold(4600)

// 8. Status card
await click(demo("tab-profile"))
await hold(600)
await click(demo("quick-card"))
mark("Status card: Diamond Exec")
await cap(["His new status card", "Ready to share"])
await hold(2600)

// 9. What Cathay sees
await cut("view=cathay&saved=1")
mark("What Cathay sees before departure")
await cap(["Meal loads and crew plans", "From profiles set once"], "tv")
await hold(3600)

// 10. Closing line, logo last
await page.evaluate(() => window.__end("Set it once. Every flight remembers."))
mark("End line, Cathay Pacific logo")
await pause(3000)
await page.screenshot({ path: `${out}/final-end-card.png` })
await pause(1000)
const total = now()

await context.close()
await browser.close()
const file = readdirSync(out).find((f) => f.endsWith(".webm") && !f.startsWith("journey"))
renameSync(`${out}/${file}`, `${out}/journey-final-live.webm`)
writeFileSync(`${out}/journey-final-marks.json`, JSON.stringify({ startOffset, total, marks, clicks }, null, 2))
console.log(JSON.stringify({ startOffset, total, clicks: clicks.length }))
