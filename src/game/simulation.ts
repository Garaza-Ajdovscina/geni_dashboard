import { clamp, rnd } from "./utils";
import type { PlayerControls } from "./controls";
import {
  BATTERY_FLOW_DISPLAY_DIVISOR,
  CONSUMER_CAPACITY,
  GAME_SECONDS_PER_DAY,
  HYDRO_RESERVOIR_BREAKEVEN_PCT,
  HYDRO_RESERVOIR_EMPTY_DAYS_AT_MAX,
  HYDRO_RESERVOIR_FILL_DAYS_AT_ZERO,
  NUCLEAR_SLIDER_RESPONSE_FACTOR,
  PRODUCER_CAPACITY,
} from "./constants";
import {
  sampleWeibullKmh,
  WIND_DISPLAY_MAX_KMH,
  WIND_WEIBULL_A_KMH,
  WIND_WEIBULL_K,
} from "./weibull";

export const MAX_POINTS = 14;
export const CHART_KEYS = ["wind", "solar", "gas", "nuclear", "house", "industry", "hydro"] as const;
export type ChartKey = (typeof CHART_KEYS)[number];

export type ProducerKey = keyof typeof PRODUCER_CAPACITY;
export type ConsumerKey = keyof typeof CONSUMER_CAPACITY;

export interface SimulationState {
  /** Simulated wall clock (ms since epoch); advances with game ticks, not real time. */
  gameClockMs: number;
  battery: number;
  hydroReservoir: number;
  /** Oblačnost / solar factor 0–100 (legacy sun field). */
  sun: number;
  /** Wind speed km/h (Weibull A=21, k=3). */
  windKmh: number;
  producers: Record<ProducerKey, number>;
  consumers: Record<ConsumerKey, number>;
  history: Record<ChartKey, number[]>;
  /** Average producer output 0–100 (mean of five producer %). */
  aggregateProductionPct: number;
  /** Average consumer load 0–100 (mean of two consumer %). */
  aggregateConsumptionPct: number;
  /** Hub display: negative of aggregateConsumptionPct. */
  consumptionHubDisplayPct: number;
  /** aggregateProductionPct − aggregateConsumptionPct */
  balancePct: number;
  /** Smoothed nuclear slider 0–100 (lags behind control). */
  nuclearSmoothLevel: number;
  /** Signed battery flow % (−10…+10): negative = charge, positive = discharge. */
  batteryFlowDisplayPct: number;
  /** production + consumptionHubDisplay + batteryFlowDisplay */
  netHubPct: number;
}

export function producerOutputPct(value: number, key: ProducerKey): number {
  return clamp((value / PRODUCER_CAPACITY[key]) * 100, 0, 100);
}

export function consumerLoadPct(value: number, key: ConsumerKey): number {
  return clamp((value / CONSUMER_CAPACITY[key]) * 100, 0, 100);
}

export function computeAggregateProductionPct(state: SimulationState): number {
  const keys: ProducerKey[] = ["wind", "solar", "gas", "nuclear", "hydro"];
  const sum = keys.reduce((acc, k) => acc + producerOutputPct(state.producers[k], k), 0);
  return sum / keys.length;
}

export function computeAggregateConsumptionPct(state: SimulationState): number {
  return (
    (consumerLoadPct(state.consumers.house, "house") +
      consumerLoadPct(state.consumers.industry, "industry")) /
    2
  );
}

function hydroReservoirDeltaPerGameSecond(levelPct: number): number {
  const dist = levelPct - HYDRO_RESERVOIR_BREAKEVEN_PCT;
  if (Math.abs(dist) < 1e-6) return 0;
  const intensity = Math.abs(dist) / HYDRO_RESERVOIR_BREAKEVEN_PCT;
  if (dist < 0) {
    return intensity / (HYDRO_RESERVOIR_FILL_DAYS_AT_ZERO * GAME_SECONDS_PER_DAY);
  }
  return -intensity / (HYDRO_RESERVOIR_EMPTY_DAYS_AT_MAX * GAME_SECONDS_PER_DAY);
}

export function createSimulationState(): SimulationState {
  const history = {} as Record<ChartKey, number[]>;
  for (const k of CHART_KEYS) {
    history[k] = Array(MAX_POINTS).fill(0);
  }
  return {
    gameClockMs: Date.now(),
    battery: 0.5,
    hydroReservoir: 0.62,
    sun: 72,
    windKmh: sampleWeibullKmh(WIND_WEIBULL_A_KMH, WIND_WEIBULL_K),
    producers: { wind: 0, solar: 0, gas: 0, nuclear: 0, hydro: 0 },
    consumers: { house: 0, industry: 0 },
    history,
    aggregateProductionPct: 0,
    aggregateConsumptionPct: 0,
    consumptionHubDisplayPct: 0,
    balancePct: 0,
    nuclearSmoothLevel: 70,
    batteryFlowDisplayPct: -5,
    netHubPct: 0,
  };
}

