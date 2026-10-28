export type BatteryMode = "charge" | "discharge" | "off";

export interface PlayerControls {
  nuclearLevel: number;
  hydroLevel: number;
  gasLevel: number;
  batteryFlowRate: number;
  windOn: boolean;
  solarOn: boolean;
  nuclearOn: boolean;
  hydroOn: boolean;
  gasOn: boolean;
  batteryMode: BatteryMode;
}

export interface HardwareControlsState {
  pots: {
    nuclear: number;
    hydro: number;
    gas: number;
    batteryFlow: number;
  };
  toggles: {
    solar: boolean;
    wind: boolean;
    nuclear: boolean;
    hydro: boolean;
    gas: boolean;
  };
  battery: BatteryMode;
}

const BATTERY_MODE_CYCLE: BatteryMode[] = ["charge", "discharge", "off"];

const BATTERY_MODE_LABEL: Record<BatteryMode, string> = {
  charge: "Polnjenje",
  discharge: "Praznjenje",
  off: "Izklop",
};

const SLIDER_IDS: Record<keyof HardwareControlsState["pots"], string> = {
  nuclear: "ctrl-nuclear",
  hydro: "ctrl-hydro",
  gas: "ctrl-gas",
  batteryFlow: "ctrl-battery-flow",
};

let batteryMode: BatteryMode = "charge";
let controlsBound = false;
let onControlsChange: (() => void) | null = null;

function notifyControlsChange(): void {
  onControlsChange?.();
}

function sliderValue(id: string, fallback: number): number {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return fallback;
  return Math.max(0, Math.min(100, Number(el.value) || 0));
}

function toggleOn(dataControl: string): boolean {
  const btn = document.querySelector(`.ph-toggle[data-control="${dataControl}"]`);
  return btn?.classList.contains("is-on") ?? true;
}

function updateBatteryModeButton(): void {
  const btn = document.getElementById("battery-mode-control");
  if (!btn) return;
  btn.textContent = `Baterija: ${BATTERY_MODE_LABEL[batteryMode]}`;
  btn.dataset.mode = batteryMode;
}

export function setSliderValue(id: string, value: number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  const clamped = Math.max(0, Math.min(100, value));
  if (Number(el.value) === clamped) return;
  el.value = String(clamped);
}

export function setToggle(dataControl: string, on: boolean): void {
  const btn = document.querySelector(`.ph-toggle[data-control="${dataControl}"]`);
  if (!btn) return;
  btn.classList.toggle("is-on", on);
}

export function setBatteryMode(mode: BatteryMode): void {
  if (!BATTERY_MODE_CYCLE.includes(mode)) return;
  if (batteryMode === mode) return;
  batteryMode = mode;
  updateBatteryModeButton();
}

export function applyHardwareControls(state: HardwareControlsState): void {
  setSliderValue(SLIDER_IDS.nuclear, state.pots.nuclear);
  setSliderValue(SLIDER_IDS.hydro, state.pots.hydro);
  setSliderValue(SLIDER_IDS.gas, state.pots.gas);
  setSliderValue(SLIDER_IDS.batteryFlow, state.pots.batteryFlow);

  setToggle("solar", state.toggles.solar);
  setToggle("wind", state.toggles.wind);
  setToggle("nuclear", state.toggles.nuclear);
  setToggle("hydro", state.toggles.hydro);
  setToggle("gas", state.toggles.gas);

  setBatteryMode(state.battery);
  notifyControlsChange();
}

export function readPlayerControls(): PlayerControls {
  return {
    nuclearLevel: sliderValue("ctrl-nuclear", 70),
    hydroLevel: sliderValue("ctrl-hydro", 50),
    gasLevel: sliderValue("ctrl-gas", 40),
    batteryFlowRate: sliderValue("ctrl-battery-flow", 50),
    windOn: toggleOn("wind"),
    solarOn: toggleOn("solar"),
    nuclearOn: toggleOn("nuclear"),
    hydroOn: toggleOn("hydro"),
    gasOn: toggleOn("gas"),
    batteryMode,
  };
}

export function bindPlayerControls(onChange?: () => void): void {
  if (controlsBound) {
    onControlsChange = onChange ?? null;
    return;
  }
  controlsBound = true;
  onControlsChange = onChange ?? null;

  document.querySelectorAll(".ph-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("is-on");
      notifyControlsChange();
    });
  });

  document.querySelectorAll(".ph-slider input[type='range']").forEach((input) => {
    input.addEventListener("input", () => notifyControlsChange());
  });

  const batteryBtn = document.getElementById("battery-mode-control");
  batteryBtn?.addEventListener("click", () => {
    const idx = BATTERY_MODE_CYCLE.indexOf(batteryMode);
    batteryMode = BATTERY_MODE_CYCLE[(idx + 1) % BATTERY_MODE_CYCLE.length];
    updateBatteryModeButton();
    notifyControlsChange();
  });

  updateBatteryModeButton();
}

export function resetPlayerControls(): void {
  batteryMode = "charge";
  controlsBound = false;
  onControlsChange = null;
}
