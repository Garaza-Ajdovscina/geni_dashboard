# Gen-I Dashboard — Hardware Integration

This document describes how the kiosk GUI connects to physical controls on a **Raspberry Pi** with **two Arduino boards** over USB serial.

## Architecture

```
Arduino 1 (controls)  ──USB──►  Raspberry Pi  ◄──USB──  Arduino 2 (panel)
                                    │
                    hardware/bridge/bridge.py  (pyserial + WebSocket)
                                    │
                    ws://127.0.0.1:8765
                                    │
                    Chromium kiosk  →  src/hardware/hardwareClient.ts
                                    │
                    controls.ts (below red line) + keyboardNav.ts (above)
```

- **Below the red line** (`.bottom-bar`): 4 potentiometers, 5 on/off toggles, 3-way battery switch — continuous state synced to DOM.
- **Above the red line**: momentary panel buttons — edge-triggered, same actions as keyboard navigation.
- **Mouse** still works everywhere; hardware pots overwrite slider values on each frame (~10 Hz).

## Arduino boards

### Board 1 — Controls (`hardware/arduino/controls_board/`)

| Pin | Component | GUI mapping |
|-----|-----------|-------------|
| A0 | Pot 1 | `#ctrl-nuclear` (Jedrska) |
| A1 | Pot 2 | `#ctrl-hydro` (Hidro) |
| A2 | Pot 3 | `#ctrl-gas` (Plinska) |
| A3 | Pot 4 | `#ctrl-battery-flow` (Baterija hitrost) |
| D2 | Toggle | Sončna (`data-control="solar"`) |
| D3 | Toggle | Vetrna (`data-control="wind"`) |
| D4 | Toggle | Jedrska (`data-control="nuclear"`) |
| D5 | Toggle | Hidro (`data-control="hydro"`) |
| D6 | Toggle | Plinska (`data-control="gas"`) |
| D7, D8 | 3-way battery | `charge` / `discharge` / `off` |

Toggles use `INPUT_PULLUP`; **LOW = ON**.

Battery 3-way uses 2-bit encoding on D7/D8:

| D7 | D8 | Mode |
|----|-----|------|
| HIGH | HIGH | off |
| LOW | HIGH | charge |
| HIGH | LOW | discharge |
| LOW | LOW | (reserved → off) |

### Board 2 — Panel (`hardware/arduino/panel_board/`)

| Pin | Button | Action |
|-----|--------|--------|
| D2 | Up | Focus previous |
| D3 | Down | Focus next |
| D4 | Left | Focus prev / range −1 |
| D5 | Right | Focus next / range +1 |
| D6 | Enter | Activate focused item |
| D7 | Backspace | Back / cancel |
| D8 | Esc | Pause / unpause |
| D9 | Speed left (spring-return) | `stepGameSpeed(-1)` |
| D10 | Speed right (spring-return) | `stepGameSpeed(+1)` |
| D11 | Fullscreen | Toggle `kiosk-above-line-only` CSS |

All panel inputs: `INPUT_PULLUP`, **LOW = pressed**. Events fire on **rising edge** only.

## Serial protocol

**115200 baud**, newline-terminated ASCII.

### Boot banner

```
GENI,1,controls
GENI,1,panel
```

### Controls frame (~10 Hz)

```
C,70.2,50.1,40.0,55.3,1,1,1,1,1,charge
```

Fields: `C`, nuclear%, hydro%, gas%, batteryFlow%, solar, wind, nuclear, hydro, gas (0/1), battery mode (`charge`|`discharge`|`off`).

### Panel events

```
P,evt,UP
P,evt,SPEED_LEFT
```

Event names: `UP`, `DOWN`, `LEFT`, `RIGHT`, `ENTER`, `BACKSPACE`, `ESC`, `SPEED_LEFT`, `SPEED_RIGHT`, `FULLSCREEN`.

### Panel heartbeat (~2 Hz)

```
P,snap,0,0,0,0,0,0,0,0,0,0
```

Order: UP, DOWN, LEFT, RIGHT, ENTER, BACKSPACE, ESC, SPEED_LEFT, SPEED_RIGHT, FULLSCREEN (0/1 held state).

## WebSocket messages (bridge → browser)

```json
{"type":"controls","pots":{"nuclear":70.2,"hydro":50.1,"gas":40.0,"batteryFlow":55.3},"toggles":{"solar":true,"wind":true,"nuclear":true,"hydro":true,"gas":true},"battery":"charge"}
{"type":"button","name":"UP"}
```

