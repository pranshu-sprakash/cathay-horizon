// Builds the final cut: title card and photo push-in onto seat 11A (rendered offline) + live recording + a UI click on every click, AAC audio.
// Usage: node scripts/make-final.mjs <workDir> <mediaDir> [baseUrl]   (SKIP_SEAT=1 reuses rendered push-in frames;
// CUT=minute records with scripts/record-minute.mjs instead of record-final.mjs)
// Writes <mediaDir>/journey-<cut>.mp4, <mediaDir>/journey-<cut>-marks.json and <mediaDir>/screens/<cut>-end-card.png.
import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"

const work = process.argv[2] ?? "final-work"
const media = process.argv[3] ?? "media"
const base = process.argv[4] ?? "http://127.0.0.1:4317"
const FPS = 30
const CUT = process.env.CUT ?? "final"
const RATE = 48000
mkdirSync(`${media}/screens`, { recursive: true })
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" })

if (!process.env.SKIP_SEAT || !existsSync(`${work}/seat/0000.png`)) execFileSync("node", ["scripts/render-seat.mjs", `${work}/seat`, base], { stdio: "inherit", env: { ...process.env, INTRO: "1" } })
const seatFrames = readdirSync(`${work}/seat`).filter((f) => f.endsWith(".png")).length
const seatDur = seatFrames / FPS

run("node", [`scripts/record-${CUT}.mjs`, work, base])
const live = JSON.parse(readFileSync(`${work}/journey-${CUT}-marks.json`, "utf8"))
const total = seatDur + live.total

// A short, soft UI tick: a damped high partial over a quieter low body, with a few samples of noise for the attack.
function tick() {
  const n = Math.round(RATE * 0.045)
  const out = new Float32Array(n)
  let seed = 7
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    seed = (seed * 16807) % 2147483647
    const noise = (seed / 2147483647) * 2 - 1
    out[i] =
      0.5 * Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t / 0.004) +
      0.35 * Math.sin(2 * Math.PI * 820 * t) * Math.exp(-t / 0.009) +
      0.25 * noise * Math.exp(-t / 0.0008)
  }
  return out
}
const click = tick()
const samples = new Float32Array(Math.ceil((total + 0.5) * RATE))
for (const c of live.clicks) {
  const at = Math.round((seatDur + c) * RATE)
  for (let i = 0; i < click.length && at + i < samples.length; i++) samples[at + i] += click[i] * 0.22
}
const wav = Buffer.alloc(44 + samples.length * 2)
wav.write("RIFF", 0)
wav.writeUInt32LE(36 + samples.length * 2, 4)
wav.write("WAVEfmt ", 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(RATE, 24)
wav.writeUInt32LE(RATE * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write("data", 36)
wav.writeUInt32LE(samples.length * 2, 40)
samples.forEach((v, i) => wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2))
writeFileSync(`${work}/clicks.wav`, wav)

run("ffmpeg", [
  "-y", "-loglevel", "error",
  "-framerate", String(FPS), "-i", `${work}/seat/%04d.png`,
  "-ss", String(live.startOffset), "-i", `${work}/journey-${CUT}-live.webm`,
  "-i", `${work}/clicks.wav`,
  "-filter_complex", `[0:v]fps=${FPS},format=yuv420p[s];[1:v]fps=${FPS},setpts=PTS-STARTPTS,format=yuv420p[l];[s][l]concat=n=2:v=1:a=0[v];[2:a]atrim=0:${total.toFixed(3)}[a]`,
  "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "160k", "-ar", String(RATE),
  "-movflags", "+faststart",
  `${media}/journey-${CUT}.mp4`,
])

const marks = [{ t: 0, label: "Title card on the cabin photo, then the push-in onto seat 11A" }, ...live.marks.map((m) => ({ ...m, t: Number((m.t + seatDur).toFixed(1)) }))]
writeFileSync(`${media}/journey-${CUT}-marks.json`, JSON.stringify({ total: Number(total.toFixed(1)), seatPushIn: seatDur, marks, clicks: live.clicks.map((c) => Number((c + seatDur).toFixed(2))) }, null, 2))
copyFileSync(`${work}/${CUT}-end-card.png`, `${media}/screens/${CUT}-end-card.png`)
console.log(JSON.stringify({ total: Number(total.toFixed(1)), seat: seatDur, clicks: live.clicks.length }))
