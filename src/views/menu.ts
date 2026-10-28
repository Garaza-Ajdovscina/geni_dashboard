import { navigate } from "../router";

export function renderMenu(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <div class="screen-panel">
        <div class="menu-header">
          <h2 class="menu-brand-title">Sončna hiška</h2>
          <img class="menu-logo" src="./gen_i_logo.png" alt="Gen-I" />
        </div>
        <p class="menu-tagline">Gen-I sistemski operater energetskega omrežja</p>
        <nav class="menu-actions" aria-label="Glavni meni">
          <button type="button" class="btn btn-primary kb-nav-item" data-action="new-game">Nova igra</button>
          <button type="button" class="btn kb-nav-item" data-action="leaderboard">Lestvica najboljših</button>
          <button type="button" class="btn kb-nav-item" data-action="instructions">Navodila za igro</button>
          <button type="button" class="btn kb-nav-item" data-action="settings">Nastavitve</button>
          <button type="button" class="btn btn-ghost kb-nav-item" data-action="hardware-test">Test strojne opreme</button>
          <button type="button" class="btn kb-nav-item" data-action="credits">Ustvarjalci</button>
        </nav>
      </div>
    </div>
  `;

  root.querySelector('[data-action="new-game"]')?.addEventListener("click", () => navigate("username"));
  root.querySelector('[data-action="leaderboard"]')?.addEventListener("click", () => navigate("leaderboard"));
  root.querySelector('[data-action="instructions"]')?.addEventListener("click", () => navigate("instructions"));
  root.querySelector('[data-action="settings"]')?.addEventListener("click", () => navigate("settings"));
  root.querySelector('[data-action="hardware-test"]')?.addEventListener("click", () => navigate("hardware-test"));
  root.querySelector('[data-action="credits"]')?.addEventListener("click", () => navigate("credits"));
}
