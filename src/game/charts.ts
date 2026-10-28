import { Chart } from "chart.js/auto";
import { CHART_Y_MAX, CHART_Y_MIN } from "./constants";
import type { ChartKey, SimulationState } from "./simulation";
import { CHART_KEYS } from "./simulation";
import { chartBarColorsDark, chartConfigs, hexToRgba } from "./theme";

const charts: Partial<Record<ChartKey, Chart>> = {};
let chartResizeTimer: ReturnType<typeof setTimeout> | null = null;
let chartResizeListenerBound = false;

export function resizeAllMiniCharts(): void {
  for (const k of CHART_KEYS) {
    const ch = charts[k];
    const canvas = document.getElementById(`chart-${k}`) as HTMLCanvasElement | null;
    if (!ch || !canvas) continue;
    const wrap = canvas.parentElement;
    if (!wrap) continue;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight || 56;
    if (w > 0) ch.resize(w, h);
  }
}

function bindChartResizeOnWindow(): void {
  if (chartResizeListenerBound) return;
  chartResizeListenerBound = true;
  window.addEventListener("resize", () => {
    if (chartResizeTimer) clearTimeout(chartResizeTimer);
    chartResizeTimer = setTimeout(() => resizeAllMiniCharts(), 150);
  });
}

function makeMiniChart(canvasId: string, key: ChartKey, state: SimulationState): void {
  const cfg = chartConfigs[key];
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  charts[key] = new Chart(ctx, {
    type: "line",
    data: {
      labels: state.history[key].map((_, i) => String(i)),
      datasets: [
        {
          label: cfg.label,
          data: [...state.history[key]],
          borderColor: cfg.color,
          backgroundColor: hexToRgba(cfg.color, 0.22),
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2.5),
      layout: { padding: { left: 0, right: 0, top: 2, bottom: 0 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, displayColors: false },
      },
      scales: {
        x: {
          type: "category",
          display: false,
          offset: false,
          grid: { display: false, drawTicks: false },
        },
        y: {
          type: "linear",
          display: false,
          min: CHART_Y_MIN,
          max: CHART_Y_MAX,
          grid: { display: false, drawTicks: false },
        },
      },
      elements: {
        line: { borderJoinStyle: "round", capBezierPoints: true },
      },
      animation: { duration: 240 },
    },
  });
}

export function initCharts(state: SimulationState): void {
  for (const k of CHART_KEYS) {
    makeMiniChart(`chart-${k}`, k, state);
  }
  bindChartResizeOnWindow();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => resizeAllMiniCharts());
  });
  refreshCharts(state);
}

export function refreshCharts(state: SimulationState): void {
  for (const k of CHART_KEYS) {
    const ch = charts[k];
    if (!ch) continue;
    const vals = state.history[k];
    ch.data.labels = vals.map((_, i) => String(i));
    ch.data.datasets[0].data = [...vals];
    ch.update("none");
  }
}

export function applyChartTheme(isDark: boolean): void {
  const fg = isDark ? "#e8eef4" : "#1a2b3c";
  const grid = isDark ? "rgba(148,168,188,0.2)" : "rgba(0,0,0,0.06)";
  for (const k of CHART_KEYS) {
    const ch = charts[k];
    if (!ch?.options?.scales) continue;
    ch.options.plugins ??= {};
    ch.options.plugins.tooltip ??= {};
    const tip = ch.options.plugins.tooltip;
    if (typeof tip === "object" && tip) {
      tip.backgroundColor = isDark ? "#243041" : "rgba(0,0,0,0.8)";
      tip.titleColor = fg;
      tip.bodyColor = fg;
    }
    const x = ch.options.scales.x;
    const y = ch.options.scales.y;
    if (x && typeof x === "object" && x.grid) x.grid.color = grid;
    if (y && typeof y === "object" && y.grid) y.grid.color = grid;
    const ds = ch.data.datasets[0];
    const base = isDark ? chartBarColorsDark[k] : chartConfigs[k].color;
    ds.borderColor = base;
    ds.backgroundColor = hexToRgba(base, isDark ? 0.32 : 0.2);
    ds.borderWidth = 2.5;
    ch.update("none");
  }
  resizeAllMiniCharts();
}

export function destroyCharts(): void {
  for (const k of CHART_KEYS) {
    charts[k]?.destroy();
    delete charts[k];
  }
}

export function bindChartResize(): void {
  bindChartResizeOnWindow();
}
