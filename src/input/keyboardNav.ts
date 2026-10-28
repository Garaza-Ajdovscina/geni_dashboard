import { getView, navigate } from "../router";
import { isGameEngineRunning, stepGameSpeed } from "../game/engine";
import { resumeGame, toggleGamePause } from "../views/game";

const NAV_CLASS = "kb-nav-item";
const FOCUS_CLASS = "is-kb-focused";
const ABOVE_LINE_ONLY_CLASS = "kiosk-above-line-only";

export type PanelButtonName =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "ENTER"
  | "BACKSPACE"
  | "ESC"
  | "SPEED_LEFT"
  | "SPEED_RIGHT"
  | "FULLSCREEN";

let focusScope: Element | null = null;
let focusIndex = -1;
let bound = false;

function isBelowRedLine(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".bottom-bar"));
}

function isTextField(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement && (el.type === "text" || el.type === "search");
}

function getNavScope(): Element | null {
  const username = document.querySelector(".username-overlay");
  if (username && !username.hasAttribute("hidden")) return username;

  const pause = document.querySelector("#pause-overlay");
  if (pause && !pause.hasAttribute("hidden")) return pause;

  const view = getView();
  if (view === "game" || view === "username") {
    return document.querySelector(".gameplay-display");
  }

  return document.querySelector("#app .screen-panel");
}

function getNavItems(scope: Element): HTMLElement[] {
  return Array.from(scope.querySelectorAll(`.${NAV_CLASS}`)) as HTMLElement[];
}

function applyFocus(scope: Element, index: number): void {
  const items = getNavItems(scope);
  if (items.length === 0) {
    focusIndex = -1;
    return;
  }
  const next = ((index % items.length) + items.length) % items.length;
  focusIndex = next;
  focusScope = scope;
  items.forEach((el, i) => {
    const on = i === next;
    el.classList.toggle(FOCUS_CLASS, on);
    if (on) {
      if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) {
        el.focus({ preventScroll: true });
      }
    }
  });
}

export function resetKeyboardFocus(): void {
  focusScope = getNavScope();
  focusIndex = -1;
  document.querySelectorAll(`.${FOCUS_CLASS}`).forEach((el) => {
    el.classList.remove(FOCUS_CLASS);
  });
  if (focusScope) applyFocus(focusScope, 0);
}

export function moveFocus(delta: number): void {
  const scope = getNavScope();
  if (!scope) return;
  const items = getNavItems(scope);
  if (items.length === 0) return;
  const base = scope === focusScope ? focusIndex : -1;
  applyFocus(scope, base + delta);
}

export function activateFocused(): void {
  const scope = getNavScope();
  if (!scope || focusScope !== scope || focusIndex < 0) return;
  const items = getNavItems(scope);
  const el = items[focusIndex];
  if (!el) return;

  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") {
      el.checked = !el.checked;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (el.type === "range") return;
    if (isTextField(el)) {
      if (scope.classList.contains("username-overlay")) {
        el.closest(".username-overlay")?.querySelector<HTMLButtonElement>("#btn-start-game")?.click();
      }
      return;
    }
  }

  el.click();
}

