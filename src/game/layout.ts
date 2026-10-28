import { drawFlowConnectors } from "./connectors";

let lastLeftMargin = -1;
let lastBatteryMargin = -1;
let lastSpeedReadoutTop = -1;
let layoutDebounce: ReturnType<typeof setTimeout> | null = null;
let connectorsDebounce: ReturnType<typeof setTimeout> | null = null;

function applyMarginTop(el: HTMLElement, px: number, last: { value: number }): void {
  const rounded = Math.round(px);
  if (last.value === rounded) return;
  last.value = rounded;
  el.style.marginTop = `${rounded}px`;
}

export function syncLeftColumnToSolar(): void {
  const grid = document.querySelector(".main-grid");
  const leftCol = document.querySelector(".col-left") as HTMLElement | null;
  const house = document.querySelector('.col-left .obj-card[data-key="house"]');
  const solar = document.querySelector('.col-right .obj-card[data-key="solar"]');
  if (!grid || !leftCol || !house || !solar) return;
  const last = { value: lastLeftMargin };
  if (window.matchMedia("(max-width: 900px)").matches) {
    applyMarginTop(leftCol, 0, last);
    lastLeftMargin = last.value;
    return;
  }
  const gRect = grid.getBoundingClientRect();
  const houseTop = house.getBoundingClientRect().top - gRect.top;
  const solarTop = solar.getBoundingClientRect().top - gRect.top;
  applyMarginTop(leftCol, solarTop - houseTop, last);
  lastLeftMargin = last.value;
}

export function syncBatteryBottomToProducerBottom(): void {
  const grid = document.querySelector(".main-grid");
  const battWrap = document.querySelector(".battery-in-center") as HTMLElement | null;
  const battCard = document.querySelector(".battery-in-center .obj-card");
  const lastProd =
    document.querySelector('.col-right .obj-card[data-key="hydro"]') ||
    document.querySelector(".col-right .obj-card:last-child");
  if (!grid || !battWrap || !battCard || !lastProd) return;
  const last = { value: lastBatteryMargin };
  if (window.matchMedia("(max-width: 900px)").matches) {
    applyMarginTop(battWrap, 0, last);
    lastBatteryMargin = last.value;
    return;
  }
  const gRect = grid.getBoundingClientRect();
  const targetBottom = lastProd.getBoundingClientRect().bottom - gRect.top;
  const currentBottom = battCard.getBoundingClientRect().bottom - gRect.top;
  applyMarginTop(battWrap, targetBottom - currentBottom, last);
  lastBatteryMargin = last.value;
}

export function syncSpeedReadoutBottom(): void {
  const display = document.querySelector(".gameplay-display") as HTMLElement | null;
  const readout = document.querySelector(".gameplay-speed-readout") as HTMLElement | null;
  const battCard = document.querySelector(".battery-in-center .obj-card");
  const hydro = document.querySelector('.col-right .obj-card[data-key="hydro"]');
  if (!display || !readout || !battCard) return;

  if (window.matchMedia("(max-width: 900px)").matches) {
    readout.style.top = "";
    readout.style.bottom = "8px";
    lastSpeedReadoutTop = -1;
    return;
  }

  const dRect = display.getBoundingClientRect();
  const anchor =
    hydro && hydro.getBoundingClientRect().bottom > 0 ? hydro : battCard;
  const targetBottom = anchor.getBoundingClientRect().bottom - dRect.top;
  const top = Math.round(targetBottom - readout.offsetHeight);
  if (lastSpeedReadoutTop === top) return;
  lastSpeedReadoutTop = top;
  readout.style.bottom = "auto";
  readout.style.top = `${top}px`;
}

/** Run alignment + connector lines once; avoids ResizeObserver ↔ margin feedback loops. */
export function runLayoutSync(): void {
  syncBatteryBottomToProducerBottom();
  syncLeftColumnToSolar();
  syncSpeedReadoutBottom();
  drawFlowConnectors();
}

export function scheduleLayoutSync(): void {
  if (layoutDebounce) clearTimeout(layoutDebounce);
  layoutDebounce = setTimeout(() => {
    layoutDebounce = null;
    requestAnimationFrame(runLayoutSync);
  }, 150);
}

export function scheduleConnectorRedraw(): void {
  if (connectorsDebounce) clearTimeout(connectorsDebounce);
  connectorsDebounce = setTimeout(() => {
    connectorsDebounce = null;
    drawFlowConnectors();
  }, 150);
}

export function resetLayoutCache(): void {
  lastLeftMargin = -1;
  lastBatteryMargin = -1;
  lastSpeedReadoutTop = -1;
}

let resizeListenerBound = false;

export function bindLayoutOnWindowResize(): void {
  if (resizeListenerBound) return;
  resizeListenerBound = true;
  window.addEventListener("resize", () => {
    resetLayoutCache();
    scheduleLayoutSync();
  });
}
