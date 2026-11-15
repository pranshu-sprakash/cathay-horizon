// Records Idea 2 only. Does not write journey-*.mp4.
// Usage: node scripts/record-idea2.mjs [outDir] [baseUrl]
import { chromium } from "playwright"
import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs"
import { POINTER } from "./pointer.mjs"

const out = process.argv[2] ?? "recording"
const base = process.argv[3] ?? "http://127.0.0.1:4317"
const HOLD = Number(process.env.HOLD ?? 1)
mkdirSync(out, { recursive: true })

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
    window.__title = () => {
      fadeOut(current);
      current = null;
      const card = document.createElement('div');
      Object.assign(card.style, { position: 'absolute', inset: 0, background: '#0d1211', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', color: '#fff' });
      card.innerHTML = '<img src="/brushwing-white.svg" style="width:64px;height:auto" alt="" /><p style="margin-top:36px;font-size:28px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7);font-weight:600">Cathay Hackathon 2026</p><p style="margin-top:18px;font-size:120px;line-height:1;font-weight:600;letter-spacing:-0.03em">Idea 2</p><p style="margin-top:28px;font-size:40px;line-height:1.25;color:rgba(255,255,255,.82);max-width:1100px">The flight remembers. Rewards are for flying more often.</p>';
      root.appendChild(card);
      card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out', fill: 'both' });
      current = card;
    };
    window.__end = (lines) => {
      document.getElementById('__pointer')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      fadeOut(current);
      current = null;
      const card = document.createElement('div');
      Object.assign(card.style, { position: 'absolute', inset: 0, background: '#f4f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px' });
      const wrap = document.createElement('div');
      Object.assign(wrap.style, { textAlign: 'center' });
      ;(Array.isArray(lines) ? lines : [lines]).forEach((line, i) => {
        const text = document.createElement('div');
        text.textContent = line;
        Object.assign(text.style, { fontSize: i === 0 ? '64px' : '40px', lineHeight: 1.15, fontWeight: i === 0 ? 600 : 500, color: '#18302d', letterSpacing: '-0.02em', marginTop: i ? '14px' : '0' });
        wrap.append(text);
        text.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 200 + i * 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      });
      const logo = document.createElement('img');
      logo.src = '/cathay-pacific-logo.svg';
      Object.assign(logo.style, { height: '56px', width: 'auto', marginTop: '48px' });
      card.append(wrap, logo);
      root.appendChild(card);
      card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out', fill: 'both' });
      logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1100, delay: 1200, easing: 'ease-out', fill: 'both' });
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
  await page.goto(`${base}/?fresh=1&bare=1&profile=anil&zoom=0&saved=1&${query}`)
  await page.waitForLoadState("networkidle")
  await pause(350)
}

await cut("view=phone&phone=confirm")
await cut("view=tv&tv=welcome")
await cut("view=crew")
await cut("view=phone&phone=confirm")
await pause(800)
const startOffset = (Date.now() - t0) / 1000

await page.evaluate(() => window.__title())
mark("Title: Idea 2")
await hold(4500)

await cut("view=phone&phone=confirm")
mark("Booking: confirm this night flight")
await cap(["One tap for tonight", "Daytime last week was different"])
await hold(3000)
await click(demo("confirm-trip"))
await cap(["Dal makhani, sleep, cricket", "He does not redo the long setup"])
await hold(3200)

await cut("view=phone&phone=airport")
mark("Airport: gate and time")
await cap(["Gate 23, boarding 19:25"])
await hold(2800)
await click(demo("open-lounge"))
mark("Lounge")
await cap(["The Pier already has his order"])
await hold(3000)

await cut("view=tv&tv=welcome")
mark("Seat 11A recognises him")
await cap(["Recognised at seat 11A", "No sign in on board"], "tv")
await hold(3600)

await cut("view=crew")
mark("Crew iPad already has 11A")
await cap(["Already on the crew iPad", "No new aircraft system"], "tv")
await hold(4000)

await cut("view=tv&tv=service")
mark("Inflight: meal, bed, cricket first")
await cap(["Meal, bed, cricket already on", "The TV only reorders what it has"], "tv-top")
await hold(4000)

await cut("view=tv&tv=home")
mark("Cricket first on StudioCX")
await cap(["Cricket already first"], "tv-top")
await hold(3200)

await cut("view=phone&phone=family")
mark("Family told he is down")
await cap(["After landing", "His family is told he is down"])
await hold(2400)
await click(demo("notify-family"))
await hold(2400)

await cut("view=phone&phone=debrief")
mark("Three-tap review")
await cap(["Three taps after the flight", "The next crew sees it"])
await hold(1400)
await click(demo("review-yes-meal"))
await hold(900)
await click(demo("review-yes-rest"))
await hold(900)
await click(demo("review-yes-screen"))
await hold(2800)

await cut("view=phone&phone=route")
mark("Route rewards, not membership")
await cap(["Route rewards, not his tier", "Pins from flying this route often"])
await hold(2800)
await page.locator('[data-demo="route-green"]').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }))
await pause(500)
await cap(["Green, every month: guest pass", "Gold, twice a year: no pass"])
await hold(2800)
await page.locator('[data-demo="route-gold"]').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }))
await pause(600)
await cap(["His Diamond tier does not change"])
await hold(3000)

await page.evaluate(() => window.__end(["Idea 2. The flight remembers.", "Rewards are for flying more often."]))
mark("End card")
await pause(4000)
await page.screenshot({ path: `${out}/idea-2-end-card.png` })
await pause(150)
const total = now()

await context.close()
await browser.close()
const file = readdirSync(out).find((f) => f.endsWith(".webm") && !f.startsWith("idea-2"))
renameSync(`${out}/${file}`, `${out}/idea-2-live.webm`)
writeFileSync(`${out}/idea-2-marks.json`, JSON.stringify({ startOffset, total, marks, clicks }, null, 2))
console.log(JSON.stringify({ startOffset, total, clicks: clicks.length }))
