import type { HardwareControlsState } from "../game/controls";
import {
  ensureHardwareClient,
  isHardwareConnected,
  subscribeHardware,
} from "../hardware/hardwareClient";
import { navigate } from "../router";

type ButtonDef = {
  name: string;
  pin: string;
  label: string;
  board: "panel" | "switches";
  snapIndex: number;
};

const ALL_BUTTONS: ButtonDef[] = [
  { name: "UP", pin: "D9", label: "Gor ↑", board: "panel", snapIndex: 0 },
  { name: "DOWN", pin: "D7", label: "Dol ↓", board: "panel", snapIndex: 1 },
  { name: "LEFT", pin: "D4", label: "Levo ←", board: "panel", snapIndex: 2 },
  { name: "RIGHT", pin: "D10", label: "Desno →", board: "panel", snapIndex: 3 },
  { name: "ESC", pin: "D8", label: "Premor", board: "panel", snapIndex: 4 },
  { name: "ENTER", pin: "D5", label: "Vnos / OK", board: "panel", snapIndex: 5 },
  { name: "BACKSPACE", pin: "D6", label: "Nazaj", board: "panel", snapIndex: 6 },
  { name: "SPEED_LEFT", pin: "D3", label: "Počasneje", board: "panel", snapIndex: 7 },
  { name: "SPEED_RIGHT", pin: "D2", label: "Hitreje", board: "panel", snapIndex: 8 },
  { name: "FULLSCREEN", pin: "D13", label: "Cel zaslon", board: "switches", snapIndex: 0 },
];

const POT_LABELS: Record<keyof HardwareControlsState["pots"], string> = {
  nuclear: "Jedrska · A1",
  hydro: "Hidro · A3",
  gas: "Plinska · A0",
  batteryFlow: "Baterija · A2",
};

const TOGGLE_LABELS: Record<keyof HardwareControlsState["toggles"], string> = {
  solar: "Sončna",
  wind: "Vetrna",
  nuclear: "Jedrska",
  hydro: "Hidro",
  gas: "Plinska",
};

const BATTERY_LABELS: Record<HardwareControlsState["battery"], string> = {
  charge: "Polnjenje",
  discharge: "Praznjenje",
  off: "Izklop",
};

let cleanup: (() => void) | null = null;
let flashTimers = new Map<string, ReturnType<typeof setTimeout>>();

function setConnectionStatus(root: HTMLElement, connected: boolean): void {
  const el = root.querySelector("#hw-connection");
  if (!el) return;
  el.textContent = connected ? "ONLINE" : "OFFLINE";
  el.classList.toggle("hw-conn-ok", connected);
  el.classList.toggle("hw-conn-err", !connected);
}

