import {
  BATTERY_FLOW_DISPLAY_MAX_PCT,
  BATTERY_FLOW_DISPLAY_MIN_PCT,
  FLOW_HUB_ARC_SPAN_FRACTION,
  FLOW_HUB_GAUGE_BAND_WIDTH,
} from "./constants";
import { clamp } from "./utils";

const CX = 50;
const CY = 50;
const R_OUTER = 49.5;
const R_INNER = R_OUTER - FLOW_HUB_GAUGE_BAND_WIDTH;

type GaugeKey = "consume" | "produce" | "battery";

const GAUGE_CENTERS: Record<GaugeKey, number> = {
  consume: 180,
  produce: 0,
  battery: 90,
};

function polar(deg: number, radius: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function arcAngles(centerDeg: number): { start: number; end: number; mid: number } {
  const half = (360 * FLOW_HUB_ARC_SPAN_FRACTION) / 2;
  return { start: centerDeg - half, end: centerDeg + half, mid: centerDeg };
}

function valueToAngle(value: number, min: number, max: number, startDeg: number, endDeg: number): number {
  const t = clamp((value - min) / (max - min), 0, 1);
  return startDeg + t * (endDeg - startDeg);
}

function annularSectorPath(startDeg: number, endDeg: number): string {
  if (endDeg <= startDeg) return "";

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const outerStart = polar(startDeg, R_OUTER);
  const outerEnd = polar(endDeg, R_OUTER);
  const innerEnd = polar(endDeg, R_INNER);
  const innerStart = polar(startDeg, R_INNER);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function gaugeFillPath(key: GaugeKey, value: number): string {
  const { start, end, mid } = arcAngles(GAUGE_CENTERS[key]);

  if (key === "battery") {
    const clamped = clamp(value, BATTERY_FLOW_DISPLAY_MIN_PCT, BATTERY_FLOW_DISPLAY_MAX_PCT);
    if (Math.abs(clamped) < 1e-6) return "";
    const valueAngle = valueToAngle(
      clamped,
      BATTERY_FLOW_DISPLAY_MIN_PCT,
      BATTERY_FLOW_DISPLAY_MAX_PCT,
      start,
      end
    );
    if (clamped > 0) return annularSectorPath(mid, valueAngle);
    return annularSectorPath(valueAngle, mid);
  }

  const clamped = clamp(value, 0, 100);
  if (clamped <= 0) return "";

  if (key === "produce") {
    const valueAngle = valueToAngle(clamped, 0, 100, end, start);
    return annularSectorPath(valueAngle, end);
  }

  const valueAngle = valueToAngle(clamped, 0, 100, start, end);
  return annularSectorPath(start, valueAngle);
}

function gaugeTrackPath(key: GaugeKey): string {
  const { start, end } = arcAngles(GAUGE_CENTERS[key]);
  return annularSectorPath(start, end);
}

function gaugePath(key: GaugeKey, kind: "track" | "fill"): SVGPathElement | null {
  return document.querySelector(`.flow-gauge__${kind}[data-gauge="${key}"]`);
}

export function initFlowHubGauges(): void {
  for (const key of Object.keys(GAUGE_CENTERS) as GaugeKey[]) {
    const track = gaugePath(key, "track");
    const fill = gaugePath(key, "fill");
    track?.setAttribute("d", gaugeTrackPath(key));
    fill?.setAttribute("d", "");
  }
}

export function updateFlowHubGauges(values: {
  consumePct: number;
  producePct: number;
  batteryFlowPct: number;
}): void {
  const mapping: [GaugeKey, number][] = [
    ["consume", values.consumePct],
    ["produce", values.producePct],
    ["battery", values.batteryFlowPct],
  ];

  for (const [key, value] of mapping) {
    const fill = gaugePath(key, "fill");
    fill?.setAttribute("d", gaugeFillPath(key, value));
  }
}
