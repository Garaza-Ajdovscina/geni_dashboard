/** Max output (same units as simulation) → 100% on charts and aggregate totals. */
export const PRODUCER_CAPACITY = {
  wind: 80,
  solar: 75,
  gas: 30,
  nuclear: 60,
  hydro: 55,
} as const;

export const CONSUMER_CAPACITY = {
  house: 40,
  industry: 55,
} as const;

/** Hydro slider below this % fills the reservoir; above drains it. */
export const HYDRO_RESERVOIR_BREAKEVEN_PCT = 50;

/** Gameplay days for reservoir 0→100% when hydro slider is at 0%. */
export const HYDRO_RESERVOIR_FILL_DAYS_AT_ZERO = 3;

/** Gameplay days for reservoir 100→0% when hydro slider is at 100%. */
export const HYDRO_RESERVOIR_EMPTY_DAYS_AT_MAX = 3;

export const CHART_Y_MIN = 0;
export const CHART_Y_MAX = 100;

export const GAME_SECONDS_PER_DAY = 86_400;

/** Hub bottom readout = Baterija (hitrost) slider ÷ this value (0–100% → magnitude 0–10%). */
export const BATTERY_FLOW_DISPLAY_DIVISOR = 10;

/** Signed battery flow display range (charge → negative, discharge → positive). */
export const BATTERY_FLOW_DISPLAY_MAX_PCT = 100 / BATTERY_FLOW_DISPLAY_DIVISOR;
export const BATTERY_FLOW_DISPLAY_MIN_PCT = -BATTERY_FLOW_DISPLAY_MAX_PCT;

/** Each hub border gauge spans this fraction of the circle (1/6 → 60°). */
export const FLOW_HUB_ARC_SPAN_FRACTION = 1 / 6;

/** Central hub pulses red when net % is above +threshold or below −threshold. */
export const HUB_NET_ALERT_THRESHOLD_PCT = 10;

/** Radial thickness of hub border gauges (viewBox units). */
export const FLOW_HUB_GAUGE_BAND_WIDTH = 13.75;

/**
 * Nuclear output tracks its slider this fraction per game tick (others: 1).
 * 1/3 → three times slower response to control changes.
 */
export const NUCLEAR_SLIDER_RESPONSE_FACTOR = 1 / 3;
