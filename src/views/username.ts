import { addKnownPlayer, loadKnownPlayers, loadSettings } from "../core/storage";
import { setPlayerName } from "../core/session";
import { prepareGameBoard } from "../game/engine";
import { mountGameShell } from "./game";
import { navigate } from "../router";
import { refreshKeyboardFocus } from "../input/keyboardNav";

export function renderUsername(root: HTMLElement): void {
  const players = loadKnownPlayers();
  const chips = players
    .map(
      (p) =>
        `<button type="button" class="player-chip kb-nav-item" data-name="${escapeAttr(p)}">${escapeHtml(p)}</button>`
    )
    .join("");

  root.querySelector(".username-overlay")?.remove();
  const gameView = mountGameShell(root);
  prepareGameBoard(loadSettings());

  const overlay = document.createElement("div");
  overlay.className = "username-overlay screen-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "username-title");
  overlay.innerHTML = `
    <div class="screen-panel username-panel">
      <h1 class="screen-title" id="username-title">Nova igra</h1>
      <p class="screen-subtitle">Vnesi svoje ime ali izberi obstoječega igralca</p>
      <div class="form-group">
        <label for="player-name">Ime igralca</label>
        <input type="text" id="player-name" class="kb-nav-item" maxlength="24" placeholder="npr. Ana" autocomplete="off" />
      </div>
      ${
        players.length
          ? `<div class="form-group"><label>Že igrali</label><div class="player-pick-list">${chips}</div></div>`
          : ""
      }
      <div class="screen-footer">
        <button type="button" class="btn btn-primary kb-nav-item" id="btn-start-game">Začni igro</button>
        <button type="button" class="btn btn-ghost kb-nav-item" id="btn-back-menu">Nazaj v meni</button>
      </div>
    </div>
  `;
  gameView.appendChild(overlay);

  const input = overlay.querySelector("#player-name") as HTMLInputElement;
  let selected = "";

  overlay.querySelectorAll(".player-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const name = chip.getAttribute("data-name") || "";
      selected = name;
      input.value = name;
      overlay.querySelectorAll(".player-chip").forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
    });
  });

  const start = () => {
    const name = (input.value || selected).trim();
    if (!name) {
      input.focus();
      return;
    }
    addKnownPlayer(name);
    setPlayerName(name);
    navigate("game");
  };

  overlay.querySelector("#btn-start-game")?.addEventListener("click", start);
  overlay.querySelector("#btn-back-menu")?.addEventListener("click", () => {
    navigate("menu");
  });

  requestAnimationFrame(() => {
    input.focus();
    refreshKeyboardFocus();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