function pushHistory(state: SimulationState, key: ChartKey, v: number): void {
  const h = state.history[key];
  h.push(v);
  if (h.length > MAX_POINTS) h.shift();
}

export function updateHubDerived(state: SimulationState, controls: PlayerControls): void {
  state.aggregateProductionPct = computeAggregateProductionPct(state);
  state.aggregateConsumptionPct = computeAggregateConsumptionPct(state);
  state.consumptionHubDisplayPct = -state.aggregateConsumptionPct;
  state.balancePct = state.aggregateProductionPct - state.aggregateConsumptionPct;
  const magnitude = controls.batteryFlowRate / BATTERY_FLOW_DISPLAY_DIVISOR;
  if (controls.batteryMode === "discharge") {
    state.batteryFlowDisplayPct = magnitude;
  } else if (controls.batteryMode === "charge") {
    state.batteryFlowDisplayPct = -magnitude;
  } else {
    state.batteryFlowDisplayPct = 0;
  }
  state.netHubPct =
    state.aggregateProductionPct +
    state.consumptionHubDisplayPct +
    state.batteryFlowDisplayPct;
}

export function tickSimulation(
  state: SimulationState,
  controls: PlayerControls
): {
  totalGen: number;
  totalUse: number;
  imbalance: number;
} {
  state.sun = clamp(state.sun + rnd(-4, 4), 15, 100);
  const freshWind = sampleWeibullKmh(WIND_WEIBULL_A_KMH, WIND_WEIBULL_K);
  state.windKmh = clamp(state.windKmh * 0.55 + freshWind * 0.45, 0, WIND_DISPLAY_MAX_KMH * 1.15);

  const sunFactor = state.sun / 100;
  const windFactor = clamp(state.windKmh / WIND_DISPLAY_MAX_KMH, 0, 1);

  const windBase = 20 + windFactor * 55 + rnd(-3, 3);
  const solarBase = sunFactor * 70 + rnd(-2, 2);
  const gasBase = 25 + rnd(-4, 4);
  const nuclearBase = 58 + rnd(-1, 1);
  const hydroBase = 18 + state.hydroReservoir * 35 + rnd(-2, 2);

  const nuclearTarget = controls.nuclearOn ? controls.nuclearLevel : 0;
  state.nuclearSmoothLevel +=
    (nuclearTarget - state.nuclearSmoothLevel) * NUCLEAR_SLIDER_RESPONSE_FACTOR;

  state.producers.wind = controls.windOn ? windBase : 0;
  state.producers.solar = controls.solarOn ? solarBase : 0;
  state.producers.gas = controls.gasOn ? gasBase * (controls.gasLevel / 100) : 0;
  state.producers.nuclear = controls.nuclearOn
    ? nuclearBase * (state.nuclearSmoothLevel / 100)
    : 0;
  state.producers.hydro = controls.hydroOn ? hydroBase * (controls.hydroLevel / 100) : 0;

  state.consumers.house = 19 + rnd(-2.4, 2.4);
  state.consumers.industry = 28 + rnd(-3, 3);

  if (controls.hydroOn) {
    state.hydroReservoir = clamp(
      state.hydroReservoir + hydroReservoirDeltaPerGameSecond(controls.hydroLevel),
      0,
      1
    );
  }

  const totalGen =
    state.producers.wind +
    state.producers.solar +
    state.producers.gas +
    state.producers.nuclear +
    state.producers.hydro;
  const totalUse = state.consumers.house + state.consumers.industry;
  const imbalance = totalGen - totalUse;
  const flowMult = controls.batteryFlowRate / 100;
  const chargeRate = 0.012 * flowMult;
  const dischargeFactor = 0.08 * flowMult;

  if (controls.batteryMode === "charge" && imbalance > 2) {
    state.battery = clamp(state.battery + chargeRate * (imbalance / 80), 0, 1);
  } else if (controls.batteryMode === "discharge" && imbalance < -2) {
    const need = -imbalance;
    const fromBatt = Math.min(need / 120, state.battery * dischargeFactor);
    state.battery = clamp(state.battery - fromBatt, 0, 1);
  } else if (controls.batteryMode !== "off") {
    state.battery = clamp(state.battery + rnd(-0.003, 0.003), 0, 1);
  }

  updateHubDerived(state, controls);

  for (const k of CHART_KEYS) {
    if (k === "hydro") {
      pushHistory(state, k, producerOutputPct(state.producers.hydro, "hydro"));
    } else if (k === "house") {
      pushHistory(state, k, consumerLoadPct(state.consumers.house, "house"));
    } else if (k === "industry") {
      pushHistory(state, k, consumerLoadPct(state.consumers.industry, "industry"));
    } else {
      pushHistory(state, k, producerOutputPct(state.producers[k], k));
    }
  }

  return { totalGen, totalUse, imbalance };
}
