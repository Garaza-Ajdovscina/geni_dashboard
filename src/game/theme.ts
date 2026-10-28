import type { ChartKey } from "./simulation";
import { hexToRgba } from "./utils";

const chartConfigs: Record<ChartKey, { color: string; label: string }> = {
  wind: { color: "#6ec1ff", label: "MW" },
  solar: { color: "#ffc93c", label: "MW" },
  gas: { color: "#a8b0b8", label: "MW" },
  nuclear: { color: "#9b7bff", label: "MW" },
  house: { color: "#7ec8e3", label: "MW" },
  industry: { color: "#ff9f6e", label: "MW" },
  hydro: { color: "#4db8d4", label: "MW" },
};

const chartBarColorsDark: Record<ChartKey, string> = {
  wind: "#7ecbff",
  solar: "#fcd34d",
  gas: "#d1d5db",
  nuclear: "#c4b5fd",
  house: "#7dd3fc",
  industry: "#fdba74",
  hydro: "#5eead4",
};

export function applyEnergyGradientTheme(isDark: boolean): void {
  const set = (id: string, c: string) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("stop-color", c);
  };
  if (isDark) {
    set("eg-stop-0", "#134e4a");
    set("eg-stop-1", "#ccfbf1");
    set("eg-stop-2", "#f0fdfa");
    set("eg-stop-3", "#ccfbf1");
    set("eg-stop-4", "#134e4a");
  } else {
    set("eg-stop-0", "#0f766e");
    set("eg-stop-1", "#99f6e4");
    set("eg-stop-2", "#ccfbf1");
    set("eg-stop-3", "#99f6e4");
    set("eg-stop-4", "#0f766e");
  }
}

export function applyTheme(
  theme: "light" | "dark",
  onChartTheme?: (isDark: boolean) => void
): void {
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  const btn = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-toggle-icon");
  const label = document.getElementById("theme-toggle-label");
  if (btn && icon && label) {
    if (isDark) {
      icon.textContent = "☀️";
      label.textContent = "Svetla";
      btn.setAttribute("title", "Preklopi na svetlo");
      btn.setAttribute("aria-label", "Preklopi na svetlo");
    } else {
      icon.textContent = "🌙";
      label.textContent = "Temna";
      btn.setAttribute("title", "Preklopi na temno");
      btn.setAttribute("aria-label", "Preklopi na temno");
    }
  }
  applyEnergyGradientTheme(isDark);
  onChartTheme?.(isDark);
}

export function bindThemeToggle(onChartTheme: (isDark: boolean) => void): void {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next, onChartTheme);
  });
}

export { chartConfigs, chartBarColorsDark, hexToRgba };
