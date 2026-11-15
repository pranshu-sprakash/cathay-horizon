// Builds Idea 3 only. Writes idea-3.mp4. Never writes journey-*.mp4 or idea-2.mp4.
// Usage: node scripts/make-idea3.mjs <workDir> <outMp4> [baseUrl]
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const work = process.argv[2] ?? "/tmp/idea3-work"
const outMp4 = process.argv[3] ?? "/cursor/stores/bc-90e89bae-4cd4-4794-a9ea-98aac9de4282/media/idea-3.mp4"
if (/idea-2|journey/.test(outMp4)) throw new Error("Refusing to write over Idea 1 or Idea 2")
const base = process.argv[4] ?? "http://127.0.0.1:4317"
const FPS = 30
const RATE = 48000
mkdirSync(work, { recursive: true })
mkdirSync(dirname(outMp4), { recursive: true })

execFileSync("node", ["scripts/record-idea3.mjs", work, base], { stdio: "inherit", env: { ...process.env, HOLD: process.env.HOLD ?? "1.32" } })
const live = JSON.parse(readFileSync(`${work}/idea-3-marks.json`, "utf8"))
const total = live.total

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
  const at = Math.round(c * RATE)
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

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-ss", String(live.startOffset), "-i", `${work}/idea-3-live.webm`,
  "-i", `${work}/clicks.wav`,
  "-filter_complex", `[0:v]fps=${FPS},setpts=PTS-STARTPTS,format=yuv420p[v];[1:a]atrim=0:${total.toFixed(3)}[a]`,
  "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "160k", "-ar", String(RATE),
  "-movflags", "+faststart",
  outMp4,
], { stdio: "inherit" })

writeFileSync(outMp4.replace(/\.mp4$/, "-marks.json"), JSON.stringify({ total: Number(total.toFixed(1)), marks: live.marks, clicks: live.clicks }, null, 2))
console.log(JSON.stringify({ out: outMp4, total: Number(total.toFixed(1)), clicks: live.clicks.length }))
