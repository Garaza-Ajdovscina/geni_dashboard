import { loadSettings, saveSettings } from "../core/storage";
import type { AppSettings } from "../core/types";
import { SPEED_OPTIONS } from "../core/types";
import { navigate } from "../router";
import { updateGameSettings } from "../game/engine";

let current: AppSettings = loadSettings();

export function renderSettings(root: HTMLElement): void {
  current = loadSettings();
  const speedLabels = SPEED_OPTIONS.map((s) => `${s}×`).join(", ");

  root.innerHTML = `
    <div class="screen">
      <div class="screen-panel">
        <h1 class="screen-title">Nastavitve</h1>
        <p class="screen-subtitle">Hitrost simulacije in zvok (ostalo pride kasneje)</p>
        <div class="settings-row">
          <label for="speed-range">Hitrost igre (${speedLabels})</label>
          <input type="range" id="speed-range" class="kb-nav-item" min="0" max="4" step="1" value="${current.speedIndex}" />
        </div>
        <p style="text-align:center;color:var(--muted);font-size:0.85rem;margin:0 0 12px" id="speed-label"></p>
        <div class="settings-row">
          <label for="sound-enabled">Zvok</label>
          <input type="checkbox" id="sound-enabled" class="kb-nav-item" ${current.soundEnabled ? "checked" : ""} />
        </div>
        <div class="screen-footer">
          <button type="button" class="btn btn-primary kb-nav-item" id="btn-save">Shrani</button>
          <button type="button" class="btn btn-ghost kb-nav-item" id="btn-back">Nazaj v meni</button>
        </div>
      </div>
    </div>
  `;

  const speedRange = root.querySelector("#speed-range") as HTMLInputElement;
  const speedLabel = root.querySelector("#speed-label");
  const updateLabel = () => {
    if (speedLabel) {
      speedLabel.textContent = `Trenutno: ${SPEED_OPTIONS[Number(speedRange.value)]}×`;
    }
  };
  updateLabel();
  speedRange.addEventListener("input", updateLabel);

  root.querySelector("#btn-save")?.addEventListener("click", () => {
    current.speedIndex = Number(speedRange.value);
    current.soundEnabled = (root.querySelector("#sound-enabled") as HTMLInputElement).checked;
    saveSettings(current);
    updateGameSettings(current);
    navigate("menu");
  });

  root.querySelector("#btn-back")?.addEventListener("click", () => navigate("menu"));
}
