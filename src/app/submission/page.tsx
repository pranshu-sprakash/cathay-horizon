/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import "./submission.css"

export const metadata: Metadata = {
  title: "Set it once. Every flight remembers. · Submission",
  description: "Cathay Hackathon 2026, Reimagining the Premium Travel Experience: solution idea, preliminary design, architecture and technology.",
}

const TOTAL = 14

function Page({ n, children, plain }: { n: number; children: React.ReactNode; plain?: boolean }) {
  return (
    <section className="page">
      {!plain && (
        <header className="mb-[7mm] flex items-center justify-between border-b border-[#dfe3e2] pb-[3mm] text-[10px] text-[#5d6766]">
          <span className="flex items-center gap-2">
            <img src="/brushwing.svg" alt="" className="h-[11px] w-auto" />
            Cathay Hackathon 2026 · Reimagining the Premium Travel Experience
          </span>
          <span>Flight profile</span>
        </header>
      )}
      {children}
      <footer className="absolute bottom-[9mm] left-[16mm] right-[16mm] flex justify-between text-[9.5px] text-[#7c8786]">
        <span>Concept by Pratish Vyas. Not affiliated with Cathay Pacific. Passenger and figures are fictional unless a source is given.</span>
        <span>
          {n} / {TOTAL}
        </span>
      </footer>
    </section>
  )
}

function Keywords({ words }: { words: string[] }) {
  return (
    <div className="mb-[5mm] flex flex-wrap gap-1.5">
      {words.map((w) => (
        <span key={w} className="rounded-full border border-[#b8d3cf] bg-[#eef5f3] px-2.5 py-[2px] text-[10.5px] font-medium text-jade-deep">
          {w}
        </span>
      ))}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase text-jade">{children}</p>
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-[3mm] mt-1 text-[27px] font-semibold leading-[1.15] text-ink">{children}</h1>
}

function H2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-1.5 text-[15px] font-semibold leading-snug text-ink ${className ?? ""}`}>{children}</h2>
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[12.5px] leading-[1.55] text-[#2d3635] ${className ?? ""}`}>{children}</p>
}

function Tag({ children, tone = "sim" }: { children: React.ReactNode; tone?: "sim" | "source" }) {
  return (
    <span className={tone === "sim" ? "ml-1 rounded-[3px] border border-[#b9a46b] bg-[#fbf6e8] px-1 py-px align-middle text-[9px] font-semibold text-[#6f5a1c]" : "ml-1 align-super text-[9px] font-semibold text-jade"}>
      {children}
    </span>
  )
}

function Phone({ src, caption, k, h = "h-[78mm]" }: { src: string; caption: string; k?: string; h?: string }) {
  return (
    <figure className="flex flex-col items-center">
      <img src={src} alt={caption} className={`${h} w-auto`} />
      <figcaption className="mt-2 text-center text-[11px] leading-[1.4] text-[#3c4746]">
        {k && <span className="font-semibold text-jade-deep">{k} </span>}
        {caption}
      </figcaption>
    </figure>
  )
}

function Wide({ src, caption, k }: { src: string; caption: string; k?: string }) {
  return (
    <figure>
      <img src={src} alt={caption} className="w-full rounded-[6px]" />
      <figcaption className="mt-1.5 text-[11px] leading-[1.4] text-[#3c4746]">
        {k && <span className="font-semibold text-jade-deep">{k} </span>}
        {caption}
      </figcaption>
    </figure>
  )
}

