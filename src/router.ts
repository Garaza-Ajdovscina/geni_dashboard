import type { ViewId } from "./core/types";
import { renderCredits } from "./views/credits";
import { renderGame, teardownGame } from "./views/game";
import { renderInstructions } from "./views/instructions";
import { renderLeaderboard } from "./views/leaderboard";
import { renderMenu } from "./views/menu";
import { renderSettings } from "./views/settings";
import { renderHardwareTest, teardownHardwareTest } from "./views/hardwareTest";
import { renderUsername } from "./views/username";
import { refreshKeyboardFocus } from "./input/keyboardNav";

let currentView: ViewId = "menu";
const root = () => document.getElementById("app");

export function getView(): ViewId {
  return currentView;
}

export function navigate(view: ViewId): void {
  const el = root();
  if (!el) return;

  const hadGameEngine =
    currentView === "game" || currentView === "username";
  const needsGameEngine = view === "game" || view === "username";
  if (hadGameEngine && !needsGameEngine) {
    teardownGame();
  }
  if (currentView === "hardware-test" && view !== "hardware-test") {
    teardownHardwareTest();
  }

  currentView = view;

  switch (view) {
    case "menu":
      renderMenu(el);
      break;
    case "username":
      renderUsername(el);
      break;
    case "game":
      renderGame(el);
      break;
    case "leaderboard":
      renderLeaderboard(el);
      break;
    case "instructions":
      renderInstructions(el);
      break;
    case "settings":
      renderSettings(el);
      break;
    case "hardware-test":
      renderHardwareTest(el);
      break;
    case "credits":
      renderCredits(el);
      break;
  }

  requestAnimationFrame(() => refreshKeyboardFocus());
}

export function initRouter(): void {
  navigate("menu");
}
