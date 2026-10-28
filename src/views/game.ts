import boardHtml from "../game/board.html?raw";
import { getPlayerName } from "../core/session";
import { loadSettings } from "../core/storage";
import {
  isGameEngineRunning,
  isPaused,
  setPaused,
  startGame,
  stopGame,
} from "../game/engine";
import { navigate } from "../router";
import { refreshKeyboardFocus } from "../input/keyboardNav";

const PAUSE_OVERLAY_HTML = (player: string) => `
  <div class="pause-overlay" id="pause-overlay" hidden>
    <div class="screen-panel pause-panel">
      <h2 class="screen-title" style="font-size:1.35rem">Premor</h2>
      <p class="screen-subtitle">Igralec: ${escapeHtml(player)}</p>
      <div class="screen-footer">
        <button type="button" class="btn btn-primary kb-nav-item" id="btn-resume">Nadaljuj</button>
        <button type="button" class="btn kb-nav-item" id="btn-quit-menu">Končaj in v meni</button>
      </div>
    </div>
  </div>
`;

const pauseIconSvg =
  '<svg viewBox="0 0 24 24" width="1.1rem" height="1.1rem" focusable="false"><path fill="currentColor" d="M6 5h3.5v14H6V5zm8.5 0H18v14h-3.5V5z"/></svg>';
const playIconSvg =
  '<svg viewBox="0 0 24 24" width="1.1rem" height="1.1rem" focusable="false"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>';

export function mountGameShell(root: HTMLElement): HTMLElement {
  let view = root.querySelector(".game-view");
  if (!view) {
    root.innerHTML = `<div class="game-view">${boardHtml}</div>`;
    view = root.querySelector(".game-view");
  }
  return view as HTMLElement;
}

function ensurePauseOverlay(gameView: HTMLElement, playerLabel: string): void {
  if (!gameView.querySelector("#pause-overlay")) {
    gameView.insertAdjacentHTML("beforeend", PAUSE_OVERLAY_HTML(playerLabel));
  }
  bindPauseControls(gameView);
}

function bindPauseControls(scope: ParentNode): void {
  const overlay = scope.querySelector("#pause-overlay") as HTMLElement | null;
  const btnPause = scope.querySelector("#btn-pause");
  if (!overlay || !btnPause || btnPause.hasAttribute("data-pause-bound")) return;
  btnPause.setAttribute("data-pause-bound", "true");

  const showPause = (show: boolean) => {
    overlay.hidden = !show;
    setPaused(show);
    const label = btnPause.querySelector("#btn-pause-label");
    const iconWrap = btnPause.querySelector(".pause-icon");
    if (label) label.textContent = show ? "Nadaljuj" : "Premor";
    if (iconWrap) iconWrap.innerHTML = show ? playIconSvg : pauseIconSvg;
    btnPause.setAttribute("title", show ? "Nadaljuj" : "Premor");
    refreshKeyboardFocus();
  };

  btnPause.addEventListener("click", () => showPause(!isPaused()));
  scope.querySelector("#btn-resume")?.addEventListener("click", () => showPause(false));
  scope.querySelector("#btn-quit-menu")?.addEventListener("click", () => {
    stopGame();
    navigate("menu");
  });
}

export function toggleGamePause(): void {
  if (!isGameEngineRunning()) return;
  const btnPause = document.querySelector("#btn-pause") as HTMLButtonElement | null;
  btnPause?.click();
}

export function resumeGame(): void {
  if (!isPaused()) return;
  const btnResume = document.querySelector("#btn-resume") as HTMLButtonElement | null;
  if (btnResume) btnResume.click();
  else toggleGamePause();
}

export function renderGame(root: HTMLElement): void {
  const player = getPlayerName();
  if (!player) {
    navigate("username");
    return;
  }

  const gameView = mountGameShell(root);
  root.querySelector(".username-overlay")?.remove();
  ensurePauseOverlay(gameView, player);
  startGame(loadSettings());
}

export function teardownGame(): void {
  stopGame();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