## Physical layout (this kiosk)

Two Arduino boards — **not** “all controls on one, all buttons on the other”:

| Board | USB role in `config.yaml` | Firmware | Hardware |
|-------|----------------------------|----------|----------|
| **Switches** | `switches_port` | `upload_controls.sh` | 2 pots (A0–A1) + all switches + 3-way battery |
| **Buttons** | `buttons_port` | `upload_panel.sh` | 2 pots (A0–A1) + all panel buttons |

The bridge merges `C,...` (switches board) and `Cp,...` (buttons board pots) into one WebSocket stream.

### Board 1 — Switches (`hardware/arduino/controls_board/`)

| Pin | Component | GUI mapping |
|-----|-----------|-------------|
| A0 | Pot | Jedrska |
| A1 | Pot | Hidro |
| D2 | Toggle | Hidro (physical label “Sončna”) |
| D3 | Toggle | Vetrna |
| D4 | Toggle | Jedrska |
| D5, D6 | 3-way battery | charge / discharge / off |
| D7 | Toggle | Sončna (physical praznjenje/izklop) |
| D8 | Toggle | Plinska (physical polnjenje/izklop) |

Each 2-position switch uses **one pin** only. The 3-way battery uses **D5+D6 exclusively** — other switches must not share those pins.

### Board 2 — Buttons (`hardware/arduino/panel_board/`)

| Pin | Component | GUI mapping |
|-----|-----------|-------------|
| A0 | Pot | Plinska level |
| A1 | Pot | Baterija flow |
| D9 | Button | UP (gor) |
| D7 | Button | DOWN (dol) |
| D4 | Button | LEFT (levo) |
| D10 | Button | RIGHT (desno) |
| D8 | Button | ESC (premor) |
| D5 | Button | ENTER (vnos/OK) |
| D6 | Button | BACKSPACE (nazaj) |
| D3 | Button | SPEED_LEFT (počasneje) |
| D2 | Button | SPEED_RIGHT (hitreje) |

## Configuration

Edit [`config.yaml`](config.yaml):

```yaml
switches_port: "/dev/ttyUSB0"
buttons_port: "/dev/ttyUSB1"
pot_calibration:
  nuclear: { raw_min: 0, raw_max: 1023 }
  # tune raw_min/raw_max per pot after full rotation test
```

Use stable udev symlinks (see [`scripts/99-geni-arduino.rules`](scripts/99-geni-arduino.rules)) when available.

## Raspberry Pi setup

### 1. Install dependencies

```bash
cd hardware
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Install arduino-cli

```bash
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
arduino-cli core install arduino:avr
```

### 3. Flash Arduinos

```bash
./scripts/upload_controls.sh /dev/ttyACM0
./scripts/upload_panel.sh /dev/ttyACM1
```

Or with udev symlinks:

```bash
./scripts/upload_controls.sh /dev/serial/by-id/usb-GenI-controls
./scripts/upload_panel.sh /dev/serial/by-id/usb-GenI-panel
```

### 4. Build and serve the GUI

```bash
cd ..
npm run build
cd dist && python3 -m http.server 8080
```

### 5. Start the bridge

```bash
cd hardware
source .venv/bin/activate
python bridge/bridge.py
```

### 6. Open kiosk with hardware enabled

```
http://127.0.0.1:8080/?hardware=1
```

Or set `localStorage.setItem("geni-hardware", "1")`.

### 7. systemd (production)

```bash
sudo ./scripts/install_pi_service.sh
```

Installs `geni-bridge.service`, `geni-static.service`, and `geni-kiosk.service`.

## Development without hardware

1. Run the GUI normally: `npm run dev:browser`
2. Optional mock bridge: `python bridge/mock_bridge.py` (streams fake controls + button events)
3. Enable client: `http://localhost:5174/?hardware=1`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No WebSocket connection | Bridge running? Port 8765 free? `?hardware=1` in URL? |
| Wrong pot values | `screen /dev/ttyACM0` — expect `C,...` lines |
| Buttons fire twice | Firmware should edge-trigger only; check debounce in config |
| Arduinos swapped | udev rules or swap ports in `config.yaml` |
| Permission denied on serial | `sudo usermod -aG dialout $USER` then re-login |

## POC origin

Firmware patterns evolved from `SERVER_CODE/geni_project/Arduino/` (`pot_reader`, `switch_reader`, `button_reader`). That folder is archived; use `hardware/arduino/` as the source of truth.