export function adjustRangeFocused(delta: number): void {
  const scope = getNavScope();
  if (!scope || focusScope !== scope || focusIndex < 0) return;
  const el = getNavItems(scope)[focusIndex];
  if (!(el instanceof HTMLInputElement) || el.type !== "range") return;
  const step = Number(el.step) || 1;
  const min = Number(el.min);
  const max = Number(el.max);
  const next = Math.max(min, Math.min(max, Number(el.value) + delta * step));
  el.value = String(next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function handleBack(): void {
  if (document.querySelector(".username-overlay:not([hidden])")) {
    navigate("menu");
    return;
  }
  if (document.querySelector("#pause-overlay:not([hidden])")) {
    resumeGame();
    return;
  }
  switch (getView()) {
    case "leaderboard":
    case "instructions":
    case "settings":
    case "credits":
    case "username":
      navigate("menu");
      break;
    default:
      break;
  }
}

export function toggleAboveLineOnly(): void {
  document.body.classList.toggle(ABOVE_LINE_ONLY_CLASS);
}

let lastFullscreenMs = 0;

export function toggleBrowserFullscreen(): void {
  const now = Date.now();
  if (now - lastFullscreenMs < 450) return;
  lastFullscreenMs = now;

  const root = document.documentElement;
  if (document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => {});
    return;
  }

  const request =
    root.requestFullscreen?.bind(root) ??
    (root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(root);
  if (request) {
    void request().catch(() => {});
  }
}

export function handleNavButton(name: PanelButtonName): void {
  switch (name) {
    case "UP":
      moveFocus(-1);
      break;
    case "DOWN":
      moveFocus(1);
      break;
    case "LEFT": {
      const scope = getNavScope();
      const el =
        scope && focusScope === scope && focusIndex >= 0
          ? getNavItems(scope)[focusIndex]
          : null;
      if (el instanceof HTMLInputElement && el.type === "range") {
        adjustRangeFocused(-1);
      } else {
        moveFocus(-1);
      }
      break;
    }
    case "RIGHT": {
      const scope = getNavScope();
      const el =
        scope && focusScope === scope && focusIndex >= 0
          ? getNavItems(scope)[focusIndex]
          : null;
      if (el instanceof HTMLInputElement && el.type === "range") {
        adjustRangeFocused(1);
      } else {
        moveFocus(1);
      }
      break;
    }
    case "ENTER":
      activateFocused();
      break;
    case "BACKSPACE":
      handleBack();
      break;
    case "ESC": {
      const view = getView();
      if (document.querySelector(".username-overlay:not([hidden])")) {
        navigate("menu");
      } else if (view === "game" || view === "username") {
        toggleGamePause();
      }
      break;
    }
    case "SPEED_LEFT":
      if (isGameEngineRunning()) stepGameSpeed(-1);
      break;
    case "SPEED_RIGHT":
      if (isGameEngineRunning()) stepGameSpeed(1);
      break;
    case "FULLSCREEN":
      toggleBrowserFullscreen();
      break;
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (isBelowRedLine(e.target)) return;

  const key = e.key;

  if ((key === "z" || key === "Z") && isGameEngineRunning()) {
    e.preventDefault();
    stepGameSpeed(-1);
    return;
  }
  if ((key === "x" || key === "X") && isGameEngineRunning()) {
    e.preventDefault();
    stepGameSpeed(1);
    return;
  }

  if (key === "Escape") {
    const view = getView();
    if (document.querySelector(".username-overlay:not([hidden])")) {
      e.preventDefault();
      navigate("menu");
      return;
    }
    if (view === "game" || view === "username") {
      e.preventDefault();
      toggleGamePause();
    }
    return;
  }

  if (key === "Backspace") {
    if (e.target instanceof HTMLInputElement && isTextField(e.target) && e.target.value.length > 0) {
      return;
    }
    e.preventDefault();
    handleBack();
    return;
  }

  if (key === "Enter") {
    e.preventDefault();
    activateFocused();
    return;
  }

  if (key === "ArrowLeft" || key === "ArrowRight") {
    const scope = getNavScope();
    const el =
      scope && focusScope === scope && focusIndex >= 0
        ? getNavItems(scope)[focusIndex]
        : null;
    if (el instanceof HTMLInputElement && el.type === "range") {
      e.preventDefault();
      adjustRangeFocused(key === "ArrowRight" ? 1 : -1);
      return;
    }
  }

  if (key === "ArrowDown" || key === "ArrowRight") {
    e.preventDefault();
    moveFocus(1);
    return;
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    e.preventDefault();
    moveFocus(-1);
  }
}

export function initKeyboardNavigation(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("keydown", onKeyDown);
  resetKeyboardFocus();
}

export function refreshKeyboardFocus(): void {
  resetKeyboardFocus();
}