function updatePot(root: HTMLElement, key: keyof HardwareControlsState["pots"], value: number): void {
  const valueEl = root.querySelector(`[data-pot-value="${key}"]`);
  const barEl = root.querySelector(`[data-pot-bar="${key}"]`) as HTMLElement | null;
  if (valueEl) valueEl.textContent = `${value.toFixed(1)}%`;
  if (barEl) barEl.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function updateToggle(
  root: HTMLElement,
  key: keyof HardwareControlsState["toggles"],
  on: boolean
): void {
  const el = root.querySelector(`[data-toggle="${key}"]`);
  if (!el) return;
  el.textContent = on ? "ON" : "OFF";
  el.classList.toggle("hw-tog-on", on);
  el.classList.toggle("hw-tog-off", !on);
}

function updateBattery(root: HTMLElement, mode: HardwareControlsState["battery"]): void {
  const el = root.querySelector("#hw-battery-mode");
  if (el) el.textContent = BATTERY_LABELS[mode];
}

function flashButton(root: HTMLElement, name: string): void {
  const el = root.querySelector(`[data-panel-btn="${name}"]`);
  const countEl = root.querySelector(`[data-panel-count="${name}"]`);
  if (!el) return;

  el.classList.add("hw-btn-active");
  const prev = flashTimers.get(name);
  if (prev) clearTimeout(prev);
  flashTimers.set(
    name,
    setTimeout(() => {
      el.classList.remove("hw-btn-active");
      flashTimers.delete(name);
    }, 400)
  );

  if (countEl) {
    countEl.textContent = String((Number(countEl.textContent) || 0) + 1);
  }
}

function updateButtonLive(root: HTMLElement, board: "panel" | "switches", index: number, on: boolean): void {
  const live = root.querySelector(`[data-btn-live="${board}-${index}"]`);
  const card = root.querySelector(`[data-btn-board="${board}"][data-btn-snap="${index}"]`);
  if (live) live.textContent = on ? "1" : "0";
  card?.classList.toggle("hw-btn-held", on);
}

function applyControls(root: HTMLElement, state: HardwareControlsState): void {
  (Object.keys(POT_LABELS) as Array<keyof HardwareControlsState["pots"]>).forEach((key) => {
    updatePot(root, key, state.pots[key]);
  });
  (Object.keys(TOGGLE_LABELS) as Array<keyof HardwareControlsState["toggles"]>).forEach((key) => {
    updateToggle(root, key, state.toggles[key]);
  });
  updateBattery(root, state.battery);
}

function renderPotRows(): string {
  return (Object.keys(POT_LABELS) as Array<keyof HardwareControlsState["pots"]>)
    .map(
      (key) => `
        <div class="hw-pot-row">
          <span class="hw-pot-label">${POT_LABELS[key]}</span>
          <div class="hw-pot-track"><div class="hw-pot-bar" data-pot-bar="${key}"></div></div>
          <span class="hw-pot-value" data-pot-value="${key}">—</span>
        </div>
      `
    )
    .join("");
}

function renderToggleRows(): string {
  return (Object.keys(TOGGLE_LABELS) as Array<keyof HardwareControlsState["toggles"]>)
    .map(
      (key) => `
        <div class="hw-tog-chip">
          <span class="hw-tog-label">${TOGGLE_LABELS[key]}</span>
          <span class="hw-tog-pill hw-tog-off" data-toggle="${key}">—</span>
        </div>
      `
    )
    .join("");
}

function renderButtonGrid(): string {
  return ALL_BUTTONS.map(
    (btn) => `
      <div class="hw-btn-card"
           data-panel-btn="${btn.name}"
           data-btn-board="${btn.board}"
           data-btn-snap="${btn.snapIndex}">
        <span class="hw-btn-pin">${btn.pin}</span>
        <span class="hw-btn-label">${btn.label}</span>
        <div class="hw-btn-metrics">
          <span class="hw-btn-metric">
            <span class="hw-btn-metric-key">SIG</span>
            <span class="hw-btn-live" data-btn-live="${btn.board}-${btn.snapIndex}">0</span>
          </span>
          <span class="hw-btn-metric">
            <span class="hw-btn-metric-key">EVT</span>
            <span class="hw-btn-count" data-panel-count="${btn.name}">0</span>
          </span>
        </div>
      </div>
    `
  ).join("");
}

export function teardownHardwareTest(): void {
  cleanup?.();
  cleanup = null;
  for (const timer of flashTimers.values()) clearTimeout(timer);
  flashTimers.clear();
}

export function renderHardwareTest(root: HTMLElement): void {
  teardownHardwareTest();
  ensureHardwareClient();

  root.innerHTML = `
    <div class="hw-test-screen">
      <div class="hw-test-panel">
        <header class="hw-test-header">
          <div>
            <p class="hw-test-eyebrow">DIAGNOSTIKA · SONČNA HIŠKA</p>
            <h1 class="hw-test-title">Test strojne opreme</h1>
          </div>
          <span id="hw-connection" class="hw-conn-pill ${isHardwareConnected() ? "hw-conn-ok" : "hw-conn-err"}">
            ${isHardwareConnected() ? "ONLINE" : "OFFLINE"}
          </span>
        </header>

        <div class="hw-test-grid">
          <section class="hw-card hw-card-pots">
            <h2 class="hw-card-title">Potenciometri</h2>
            <div class="hw-pot-list">${renderPotRows()}</div>
          </section>

          <section class="hw-card hw-card-io">
            <h2 class="hw-card-title">Stikala &amp; baterija</h2>
            <div class="hw-tog-list">${renderToggleRows()}</div>
            <div class="hw-battery-strip">
              <span class="hw-battery-label">Baterija</span>
              <span id="hw-battery-mode" class="hw-battery-val">—</span>
            </div>
          </section>

          <section class="hw-card hw-card-buttons">
            <h2 class="hw-card-title">Gumbi</h2>
            <p class="hw-card-hint">SIG = pritisnjeno · EVT = število sprožitev</p>
            <div class="hw-btn-grid">${renderButtonGrid()}</div>
          </section>
        </div>

        <footer class="hw-test-footer">
          <button type="button" class="hw-back-btn kb-nav-item" id="btn-back">← Nazaj v meni</button>
        </footer>
      </div>
    </div>
  `;

  root.querySelector("#btn-back")?.addEventListener("click", () => navigate("menu"));

  cleanup = subscribeHardware((event) => {
    if (event.type === "connection") {
      setConnectionStatus(root, event.connected);
      return;
    }
    if (event.type === "controls") {
      applyControls(root, event.state);
      return;
    }
    if (event.type === "button") {
      flashButton(root, event.name);
      return;
    }
    if (event.type === "panel_snap") {
      event.states.forEach((on, i) => updateButtonLive(root, "panel", i, on));
      return;
    }
    if (event.type === "switches_snap") {
      event.states.forEach((on, i) => updateButtonLive(root, "switches", i, on));
    }
  });
}
