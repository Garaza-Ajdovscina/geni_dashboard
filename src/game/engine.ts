import type { AppSettings } from "../core/types";
import { SPEED_OPTIONS } from "../core/types";
import { applyChartTheme, bindChartResize, destroyCharts, initCharts, refreshCharts } from "./charts";
import { bindPlayerControls, readPlayerControls, resetPlayerControls } from "./controls";
import { bindLayoutOnWindowResize, resetLayoutCache, runLayoutSync, scheduleConnectorRedraw } from "./layout";
import { initFlowHubGauges, updateFlowHubGauges } from "./flowHubGauges";
import { HUB_NET_ALERT_THRESHOLD_PCT } from "./constants";
import {
  createSessionStats,
  imbalanceAlertPct,
  recordSessionTick,
  type SessionStats,
} from "./sessionStats";
import { createSimulationState, tickSimulation, updateHubDerived, type SimulationState } from "./simulation";
import { WIND_DISPLAY_MAX_KMH } from "./weibull";
import { applyTheme } from "./theme";
// import { bindThemeToggle } from "./theme";

let simState: SimulationState | null = null;
let sessionStats: SessionStats | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let paused = false;
let simulationRunning = false;
let settings: AppSettings | null = null;

/** One simulated second advanced per game tick; tick rate follows speed setting. */
const SIM_SECONDS_PER_TICK = 1;

function formatGameClock(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function updateClock(): void {
  const el = document.getElementById("clock");
  if (!el || !simState) return;
  el.textContent = formatGameClock(simState.gameClockMs);
}

function advanceGameClock(): void {
  if (!simState) return;
  simState.gameClockMs += SIM_SECONDS_PER_TICK * 1000;
}

function updateWeatherUI(): void {
  if (!simState) return;
  const sunPct = document.getElementById("sun-pct");
  const windKmhEl = document.getElementById("wind-kmh");
  const sunBar = document.getElementById("sun-bar");
  const windBar = document.getElementById("wind-bar");
  if (sunPct) sunPct.textContent = String(Math.round(simState.sun));
  if (windKmhEl) windKmhEl.textContent = String(Math.round(simState.windKmh));
  if (sunBar) sunBar.style.width = `${simState.sun}%`;
  if (windBar) {
    const pct = Math.min(100, (simState.windKmh / WIND_DISPLAY_MAX_KMH) * 100);
    windBar.style.width = `${pct}%`;
  }
}

function updateBatteryUI(): void {
  if (!simState) return;
  const pct = Math.round(simState.battery * 100);
  const label = document.getElementById("battery-pct-label");
  const level = document.getElementById("battery-level");
  const hydro = document.getElementById("hydro-reservoir");
  if (label) label.textContent = `${pct}%`;
  if (level) level.style.width = `${pct}%`;
  if (hydro) hydro.style.width = `${simState.hydroReservoir * 100}%`;
}

function formatSignedPct(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  if (rounded < 0) return `${rounded}%`;
  return "0%";
}

function formatSignedDecimalPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  if (rounded < 0) return `${rounded.toFixed(1)}%`;
  return "0%";
}

function isHubImbalanceAlert(netHubPct: number): boolean {
  return (
    netHubPct > HUB_NET_ALERT_THRESHOLD_PCT || netHubPct < -HUB_NET_ALERT_THRESHOLD_PCT
  );
}

function updateSessionStatsUI(): void {
  if (!sessionStats) return;
  const el = document.getElementById("session-stat-imbalance-pct");
  if (!el) return;
  el.textContent = `V rdečem: ${imbalanceAlertPct(sessionStats)}%`;
}

function updateFlowHubStats(): void {
  if (!simState) return;
  const controls = readPlayerControls();
  updateHubDerived(simState, controls);

  const consume = document.getElementById("flow-consume-pct");
  const produce = document.getElementById("flow-produce-pct");
  const batteryFlow = document.getElementById("flow-battery-flow-pct");
  const net = document.getElementById("flow-net-pct");
  if (consume) consume.textContent = formatSignedPct(simState.consumptionHubDisplayPct);
  if (produce) produce.textContent = formatSignedPct(simState.aggregateProductionPct);
  if (batteryFlow) {
    batteryFlow.textContent = formatSignedDecimalPct(simState.batteryFlowDisplayPct);
  }
  if (net) net.textContent = formatSignedPct(simState.netHubPct);

  const flowCell = document.querySelector(".flow-cell");
  if (flowCell) {
    flowCell.classList.toggle("flow-cell--imbalance-alert", isHubImbalanceAlert(simState.netHubPct));
  }

  updateFlowHubGauges({
    consumePct: simState.aggregateConsumptionPct,
    producePct: simState.aggregateProductionPct,
    batteryFlowPct: simState.batteryFlowDisplayPct,
  });
}

