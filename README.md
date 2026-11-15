# Cathay flight profile: passenger demo

A clickable concept demo for the Cathay Hackathon 2026 challenge "Reimagining the Premium Travel Experience". A frequent flyer sets up a flight profile once on the phone (meal and meal timing, rest, seat type, screen language and interests). The seatback TV then opens already personalised: the seat recognises the passenger and loads it. After landing, 15 enamel pins earn bonus status points towards the next membership tier (Green, Silver, Gold, Diamond, Diamond Exec). The recap links to Cathay Shop, where items from the flight can be paid for with Asia Miles and delivered to the next seat.

Concept demo, not affiliated with Cathay Pacific. Anything that a real system would provide (seat recognition, live cricket scores, flight data, news feed, pin status points and perks, percentiles, friends, crew and catering figures, shop prices) is simulated and labelled "Simulated" in the UI.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:4317. The dev server binds to port 4317 on all interfaces.

- http://localhost:4317 is the interactive demo.
- http://localhost:4317/submission is the written submission: 14 A4 pages that scroll, covering insights, problem framing, the solution, preliminary design, architecture, technology and validation.

## Deliverables

- **One-minute video**: `CUT=minute node scripts/make-final.mjs <workDir> <mediaDir>` writes `journey-minute.mp4` (about 60 s). It follows Mr Mathur from the seat push-in through setup, the flight map, news and sport, landing and pins, the tier ladder and a Cathay Shop purchase.
- **PDF**: `node scripts/submission-assets.mjs` captures the screenshots into `public/submission/`. Then `node scripts/make-pdf.mjs <out.pdf>` prints `/submission` to an A4 PDF. Add `PNG=<dir>` to also write a preview image of every page.

Both need the dev server running.

## Demo controls

The bar at the top switches between:

- **Phone app**: the Cathay app (Home, Offers, Earn, Redeem, Profile) for setup, pins, the tier ladder, the status card, the recap and Cathay Shop.
- **Seatback TV**: a 16:9 StudioCX-style seat screen: seat idle, recognition, home, flight map, news, sport and arrival.
- **What Cathay sees**: one summary of what the airline can act on for the flight (meal load, service plan, crew card).
- **Pitch**: eight 16:9 slides: problem, passenger, product, a step-by-step pipeline, Cathay and data value, feasibility and the pilot.

Switching to the seatback TV plays a photo push-in onto seat 11A's screen. It is a real Cathay business suite split into depth layers. The live TV is warped onto the screen glass at full resolution and flattens in one continuous move. Add `intro=1` for the title card hold used in the video. Turn off **Seat zoom** in the bar to go straight to the TV.

Keyboard shortcuts: `1` phone, `2` TV, `3` What Cathay sees, `4` Pitch, `h` hide the control bar. In Pitch, the arrow keys, Page Up and Page Down, and the space bar move between slides.

URL parameters jump straight to a screen, which is useful for screenshots. For example: `/?fresh=1&bare=1&profile=anil&view=tv&tv=map&saved=1`.

- `fresh=1` ignores saved state, and `bare=1` hides the control bar.
- `view=phone|tv|cathay|pitch` picks the view.
- `phone=home|offers|setup|saved|recap|profile|pins|badge|tiers|card|data|shop` and `step=0..4` pick a phone screen and setup step. `badge=<id>` picks the pin shown on `phone=badge`.
- `tv=idle|welcome|home|map|news|sport|arrival` picks a TV screen.
- `saved=1` marks the profile as saved, and `flown=1` marks the flight as landed.
- `zoom=0` skips the seat zoom. `zoomstill=1` keeps the zoom on screen so it can be stepped frame by frame. `blank=1` clears Mr Mathur's meal and rest choices so the setup taps show on screen.
- `slide=0..7` and `pstep=1..5` pick a pitch slide and pipeline step.
- `device=1` renders the phone on its own, for asset capture.

## Suggested journey

1. Phone: from Home, tap **Set up flight profile**, step through Meal, Rest, Seat and Screen, then tap **Save and send to seat 11A**.
2. Tap **See it on the seat screen**. The seat push-in lands on the flight map. Use **Menu** for news and sport.
3. Tap the time-remaining pill (top left) to land. The arrival screen unlocks the Set Once pin and Diamond Exec. Tap **Open in the Cathay app**.
4. In the app, open Earn (pins, percentiles, friends), Redeem (tier ladder) and the recap, then Cathay Shop: pick an item, pay with Asia Miles and choose delivery to the next seat.
5. End on **What Cathay sees** (press `3`).

## Scripts

- `scripts/make-final.mjs`: builds a video cut. `CUT=minute` (the one-minute video) or `CUT=final` (the longer 1:35 cut). The steps:
  - `scripts/render-seat.mjs` renders the title card and photo push-in offline, one fully rasterised frame at a time, so headless capture never drops frames.
  - `scripts/record-<cut>.mjs` records the rest with captions, the end card and logged click times.
  - A soft UI tick is synthesised at every click, and everything is joined into `journey-<cut>.mp4` with H.264 video and AAC audio.
  - `HOLD=<factor>` scales the holds. `SKIP_SEAT=1` reuses rendered push-in frames.
- `scripts/screens.mjs`: captures 1920×1080 screenshots of every screen and pitch slide.
- `scripts/pitch-assets.mjs`: captures the images used on the pitch slides into `public/pitch/`.

All capture scripts launch Chromium with `--font-render-hinting=none`. Without it, headless Chromium on Linux rounds each glyph advance to a whole pixel, which opens visible gaps inside words at small sizes.

## Type

The app uses Funnel Sans (Google Fonts, OFL), the closest free match to Cathay's proprietary CathaySans: the same geometric grotesque build, epsilon-style ampersand and straight-tailed "y". Body text is set at weight 360.

## Credits

- Cabin photo: "Cathay Pacific 77W business class seat" by Sunnya343, Wikimedia Commons, CC BY-SA 3.0. `scripts/prep-cabin.py` grades it and builds the layers in `public/media/cabin/` (it needs `opencv-python-headless` and `numpy`).
- Cathay Shop photos: Hong Kong-style milk tea by WiNG (CC BY-SA 3.0), Cathay Delight by N509FZ (CC BY-SA 4.0) and the DC-3 at Cathay City by LN9267 (CC BY-SA 4.0), all Wikimedia Commons.
- Logo and brushwing: Cathay Pacific marks from Wikipedia. Globe: NASA Black Marble. Seat idle image: NASA Landsat, Pearl River Delta 1973. Pin artwork is drawn in SVG for this demo. Posters and stadium photos are from Wikipedia and Wikimedia Commons, used for a non-commercial pitch demo only.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui (Base UI), lucide icons. Playwright and ffmpeg are used only by the asset scripts.
