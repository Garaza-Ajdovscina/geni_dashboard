import { applyHardwareControls, type HardwareControlsState } from "../game/controls";
import { handleNavButton, type PanelButtonName } from "../input/keyboardNav";
import { getView } from "../router";

export type HardwareEvent =
  | { type: "connection"; connected: boolean }
  | { type: "button"; name: string }
  | { type: "panel_snap"; states: boolean[] }
  | { type: "switches_snap"; states: boolean[] }
  | { type: "controls"; state: HardwareControlsState };

const WS_URL = "ws://127.0.0.1:8765";
const STORAGE_KEY = "geni-hardware";
const RECONNECT_MS = 2000;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
const listeners = new Set<(event: HardwareEvent) => void>();

function notify(event: HardwareEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeHardware(listener: (event: HardwareEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isHardwareConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}

export function isHardwareEnabled(): boolean {
  if (import.meta.env.VITE_HARDWARE_BRIDGE === "1") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("hardware") === "1") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function isPanelButtonName(name: string): name is PanelButtonName {
  return (
    name === "UP" ||
    name === "DOWN" ||
    name === "LEFT" ||
    name === "RIGHT" ||
    name === "ENTER" ||
    name === "BACKSPACE" ||
    name === "ESC" ||
    name === "SPEED_LEFT" ||
    name === "SPEED_RIGHT" ||
    name === "FULLSCREEN"
  );
}

function isBatteryMode(value: string): value is HardwareControlsState["battery"] {
  return value === "charge" || value === "discharge" || value === "off";
}

function parseControlsMessage(record: Record<string, unknown>): HardwareControlsState | null {
  if (record.type !== "controls" || !record.pots || !record.toggles) return null;
  const pots = record.pots as Record<string, unknown>;
  const toggles = record.toggles as Record<string, unknown>;
  if (typeof record.battery !== "string" || !isBatteryMode(record.battery)) return null;

  return {
    pots: {
      nuclear: Number(pots.nuclear) || 0,
      hydro: Number(pots.hydro) || 0,
      gas: Number(pots.gas) || 0,
      batteryFlow: Number(pots.batteryFlow) || 0,
    },
    toggles: {
      solar: Boolean(toggles.solar),
      wind: Boolean(toggles.wind),
      nuclear: Boolean(toggles.nuclear),
      hydro: Boolean(toggles.hydro),
      gas: Boolean(toggles.gas),
    },
    battery: record.battery,
  };
}

function handleMessage(data: string): void {
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }
  if (!msg || typeof msg !== "object") return;

  const record = msg as Record<string, unknown>;
  if (record.type === "button" && typeof record.name === "string") {
    const name = record.name;
    notify({ type: "button", name });
    if (name === "FULLSCREEN") {
      handleNavButton("FULLSCREEN");
    } else if (getView() !== "hardware-test" && isPanelButtonName(name)) {
      handleNavButton(name);
    }
    return;
  }

  if (record.type === "panel_snap" && Array.isArray(record.states)) {
    notify({
      type: "panel_snap",
      states: (record.states as unknown[]).map(Boolean),
    });
    return;
  }

  if (record.type === "switches_snap" && Array.isArray(record.states)) {
    notify({
      type: "switches_snap",
      states: (record.states as unknown[]).map(Boolean),
    });
    return;
  }

  const controls = parseControlsMessage(record);
  if (controls) {
    notify({ type: "controls", state: controls });
    if (getView() !== "hardware-test") {
      applyHardwareControls(controls);
    }
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_MS);
}

function connect(): void {
  if (socket) {
    socket.close();
    socket = null;
  }

  try {
    socket = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    console.info("[hardware] WebSocket connected");
    notify({ type: "connection", connected: true });
  });

  socket.addEventListener("message", (event) => {
    if (typeof event.data === "string") handleMessage(event.data);
  });

  socket.addEventListener("close", () => {
    console.warn("[hardware] WebSocket closed — reconnecting");
    notify({ type: "connection", connected: false });
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function ensureHardwareClient(): void {
  if (started) return;
  started = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  connect();
}

export function initHardwareClient(): void {
  if (started || !isHardwareEnabled()) return;
  ensureHardwareClient();
}

export function stopHardwareClient(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  started = false;
}