function setBoardIdle(idle: boolean): void {
  document.querySelector(".game-view")?.classList.toggle("game-board--idle", idle);
}

function renderIdleBoard(): void {
  if (!simState) return;
  updateWeatherUI();
  updateBatteryUI();
  updateFlowHubStats();
  refreshCharts(simState);
  updateClock();
}

function bootstrapSimulationFrame(): void {
  if (!simState) return;
  tickSimulation(simState, readPlayerControls());
  renderIdleBoard();
}

function gameTick(): void {
  if (!simState) return;
  if (paused) {
    updateClock();
    updateFlowHubStats();
    return;
  }
  advanceGameClock();
  tickSimulation(simState, readPlayerControls());
  if (sessionStats) {
    recordSessionTick(sessionStats, isHubImbalanceAlert(simState.netHubPct));
    updateSessionStatsUI();
  }
  updateWeatherUI();
  updateBatteryUI();
  updateFlowHubStats();
  refreshCharts(simState);
  updateClock();
}

function updateSpeedDisplays(mult: number): void {
  const text = `${mult}×`;
  const readout = document.getElementById("speed-display");
  const controlVal = document.getElementById("speed-control-value");
  if (readout) readout.textContent = text;
  if (controlVal) controlVal.textContent = text;
}

function schedule(): void {
  if (timer) clearInterval(timer);
  if (!settings) return;
  const mult = SPEED_OPTIONS[settings.speedIndex] ?? 1;
  updateSpeedDisplays(mult);
  const ms = Math.max(32, Math.round(1000 / mult));
  timer = setInterval(gameTick, ms);
}

export function stepGameSpeed(delta: -1 | 1): void {
  if (!settings) return;
  const next = settings.speedIndex + delta;
  if (next < 0 || next >= SPEED_OPTIONS.length) return;
  settings.speedIndex = next;
  schedule();
}

function bindSpeedBox(): void {
  const control = document.getElementById("speed-control");
  if (!control || control.hasAttribute("data-speed-bound")) return;
  control.setAttribute("data-speed-bound", "true");
  control.addEventListener("click", () => {
    if (!settings) return;
    settings.speedIndex = (settings.speedIndex + 1) % SPEED_OPTIONS.length;
    schedule();
  });
}

function mountBoardCore(appSettings: AppSettings): void {
  settings = { ...appSettings };
  simState = createSimulationState();
  paused = false;

  applyTheme("light", applyChartTheme);
  resetLayoutCache();
  bindLayoutOnWindowResize();
  initCharts(simState);
  bindChartResize();
  bindSpeedBox();
  bindPlayerControls(() => {
    if (!simulationRunning) return;
    updateFlowHubStats();
    scheduleConnectorRedraw();
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      runLayoutSync();
      initFlowHubGauges();
      renderIdleBoard();
    });
  });
}

/** Mount the board behind menus without running the simulation. */
export function prepareGameBoard(appSettings: AppSettings): void {
  stopGame();
  simulationRunning = false;
  sessionStats = null;
  mountBoardCore(appSettings);
  setBoardIdle(true);
}

export function startGame(appSettings: AppSettings): void {
  if (!simState) {
    prepareGameBoard(appSettings);
  } else {
    settings = { ...appSettings };
  }

  if (simulationRunning) return;

  simulationRunning = true;
  setBoardIdle(false);
  sessionStats = createSessionStats();
  paused = false;
  bootstrapSimulationFrame();
  updateSessionStatsUI();
  schedule();
}

export function stopGame(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  destroyCharts();
  resetLayoutCache();
  resetPlayerControls();
  setBoardIdle(false);
  simState = null;
  sessionStats = null;
  paused = false;
  simulationRunning = false;
}

export function getSessionStats(): SessionStats | null {
  return sessionStats;
}

export function setPaused(value: boolean): void {
  paused = value;
}

export function isPaused(): boolean {
  return paused;
}

export function isGameEngineRunning(): boolean {
  return simulationRunning;
}

export function isGameBoardMounted(): boolean {
  return simState !== null;
}

export function updateGameSettings(next: AppSettings): void {
  settings = { ...next };
  if (simState && !paused) schedule();
}
