# Sončna hiška — Gen-I Energy Grid Game

An interactive **Slovenian-language** educational game about balancing electricity production and consumption on a power grid. It is built for a **single in-person game** (e.g. Raspberry Pi in fullscreen browser): one machine, no multiplayer server, and **no internet required while playing** after deployment.

The experience is branded **Sončna hiška** (Solar House) and presented in partnership with **Gen-I** as the system operator of the energy network.

---

## What players do

Players act as the grid operator: they watch weather (cloud cover and wind), generation sources on the right, consumers on the left, and a central **energy flow** diagram plus **battery storage**.

- When **production exceeds demand**, surplus energy charges the battery.
- When **demand exceeds production**, the battery discharges to support the grid.
- The goal is to keep the system in balance as long as possible while weather and loads change over time.

Simulation speed, pause, player names, and a local leaderboard are part of the full kiosk flow.

---

## Screens and flow

| Screen | Purpose |
|--------|---------|
| **Main menu** | Start screen with Sončna hiška branding, Gen-I logo, tagline, and navigation |
| **New game** | Enter or pick a player name; the live game board runs in the background behind the form |
| **Game** | Main dashboard: status bar, flow diagram, sparkline charts, pause overlay |
| **Leaderboard** | Top scores stored in the browser (`localStorage`) |
| **Instructions** | Short rules in Slovenian |
| **Settings** | Simulation speed (1×–16×) and sound on/off |
| **Credits** | Project attribution placeholder |

**Menu actions (Slovenian UI):** Nova igra, Lestvica najboljših, Navodila za igro, Nastavitve, Ustvarjalci.

---

## Tech stack

- **[Vite 6](https://vitejs.dev/)** + **TypeScript** — build tool and type-checking
- **Vanilla HTML/CSS/JS** — no React/Vue; game UI is mostly `board.html` injected at runtime
- **[Chart.js](https://www.chartjs.org/)** — small sparkline charts per producer/consumer
- **[@fontsource](https://fontsource.org/)** — self-hosted web fonts (offline-safe)

The app is a **single-page application**: `index.html` → `src/main.ts` → `src/router.ts` switches views.

---

## Project layout

```
index.html              Entry HTML (forces light theme)
public/
  gen_i_logo.png        Menu logo — edit THIS file (Vite serves public/ at /)
src/
  main.ts               Bootstrap
  router.ts             View routing and game teardown
  core/
    types.ts            View IDs, settings, leaderboard types
    storage.ts          localStorage (settings, players, scores)
    session.ts          Current player name
  views/
    menu.ts             Start screen
    username.ts         Name entry over live game
    game.ts             Mounts board + pause overlay
    leaderboard.ts, instructions.ts, settings.ts, credits.ts
  game/
    board.html          In-game layout (Slovenian labels)
    engine.ts           Game loop, pause, UI updates
    simulation.ts       Tick logic (wind, cloud, balances)
    weibull.ts          Wind speed sampling (Weibull A=21, k=3)
    charts.ts, flow.ts, connectors.ts, layout.ts, theme.ts
  styles/
    fonts.css           Quicksand + Nunito Sans (latin + latin-ext)
    game.css            Dashboard and simulation UI
    screens.css         Menus and overlays
```

**Legacy reference only (not the running app):** `energy-grid-dashboard.html` — original monolithic prototype.

---

## Game UI (in play)

- **Status row:** clock, cloud cover (%), wind (km/h)
- **Left column:** Gospodinjstva (households), Industrija (industry)
- **Center:** animated SVG energy flow, battery (Baterija / Shranjena energija)
- **Right column:** Vetrna, Sončna, Plinska, Jedrska energija, Hidroelektrarne
- **Header:** Pause (Premor) with resume or return to menu

Light theme is fixed in production; dark theme toggle exists in code but is hidden for now.

---

## Typography and Slovenian characters

Fonts are bundled for offline use:

| Use | Family |
|-----|--------|
| Headings, buttons | **Quicksand** |
| Body, metrics | **Nunito Sans** |

For **each weight**, both **`latin`** (a–z) and **`latin-ext`** (č, š, ž) subsets are loaded. Loading only `latin-ext` causes basic letters like `s` to fall back to the system font while `š` uses the web font — they will look mismatched. Both subsets are required.

---

## Logo asset

The menu uses `./gen_i_logo.png`. Vite copies files from **`public/`**, not the project root.

- **Correct path to edit:** `public/gen_i_logo.png`
- After changing the image, refresh dev or run `npm run build` again.

Display size is controlled in CSS (`.menu-logo`), not the PNG dimensions alone.

---

## Local storage

| Key | Content |
|-----|---------|
| `geni-settings` | Speed index, sound, theme |
| `geni-known-players` | Previously used names |
| `geni-leaderboard` | Scores and metadata |

Data stays on the device; clearing browser storage resets progress.

---

## Development

```bash
cd "Gen-I Dashboard"
npm install
npm run dev:browser
```

**`dev:browser`** starts Vite and opens **http://localhost:5174** in your system browser (Safari, Chrome, etc.) — not Cursor’s embedded preview.

Use **`npm run dev`** if you only want the server; then **`npm run open`** to open the browser.

**Port 5173 is often taken by Cursor** — this project uses **5174** instead.

**First start can be slow** (30–60 seconds) because the project folder is on **Dropbox**. Wait until the terminal shows `VITE … ready` and `Local: http://localhost:5174/` before expecting the page to load. Later starts are faster (Vite cache lives in `~/.cache/gen-i-grid-vite`).

If the page is blank, hard-refresh (Cmd+Shift+R) or try Chrome directly:

```bash
open -a "Google Chrome" http://localhost:5174/
```

Other commands:

```bash
npm run build    # Production output in dist/
npm run preview  # Serve dist/ locally
```

---

## Production build (Raspberry Pi kiosk)

```bash
npm run build
```

Copy the entire **`dist/`** folder to the Pi, then serve it locally, for example:

```bash
cd dist
python3 -m http.server 8080
```

Open http://127.0.0.1:8080/?hardware=1 in the kiosk browser (fullscreen recommended).

Everything needed at runtime — JavaScript, CSS, fonts, Chart.js, and images — is inside **`dist/`**. No CDN or network access is required during play.

`vite.config.ts` sets `base: './'` so relative paths work when opened from a simple static file server.

### Physical controls (Arduino + Raspberry Pi)

See **[hardware/README_HARDWARE.md](hardware/README_HARDWARE.md)** for wiring, serial protocol, `arduino-cli` upload, Python bridge (`hardware/bridge/bridge.py`), and systemd setup.

Quick start on the Pi:

```bash
cd hardware && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python bridge/bridge.py   # in one terminal
# serve dist/ and open ?hardware=1 in Chromium kiosk
```

---

## Start screen (current branding)

- **SONČNA HIŠKA** — large uppercase title beside the Gen-I logo
- **Gen-I sistemski operater energetskega omrežja** — muted tagline below (wraps to two lines)
- Primary action: **Nova igra**

---

## Requirements

- **Node.js** 18+ recommended for development and builds
- Any modern browser for playback (Chromium on Raspberry Pi is typical for kiosks)

---

## License and attribution

Font packages are under their respective OFL licenses via Fontsource. Game content and Gen-I branding are project-specific; see **Ustvarjalci** in the app for credits text.