function Box({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[8px] border border-[#dfe3e2] bg-[#f7f8f8] px-4 py-3 ${className ?? ""}`}>
      {title && <p className="mb-1 text-[12.5px] font-semibold text-ink">{title}</p>}
      <div className="text-[11.5px] leading-[1.5] text-[#2d3635]">{children}</div>
    </div>
  )
}

export default function Submission() {
  return (
    <main className="submission">
      {/* 1. Cover */}
      <Page n={1} plain>
        <div className="flex items-center justify-between">
          <img src="/cathay-pacific-logo.svg" alt="Cathay Pacific" className="h-[9mm] w-auto" />
          <span className="text-[11px] text-[#5d6766]">Cathay Hackathon 2026 · Initial submission</span>
        </div>
        <div className="mt-[16mm]">
          <Eyebrow>Challenge 1 · Premium Travel</Eyebrow>
          <p className="mt-1 text-[15px] text-[#3c4746]">Reimagining the Premium Travel Experience</p>
          <h1 className="mt-[8mm] text-[46px] font-semibold leading-[1.05] text-ink">
            Set it once.
            <br />
            Every flight remembers.
          </h1>
          <p className="mt-[6mm] max-w-[150mm] text-[16px] leading-[1.5] text-[#2d3635]">
            A <b>flight profile</b> in the Cathay app. The passenger sets meal, rest, seat and screen once. Every booking, every seat screen and every crew briefing after that is ready before he boards, and the habit is rewarded with <b>pins</b>, <b>status points</b> and <b>Cathay Shop</b> picks from the flight.
          </p>
        </div>
        <img src="/submission/seat-photo.jpg" alt="Business Class suite with the seat screen showing seat 11A" className="mt-[10mm] h-[92mm] w-full rounded-[8px] object-cover" />
        <div className="mt-[8mm] grid grid-cols-3 gap-4">
          {[
            ["Personalised", "One profile, applied to every flight, in every cabin touchpoint."],
            ["Seamless", "No sign in at the seat. Recognised from the boarding pass."],
            ["Anticipatory", "Meal loaded, bed made and wake-up timed before he asks."],
          ].map(([k, v]) => (
            <div key={k} className="border-t-2 border-jade pt-2">
              <p className="text-[14px] font-semibold text-jade-deep">{k}</p>
              <p className="mt-0.5 text-[12px] leading-[1.45] text-[#3c4746]">{v}</p>
            </div>
          ))}
        </div>
        <p className="absolute bottom-[16mm] left-[16mm] text-[11px] text-[#5d6766]">Concept by Pratish Vyas · Demo video: one minute · Interactive prototype built in Next.js</p>
      </Page>

      {/* 2. Summary */}
      <Page n={2}>
        <Eyebrow>Summary</Eyebrow>
        <H1>The idea on one page</H1>
        <Keywords words={["Flight profile", "Set once", "Seat recognition", "Crew card", "Pins", "Diamond Exec", "Cathay Shop", "Pilot: HKG to DEL"]} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <H2>Problem</H2>
            <P>
              Premium travellers fly the same way again and again, yet <b>every flight starts from zero</b>. Meals are chosen per booking, the seat screen opens on a generic home page, and crew ask the same questions on every sector. Our passenger, Mr Mathur, flies Hong Kong to Delhi 38 times a year and repeats himself 38 times.
            </P>
          </div>
          <div>
            <H2>Solution</H2>
            <P>
              A <b>flight profile</b> in the Cathay app with four settings: <b>meal</b>, <b>rest</b>, <b>seat</b> and <b>screen</b>. Set once, it is applied automatically to every booking, sent to the seat screen and the crew tablet, and reused on every flight after.
            </P>
          </div>
          <div>
            <H2>The whole journey</H2>
            <P>
              <b>Before</b>: set up in four steps. <b>Boarding</b>: seat 11A recognises him from his boarding pass. <b>On board</b>: his meal and rest on the flight map, his briefing and live cricket first. <b>Landing</b>: pins unlock. <b>After</b>: Cathay Shop offers what he enjoyed, delivered to his seat on the flight home.
            </P>
          </div>
          <div>
            <H2>Why Cathay, why now</H2>
            <P>
              Cathay already runs <b>Choose My Meal</b> and the Aria Suite&apos;s 24-inch 4K screen is designed as the control centre of the suite<Tag tone="source">3, 4</Tag>. The 2027 membership programme brings <b>Diamond Exec</b> and a calendar cycle, a natural moment to reward habits, not only miles.
            </P>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            ["4", "settings, set once"],
            ["0", "sign-ins at the seat"],
            ["3", "pins earned on one flight"],
            ["1", "route to pilot first"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-[8px] bg-jade px-3 py-3 text-white">
              <p className="text-[26px] font-semibold leading-none">{n}</p>
              <p className="mt-1 text-[11px] leading-[1.35] text-white/85">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Phone src="/submission/phone-review.png" k="Set" caption="Four steps in the Cathay app" />
          <Phone src="/submission/phone-saved.png" k="Sent" caption="To seat 11A and the crew plan" />
          <Phone src="/submission/phone-shop-done.png" k="Rewarded" caption="Pins, then Cathay Shop for the flight home" />
        </div>
      </Page>

      {/* 3. Discover */}
      <Page n={3}>
        <Eyebrow>01 Discover insights</Eyebrow>
        <H1>What we observed, and what it means</H1>
        <Keywords words={["Customer", "Business", "Market and competitor", "Trend and technology", "Observation to insight"]} />
        <P className="mb-4">We used the four exploration areas from the Digital Experience team&apos;s product discovery framework. Each row turns an observation into an insight we can design for.</P>
        <table className="w-full border-collapse text-[11.5px] leading-[1.45]">
          <thead>
            <tr className="border-b-2 border-jade text-left text-[11px] text-[#5d6766]">
              <th className="w-[26mm] py-1.5 pr-3 font-semibold">Area</th>
              <th className="py-1.5 pr-3 font-semibold">Observation</th>
              <th className="py-1.5 font-semibold">Insight</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Customer", <>71% of consumers expect personalised interactions and 76% are frustrated when they do not get them.<Tag tone="source">1</Tag></>, "Premium passengers notice when Cathay forgets them. Remembering is the baseline, not a bonus."],
              ["Customer", <>The main reason people pay for Business or First is to lie flat and get a good night&apos;s sleep.<Tag tone="source">2</Tag></>, "Rest is the product. Do not disturb, bed made and a timed wake-up matter more than another menu item."],
              ["Business", <>Cathay&apos;s Choose My Meal opens 10 days and closes 24 hours before each flight, one booking at a time.<Tag tone="source">3</Tag></>, "The capability exists, but frequent flyers must repeat it for every flight. A standing choice removes the work."],
              ["Business", <>Untouched food and drink is 18% of all cabin waste; IATA puts the cost near US$6 billion a year.<Tag tone="source">5, 6</Tag></>, "Loading to known choices, not fixed ratios, cuts waste and stops the favourite dish running out."],
              ["Market", <>Cathay carried about 16.0 million passengers in the first half of 2026, and travellers show high shopping intent around a trip.<Tag tone="source">7</Tag></>, "Cathay Shop can sell what passengers actually experienced on board, at the moment they remember it."],
              ["Technology", <>The Aria Suite&apos;s 24-inch 4K screen also controls seat position and lighting, and pairs Bluetooth headphones.<Tag tone="source">4</Tag></>, "The seat screen is already the suite's control centre. A profile can set it up before he sits down."],
              ["Trend", "Loyalty programmes now reward recognition and progression, not only distance. Cathay's 2027 programme adds Diamond Exec and rollover of points.", "Pins that reward good habits (a saved profile, rest mode) fit the 2027 principles of simplicity, progression and recognition."],
            ].map(([a, o, i], idx) => (
              <tr key={idx} className="border-b border-[#e3e7e6] align-top">
                <td className="py-2 pr-3 font-semibold text-jade-deep">{a}</td>
                <td className="py-2 pr-3 text-[#2d3635]">{o}</td>
                <td className="py-2 font-medium text-ink">{i}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Box title="Insight that drives the concept" className="mt-5 border-jade/40 bg-[#eef5f3]">
          Frequent premium travellers already know exactly how they like to fly. The friction is not choice, it is <b>repetition</b>. If Cathay remembers once, every touchpoint can anticipate.
        </Box>
      </Page>

      {/* 4. Frame the problem */}
      <Page n={4}>
        <Eyebrow>02 Frame the problem</Eyebrow>
        <H1>Every flight resets</H1>
        <Keywords words={["Problem statement", "Persona", "Pains", "Business outcome", "Why now", "How might we"]} />
        <div className="grid grid-cols-[62mm_1fr] gap-6">
          <div>
            <div className="rounded-[8px] bg-jade px-4 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-white text-[17px] font-semibold text-jade">AM</span>
                <div>
                  <p className="text-[15px] font-semibold">Mr Anil Mathur</p>
                  <p className="text-[11px] text-white/80">Diamond member since 2004</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-[11.5px] leading-[1.45] text-white/90">
                <li>Managing director, textiles export, Hong Kong</li>
                <li>62 Cathay flights this year, 38 to Delhi</li>
                <li>Late flight CX695, Business, seat 11A</li>
                <li>Wants dinner straight away, then sleep</li>
                <li>Cricket and business news, nothing else</li>
              </ul>
            </div>
            <p className="mt-2 text-[10.5px] text-[#5d6766]">Fictional persona. One persona keeps the story clear; the same profile works in any cabin.</p>
            <img src="/submission/tv-welcome.jpg" alt="Seat screen greeting Mr Mathur" className="mt-4 w-full rounded-[6px]" />
            <p className="mt-1.5 text-[11px] text-[#3c4746]">What he should see when he sits down.</p>
          </div>
          <div>
            <H2>Problem statement</H2>
            <table className="w-full border-collapse text-[11.5px] leading-[1.45]">
              <tbody>
                {[
                  ["Who", "Frequent premium travellers: Diamond and Gold members in Business, flying the same routes every month."],
                  ["Pains", "Choose the meal again for every booking. The favourite dish runs out. Woken for a service they wanted to skip. The seat screen starts from a generic home page. Crew ask the same questions on every sector."],
                  ["Business outcome", "Keep top-tier members loyal on contested routes, load catering to real demand, grow Cathay Shop and inflight revenue, and learn what premium passengers value."],
                  ["Where", "Across the whole journey: app, booking, gate, seat, crew service, landing and after the trip."],
                  ["Why now", "The Aria Suite screen is the suite's control centre, Choose My Meal is live, and the 2027 membership programme resets how loyalty is rewarded."],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-[#e3e7e6] align-top">
                    <td className="w-[28mm] py-2 pr-3 font-semibold text-jade-deep">{k}</td>
                    <td className="py-2 text-[#2d3635]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <H2 className="mt-5">One trip, as it is today</H2>
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10.5px]">
              {["Book: choose meal", "Gate: nothing changes", "Seat: generic home", "Service: asked again", "Landing: nothing kept"].map((s) => (
                <div key={s} className="rounded-[6px] border border-[#e0c9c4] bg-[#fbf3f1] px-1.5 py-2 leading-[1.35] text-[#7a3b2e]">
                  {s}
                </div>
              ))}
            </div>
            <Box title="How might we" className="mt-5 border-jade/40 bg-[#eef5f3]">
              <span className="text-[14px] leading-[1.45] text-ink">How might we make every Cathay flight anticipate a premium traveller&apos;s needs, <b>without asking him again</b>?</span>
            </Box>
          </div>
        </div>
      </Page>

      {/* 5. Ideate and prioritise */}
      <Page n={5}>
        <Eyebrow>03 Define opportunity · 04 Ideate solutions</Eyebrow>
        <H1>Many ideas, one core</H1>
        <Keywords words={["Impact and effort", "Quick wins", "Big bets", "Customer impact", "Business impact"]} />
        <P className="mb-4">We generated ideas across the journey, then placed them on the impact and effort map. The flight profile is the core: it is the data every other idea needs.</P>
        <div className="grid grid-cols-[1fr_62mm] gap-6">
          <div className="relative h-[112mm] rounded-[8px] border border-[#dfe3e2]">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {[
                ["Big bets", "bg-[#eef5f3]"],
                ["Quick wins", "bg-[#e3efed]"],
                ["Money pit", "bg-[#f7f8f8]"],
                ["Fill-ins", "bg-[#fbfbfb]"],
              ].map(([l, c]) => (
                <div key={l} className={`${c} border border-white p-2 text-[11px] font-semibold text-[#5d6766]`}>{l}</div>
              ))}
            </div>
            <span className="absolute -left-1 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90 text-[10px] text-[#5d6766]">Impact</span>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-[#5d6766]">Effort, high to low</span>
            {[
              { t: "Flight profile, set once", x: 47, y: 14, core: true },
              { t: "Seat recognition", x: 30, y: 30, core: true },
              { t: "Crew card", x: 70, y: 22, core: true },
              { t: "Pins for good habits", x: 76, y: 40, core: true },
              { t: "Cathay Shop picks", x: 66, y: 34, core: true },
              { t: "Lounge knows your order", x: 22, y: 22 },
              { t: "AI concierge on the seat", x: 22, y: 42 },
              { t: "Car timed to landing", x: 22, y: 70 },
              { t: "Personal amenity kit", x: 60, y: 74 },
              { t: "Flight recap", x: 84, y: 47, core: true },
            ].map((d) => (
              <span key={d.t} className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] ${d.core ? "bg-jade font-semibold text-white" : "border border-[#c4cbc9] bg-white text-[#3c4746]"}`} style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                {d.t}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <Box title="In this concept">
              Flight profile, seat recognition, crew card, pins, Cathay Shop picks and the flight recap. Shown in <span className="font-semibold text-jade">green</span>.
            </Box>
            <Box title="Roadmap">
              Lounge that knows your order and an AI concierge are big bets that reuse the same profile later.
            </Box>
            <Box title="Left out">Ideas with low impact for the effort, such as a car timed to landing.</Box>
          </div>
        </div>
        <H2 className="mt-9">Why the profile is the core</H2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Anticipate", "Applied to every booking and loaded to the aircraft before departure."],
            ["Recognise", "Seat screen and crew act on it without asking."],
            ["Reward", "Pins, status points and Cathay Shop build on what happened on board."],
          ].map(([k, v]) => (
            <div key={k} className="border-t-2 border-jade pt-2">
              <p className="text-[13px] font-semibold text-jade-deep">{k}</p>
              <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[#3c4746]">{v}</p>
            </div>
          ))}
        </div>
      </Page>

      {/* 6. Solution overview */}
      <Page n={6}>
        <Eyebrow>Solution idea</Eyebrow>
        <H1>One profile, the whole journey</H1>
        <Keywords words={["Before the trip", "Boarding", "On board", "Landing", "After the trip", "Meal", "Rest", "Seat", "Screen"]} />
        <div className="relative mt-2">
          <div className="absolute left-[7%] right-[7%] top-[18px] h-[3px] rounded-full bg-jade" />
          <div className="relative grid grid-cols-5 gap-2 text-center">
            {[
              ["Before the trip", "Sets the profile once in the Cathay app. Applied to every booking."],
              ["Boarding", "Boarding pass scanned. Seat 11A loads his profile. No sign in."],
              ["On board", "Meal first, then do not disturb. Bed made. Woken with tea."],
              ["Landing", "Recap of the flight. Three pins unlock, status points added."],
              ["After the trip", "Cathay Shop: what he enjoyed, waiting at his seat on the flight home."],
            ].map(([k, v], i) => (
              <div key={k} className="flex flex-col items-center">
                <span className="flex size-[38px] items-center justify-center rounded-full border-[3px] border-jade bg-white text-[14px] font-semibold text-jade">{i + 1}</span>
                <p className="mt-2 text-[12.5px] font-semibold text-ink">{k}</p>
                <p className="mt-1 text-[11px] leading-[1.4] text-[#3c4746]">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <H2 className="mt-8">Four settings, set once</H2>
        <table className="w-full border-collapse text-[11.5px] leading-[1.45]">
          <thead>
            <tr className="border-b-2 border-jade text-left text-[11px] text-[#5d6766]">
              <th className="w-[22mm] py-1.5 font-semibold">Setting</th>
              <th className="py-1.5 font-semibold">Mr Mathur&apos;s choice</th>
              <th className="py-1.5 font-semibold">Who acts on it</th>
              <th className="py-1.5 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Meal", "Dal makhani, straight after take-off", "Choose My Meal, catering load, crew", "Every booking, 24 hours before"],
              ["Rest", "Do not disturb after dinner, bed made, wake 45 min before landing", "Crew card, seat lighting", "Departure, in flight"],
              ["Seat", "Window, quiet zone", "Seat request at check-in", "When check-in opens"],
              ["Screen", "English, cricket and business news first", "Seat screen, content pack", "Loaded at the gate"],
            ].map((r) => (
              <tr key={r[0]} className="border-b border-[#e3e7e6] align-top">
                <td className="py-2 font-semibold text-jade-deep">{r[0]}</td>
                <td className="py-2 pr-3">{r[1]}</td>
                <td className="py-2 pr-3">{r[2]}</td>
                <td className="py-2">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Wide src="/submission/tv-map.jpg" k="On board" caption="His meal and rest on the flight map. Crew work to the same plan." />
          <Wide src="/submission/cathay-sees.jpg" k="For Cathay" caption="Before departure: meal loads and service plan from the profiles on board, in totals only." />
        </div>
      </Page>

      {/* 7. Before the trip */}
      <Page n={7}>
        <Eyebrow>Preliminary design · 1 of 4</Eyebrow>
        <H1>Before the trip: set it once</H1>
        <Keywords words={["Cathay app", "Four steps", "About a minute", "Review and save", "Sent to seat 11A", "Edit any time"]} />
        <P className="mb-5">Setup lives on the Cathay app home screen, next to the upcoming journey. Four short steps, each with sensible defaults, then one summary to check. Saving sends the profile to the booking, the seat and the crew plan.</P>
        <div className="grid grid-cols-4 gap-3">
          <Phone src="/submission/phone-home.png" k="Home" caption="Set up from the upcoming journey card" />
          <Phone src="/submission/phone-meal.png" k="Meal" caption="Dish and timing, chosen once" />
          <Phone src="/submission/phone-rest.png" k="Rest" caption="Do not disturb, bed, wake-up" />
          <Phone src="/submission/phone-saved.png" k="Saved" caption="The on-board plan, ready at 11A" />
        </div>
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Box title="Design choices">Defaults from past flights, so most passengers only confirm. Plain words, no jargon. Every step can be skipped.</Box>
          <Box title="Edit and pause">Change any setting up to 24 hours before departure, in line with Choose My Meal. Pause the profile for one trip.</Box>
          <Box title="Consent">Opt in when saving. A &ldquo;Your data&rdquo; screen shows what is stored and who sees it, with one-tap delete.</Box>
        </div>
      </Page>

      {/* 8. On board */}
      <Page n={8}>
        <Eyebrow>Preliminary design · 2 of 4</Eyebrow>
        <H1>On board: recognised and ready</H1>
        <Keywords words={["Seat recognition", "StudioCX", "Flight map", "Briefing", "Live cricket", "Crew card", "Works offline"]} />
        <div className="grid grid-cols-2 gap-4">
          <Wide src="/submission/tv-welcome.jpg" k="Boarding" caption="Seat 11A greets him by name, matched from his boarding pass scan. No sign in." />
          <Wide src="/submission/tv-map.jpg" k="Flight map" caption="Dinner after take-off, do not disturb, wake-up with tea: his plan on the map." />
          <Wide src="/submission/tv-news.jpg" k="Briefing" caption="Markets, India and Hong Kong news picked for him, downloaded at the gate." />
          <Wide src="/submission/tv-sport.jpg" k="Sport" caption="Live cricket first, then replays he has not watched." />
        </div>
        <div className="mt-6 grid grid-cols-[1fr_70mm] gap-5">
          <div>
            <H2>What the crew see</H2>
            <P>
              The crew tablet shows a short card per seat: <b>meal and timing</b>, <b>rest</b> and <b>how he likes to be approached</b> (&ldquo;keep it brief&rdquo;). Nothing about what he watches. The galley sees totals, so the right number of dal makhani are loaded before departure.
            </P>
            <H2 className="mt-4">If anything changes</H2>
            <P>He moves to 12A: the departure control system updates the seat and the profile follows. No match, or no connection: the seat opens with standard settings.</P>
          </div>
          <Box title="Crew card · 11A" className="bg-white">
            <p className="text-[11px] text-[#5d6766]">Mr Mathur, Diamond</p>
            <ul className="mt-1.5 divide-y divide-[#e3e7e6]">
              {["Dal makhani, straight after take-off", "Do not disturb after dinner, bed made up", "Wake 45 min before landing with tea", "Keep it brief"].map((l) => (
                <li key={l} className="py-1.5 text-[11.5px]">
                  {l}
                </li>
              ))}
            </ul>
          </Box>
        </div>
      </Page>

      {/* 9. Landing and pins */}
      <Page n={9}>
        <Eyebrow>Preliminary design · 3 of 4</Eyebrow>
        <H1>Landing: pins make the habit a game</H1>
        <Keywords words={["Gamification", "15 pins", "Five metals", "Bonus status points", "Diamond Exec", "Recognition", "Progression"]} />
        <figure>
          <img src="/submission/tv-arrival.jpg" alt="Welcome to Delhi on the seat screen" className="h-[66mm] w-full rounded-[6px] object-cover" />
          <figcaption className="mt-1.5 text-[11px] text-[#3c4746]">
            <span className="font-semibold text-jade-deep">Welcome to Delhi </span>The seat screen shows the pins unlocked on this flight, and the tier they unlock.
          </figcaption>
        </figure>
        <div className="mt-5 grid grid-cols-[1fr_1fr_1fr] gap-3">
          <Phone h="h-[70mm]" src="/submission/phone-pins.png" k="Pins" caption="Three new on CX695: Set Once, Night Shift, Lights Out" />
          <Phone h="h-[70mm]" src="/submission/phone-pin-detail.png" k="Pin detail" caption="What it took, and how rare it is" />
          <Phone h="h-[70mm]" src="/submission/phone-tiers.png" k="Tier ladder" caption="Bonus points take him to Diamond Exec" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Box title="How pins work">15 pins in five metals, from Jade (+10 status points) to Diamond (+150). Earned for habits Cathay wants: a saved profile, rest mode on night flights, route loyalty.</Box>
          <Box title="Fits the 2027 programme">Progression: points from pins count in the calendar year and roll over. Recognition: rare pins reward long-term loyalty, not one big year.</Box>
          <Box title="Fair by design">Bonus points are capped per year. Percentiles are anonymous; no other member is named.</Box>
        </div>
      </Page>

      {/* 10. After the trip: Cathay Shop */}
      <Page n={10}>
        <Eyebrow>Preliminary design · 4 of 4</Eyebrow>
        <H1>After the trip: Cathay Shop, from your flight</H1>
        <Keywords words={["Cathay Shop", "Asia Miles", "Miles + Cash", "Delivered to your seat", "Click and Collect", "Post-trip"]} />
        <P className="mb-5">
          After landing, the flight recap links to <b>Cathay Shop picks from that flight</b>: the tea he was woken with, the Cathay Delight served after take-off, a DC-3 model that matches his Betsy pin. He pays with <b>Asia Miles</b>, cash or both, and chooses where it goes. The default is the anticipatory one: <b>waiting at seat 11A on his flight home</b>, so there is nothing to carry.
        </P>
        <div className="grid grid-cols-4 gap-3">
          <Phone src="/submission/phone-recap.png" k="Recap" caption="How his profile was used, and the shop link" />
          <Phone src="/submission/phone-shop.png" k="Picks" caption="Three items from CX695" />
          <Phone src="/submission/phone-shop-item.png" k="Pay and deliver" caption="Miles, Miles + Cash or card" />
          <Phone src="/submission/phone-shop-done.png" k="Done" caption="Waiting at 11A on CX694" />
        </div>
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Box title="Why it sells">Picks come from what was served and used on board, at the moment he remembers it. Gift and souvenir intent is highest just after a trip.<Tag tone="source">7</Tag></Box>
          <Box title="Why it is simple to run">Seat delivery reuses the inflight retail channel: the order joins the galley load for his next booked flight, matched to his seat like his meal.</Box>
          <Box title="What it does for the business">Revenue from 16.0 million passengers a half-year, more miles redeemed in Cathay&apos;s own channel, and a reason to open the app after the flight.</Box>
        </div>
      </Page>

      {/* 11. Architecture */}
      <Page n={11}>
        <Eyebrow>Architecture</Eyebrow>
        <H1>How the system works</H1>
        <Keywords words={["Profile service", "Booking sync", "Departure manifest", "Seat pairing", "Offline pack", "Validated upload", "Pins engine", "Existing Cathay systems"]} />
        <ArchitectureDiagram />
        <table className="mt-5 w-full border-collapse text-[11px] leading-[1.45]">
          <tbody>
            {[
              ["1", "Set once", "The Cathay app saves the profile and the consent record to the profile service, keyed to the membership number."],
              ["2", "Every booking", "Booking sync applies the meal to Choose My Meal and the seat request to the reservation when each window opens."],
              ["3", "Before departure", "A manifest join with departure control builds the crew card per seat and meal totals for catering. Totals only leave the service."],
              ["4", "At the gate", "A signed profile pack for that flight is loaded to the aircraft with the seat screen content update, so nothing depends on Wi-Fi."],
              ["5", "Boarding", "The boarding pass scan confirms the seat. Seat 11A opens the matching profile. A seat change in departure control moves it."],
              ["6", "In flight", "The seat logs a few events offline: meal served, rest mode on, titles watched."],
              ["7", "After landing", "One upload, checked against the booking and seat, feeds the recap, the pins engine and bonus status points in membership."],
              ["8", "After the trip", "Shop picks are drawn from the flight's events. A seat-delivery order joins the galley load for the next booked flight."],
            ].map(([n, k, v]) => (
              <tr key={n} className="border-b border-[#e3e7e6] align-top">
                <td className="w-[7mm] py-1.5">
                  <span className="flex size-[18px] items-center justify-center rounded-full bg-jade text-[10px] font-semibold text-white">{n}</span>
                </td>
                <td className="w-[28mm] py-1.5 font-semibold text-jade-deep">{k}</td>
                <td className="py-1.5 text-[#2d3635]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Page>

      {/* 12. Technology, data and privacy */}
      <Page n={12}>
        <Eyebrow>Technology</Eyebrow>
        <H1>Components, integration and privacy</H1>
        <Keywords words={["Build on what exists", "APIs", "Event-driven", "Offline first", "Consent", "Data minimisation", "PDPO"]} />
        <table className="w-full border-collapse text-[11px] leading-[1.45]">
          <thead>
            <tr className="border-b-2 border-jade text-left text-[10.5px] text-[#5d6766]">
              <th className="w-[34mm] py-1.5 font-semibold">Component</th>
              <th className="py-1.5 font-semibold">What it does</th>
              <th className="w-[52mm] py-1.5 font-semibold">Built on</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Flight profile module", "Setup, edit, pause, your data, pins, recap, shop", "Existing Cathay app, new screens"],
              ["Profile service", "Stores the four settings and consent, versioned per member", "New cloud service with a REST API, encrypted at rest"],
              ["Booking sync", "Applies settings to each booking when windows open", "Choose My Meal and reservation interfaces"],
              ["Manifest join", "Crew card per seat and meal totals per flight", "Departure control feed, runs before departure"],
              ["Seat pairing and pack", "Signed per-flight pack; seat opens the matching profile", "Seat screen supplier interface, gate content load"],
              ["Event upload", "Few events per flight, validated against booking and seat", "Queued upload after landing, idempotent"],
              ["Pins and status engine", "Rules on events, capped bonus status points", "Rules configuration, membership points interface"],
              ["Shop picks", "Ranks items served on the flight; seat-delivery orders", "Cathay Shop catalogue and orders, galley load"],
              ["Planning dashboard", "Meal loads and service plans from profiles, totals only", "Analytics on aggregated data"],
            ].map((r) => (
              <tr key={r[0]} className="border-b border-[#e3e7e6] align-top">
                <td className="py-1.5 pr-2 font-semibold text-jade-deep">{r[0]}</td>
                <td className="py-1.5 pr-2">{r[1]}</td>
                <td className="py-1.5 text-[#3c4746]">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Box title="Integration principles">
            Build on what Cathay already runs: Choose My Meal, departure control, the seat screen platform, the crew tablet, membership and Cathay Shop. New parts are one service and one app module. Every interface fails safe to today&apos;s standard service.
          </Box>
          <Box title="Data and privacy">
            Opt in, see and delete in the app. Crew see meal, rest and approach only; viewing history and pins stay in the passenger&apos;s account. Planners see totals, never names. Designed for Hong Kong&apos;s Personal Data (Privacy) Ordinance and the rules of each destination.
          </Box>
        </div>
        <div className="mt-3 grid grid-cols-3 items-start gap-3">
          <Box title="Security">Profile packs are signed and expire after the flight. The seat holds one profile, wiped on landing. Uploads are checked against the booking before anything is saved.</Box>
          <Phone src="/submission/phone-data.png" k="Your data" caption="What is stored, who sees it" h="h-[58mm]" />
          <Phone src="/submission/phone-card.png" k="Status card" caption="Diamond Exec, shareable" h="h-[58mm]" />
        </div>
      </Page>

      {/* 13. Validate */}
      <Page n={13}>
        <Eyebrow>05 Validate and iterate</Eyebrow>
        <H1>Desirable, feasible, viable</H1>
        <Keywords words={["Desirability", "Feasibility", "Viability", "Must-be-true assumptions", "Experiments", "Pilot", "Meal-choice match rate"]} />
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Desirability", "Do premium travellers want it?", ["Assumption: frequent flyers repeat the same choices.", "Story interviews with 10 Diamond and Gold members on Hong Kong to Delhi.", "Fake-door tile in the app: share who tap “Set how you like to fly”."]],
            ["Feasibility", "Can Cathay build and run it?", ["Assumption: the seat screen can open a named profile from the manifest.", "Technical spike with the seat screen supplier on a lab rig.", "Crew card trial with six crew on paper, then on the tablet."]],
            ["Viability", "Should Cathay do it?", ["Assumption: loading to choices cuts waste without extra cost.", "Catering model on one route from past manifests.", "Cathay Shop: seat-delivery cost and attach rate from the recap link."]],
          ].map(([k, q, items]) => (
            <div key={k as string} className="rounded-[8px] border border-[#dfe3e2] bg-[#f7f8f8] px-3.5 py-3">
              <p className="text-[13px] font-semibold text-jade-deep">{k as string}</p>
              <p className="text-[11px] text-[#5d6766]">{q as string}</p>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-[1.45]">
                {(items as string[]).map((i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-jade" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <H2 className="mt-6">Pilot: one route, eight weeks</H2>
        <div className="grid grid-cols-[1fr_66mm] gap-5">
          <div>
            <table className="w-full border-collapse text-[11.5px]">
              <tbody>
                {[
                  ["Route", "Hong Kong to Delhi, CX695 and CX694"],
                  ["Who", "Business cabin, members who opt in"],
                  ["Weeks 1 and 2", "Baseline, no profile"],
                  ["Weeks 3 to 8", "Profile live, meals loaded to choices, pins on, shop link in the recap"],
                  ["Week 8", "Decide whether to add other India routes"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-[#e3e7e6]">
                    <td className="w-[28mm] py-1.5 text-[#5d6766]">{k}</td>
                    <td className="py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex h-[22px] overflow-hidden rounded-[5px] text-[10px] font-semibold">
              <span className="flex w-1/4 items-center justify-center bg-[#dfe3e2] text-[#3c4746]">Baseline</span>
              <span className="flex flex-1 items-center justify-center bg-jade text-white">Profile live</span>
            </div>
          </div>
          <div className="rounded-[8px] bg-jade px-4 py-3.5 text-white">
            <p className="text-[11px] text-white/80">Primary metric</p>
            <p className="text-[17px] font-semibold leading-tight">Meal-choice match rate</p>
            <p className="mt-1 text-[11px] leading-[1.4] text-white/85">Share of passengers who got the meal they chose.</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/25 pt-2.5">
              <div>
                <p className="text-[10px] text-white/75">Target</p>
                <p className="text-[22px] font-semibold leading-none">95%</p>
              </div>
              <div>
                <p className="text-[10px] text-white/75">Pilot cost</p>
                <p className="text-[22px] font-semibold leading-none">HK$1.5m</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-white/75">Both are assumptions for discussion.</p>
          </div>
        </div>
        <P className="mt-3">Also watched: opt-in rate, profiles kept after the first flight, untouched meals returned, crew feedback, deletion requests, Cathay Shop attach rate.</P>
        <H2 className="mt-5">Roadmap</H2>
        <div className="grid grid-cols-3 gap-3">
          <Box title="Now · pilot">Profile, seat recognition, crew card, pins, recap and shop link on one route.</Box>
          <Box title="Next · network">All Business and First cabins on the Aria Suite and A350. Premium Economy meal and rest.</Box>
          <Box title="Later · whole journey">Lounge that knows your order, arrival services, and an assistant on the seat screen that uses the same profile.</Box>
        </div>
      </Page>

      {/* 14. Sources */}
      <Page n={14}>
        <Eyebrow>Sources and credits</Eyebrow>
        <H1>References</H1>
        <ol className="list-decimal space-y-2 pl-5 text-[11.5px] leading-[1.5] text-[#2d3635]">
          <li>McKinsey &amp; Company, &ldquo;The value of getting personalization right, or wrong, is multiplying&rdquo;, November 2021. mckinsey.com</li>
          <li>Travelzoo and Global Hotel Alliance, &ldquo;Luxury today is a good night&apos;s sleep&rdquo;, survey of over 4,800 members, June 2017. prnewswire.com</li>
          <li>Cathay Pacific, &ldquo;Choose My Meal&rdquo;: pre-order 10 days to 24 hours before departure, First and Business. cathaypacific.com</li>
          <li>Cathay Pacific, &ldquo;Introducing the Aria Suite&rdquo; and news release, 18 October 2024: 24-inch 4K screen, Bluetooth audio, seat and lighting control. cathaypacific.com</li>
          <li>IATA and Aviation Sustainability Forum, cabin waste composition audits, July 2024: 65% of cabin waste is food and drink, untouched meals 18%. iata.org</li>
          <li>IATA, fact sheet &ldquo;Cabin waste and single use plastic products&rdquo;, June 2026: untouched food and beverages about US$6 billion a year. iata.org</li>
          <li>Cathay Hackathon 2026, &ldquo;Product discovery&rdquo; by the Digital Experience Department, August 2026: framework, Cathay Shop case, 16.0 million passengers in the first half of 2026.</li>
          <li>Cathay Hackathon 2026, &ldquo;The Cathay Membership Programme&rdquo;, 4 October 2026: Diamond Exec from 2027, calendar cycle, rollover, design principles.</li>
        </ol>
        <H2 className="mt-8">Image credits</H2>
        <ul className="space-y-1.5 text-[11px] leading-[1.5] text-[#2d3635]">
          <li>Business Class suite photo: &ldquo;Cathay Pacific 77W business class seat&rdquo; by Sunnya343, Wikimedia Commons, CC BY-SA 3.0. Graded and layered for the push-in.</li>
          <li>Hong Kong-style milk tea: by WiNG, Wikimedia Commons, CC BY-SA 3.0.</li>
          <li>Cathay Delight: by N509FZ, Wikimedia Commons, CC BY-SA 4.0.</li>
          <li>DC-3 at Cathay City: by LN9267, Wikimedia Commons, CC BY-SA 4.0.</li>
          <li>Seat screen backgrounds and film artwork: see the project README.</li>
        </ul>
        <H2 className="mt-8">About the prototype</H2>
        <P>
          Everything shown is a working prototype, not a mock-up: the Cathay app, the seat screen, the crew view and the planning dashboard run in one Next.js app and share one profile. Seat pairing, supplier interfaces, prices and all passenger figures are simulated. Typeface: Funnel Sans, the closest free match to CathaySans.
        </P>
        <div className="mt-10 flex items-center gap-4 border-t border-[#dfe3e2] pt-6">
          <img src="/brushwing.svg" alt="" className="h-[12mm] w-auto" />
          <p className="text-[22px] font-semibold text-ink">Set it once. Every flight remembers.</p>
        </div>
      </Page>
    </main>
  )
}

function ArchitectureDiagram() {
  const W = 124
  const col = (i: number) => 12 + i * 138
  const lanes: [number, string, string][] = [
    [0, "Passenger and crew touchpoints", "#ffffff"],
    [100, "New: flight profile platform", "#eef5f3"],
    [200, "Existing Cathay systems", "#f4f5f5"],
  ]
  const boxes: [number, number, string, string, "touch" | "new" | "old"][] = [
    [0, 26, "Cathay app", "Set up, recap, pins", "touch"],
    [2, 26, "Crew tablet", "Card per seat", "touch"],
    [3, 26, "Seat screen", "StudioCX, offline", "touch"],
    [4, 26, "Cathay Shop", "Picks, seat delivery", "touch"],
    [0, 126, "Profile service", "Settings, consent", "new"],
    [1, 126, "Booking sync", "Every booking", "new"],
    [2, 126, "Manifest join", "Per flight", "new"],
    [3, 126, "Flight pack", "Signed, per seat", "new"],
    [4, 126, "Events and pins", "Validated upload", "new"],
    [0, 226, "Cathay ID", "Member, consent", "old"],
    [1, 226, "Reservations", "Choose My Meal, seats", "old"],
    [2, 226, "Departure control", "Seat, boarding scan", "old"],
    [3, 226, "Catering, content", "Galley and gate load", "old"],
    [4, 226, "Membership", "Status points, miles", "old"],
  ]
  const H = 44
  const cx = (i: number) => col(i) + W / 2
  const arrow = (x1: number, y1: number, x2: number, y2: number, n?: number, both?: boolean) => (
    <g key={`${x1}-${y1}-${x2}-${y2}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#367d79" strokeWidth={1.4} markerEnd="url(#ah)" markerStart={both ? "url(#ah)" : undefined} />
      {n && (
        <g>
          <circle cx={(x1 + x2) / 2 + (x1 === x2 ? 13 : 0)} cy={(y1 + y2) / 2 - (y1 === y2 ? 11 : 0)} r={8} fill="#006564" />
          <text x={(x1 + x2) / 2 + (x1 === x2 ? 13 : 0)} y={(y1 + y2) / 2 - (y1 === y2 ? 11 : 0) + 3.3} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#fff">
            {n}
          </text>
        </g>
      )}
    </g>
  )
  return (
    <svg viewBox="0 0 700 290" className="w-full">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="#367d79" />
        </marker>
      </defs>
      {lanes.map(([y, t, fill]) => (
        <g key={t}>
          <rect x={0} y={y} width={700} height={84} rx={8} fill={fill} stroke="#dfe3e2" />
        </g>
      ))}
      {boxes.map(([i, y, label, sub, tone]) => (
        <g key={label}>
          <rect x={col(i)} y={y} width={W} height={H} rx={6} fill={tone === "new" ? "#006564" : "#ffffff"} stroke={tone === "new" ? "#006564" : tone === "touch" ? "#367d79" : "#b9c0bf"} />
          <text x={cx(i)} y={y + 19} textAnchor="middle" fontSize={11} fontWeight={600} fill={tone === "new" ? "#ffffff" : "#1d2423"}>
            {label}
          </text>
          <text x={cx(i)} y={y + 33} textAnchor="middle" fontSize={9} fill={tone === "new" ? "#d6ebe7" : "#5d6766"}>
            {sub}
          </text>
        </g>
      ))}
      {arrow(cx(0), 70, cx(0), 124, 1)}
      {arrow(col(0) + W, 148, col(1), 148)}
      {arrow(col(1) + W, 148, col(2), 148)}
      {arrow(col(2) + W, 148, col(3), 148)}
      {arrow(cx(1), 170, cx(1), 224, 2)}
      {arrow(cx(2), 224, cx(2), 172)}
      {arrow(cx(2), 124, cx(2), 72, 3)}
      {arrow(cx(3), 170, cx(3), 224, 4)}
      {arrow(cx(3), 124, cx(3), 72, 5)}
      {arrow(col(3) + W, 60, col(4) + 18, 124, 6)}
      {arrow(cx(4) + 20, 170, cx(4) + 20, 224, 7)}
      {arrow(cx(4) + 20, 124, cx(4) + 20, 72, 8)}
      {arrow(cx(0) - 30, 170, cx(0) - 30, 224, undefined, true)}
      {lanes.map(([y, t, fill]) => (
        <g key={`label-${t}`}>
          <rect x={6} y={y + 5} width={t.length * 5.1 + 10} height={14} rx={3} fill={fill} />
          <text x={10} y={y + 15} fontSize={9.5} fontWeight={600} fill="#5d6766">
            {t}
          </text>
        </g>
      ))}
    </svg>
  )
}
