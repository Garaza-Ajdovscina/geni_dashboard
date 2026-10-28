import { navigate } from "../router";

export function renderCredits(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <div class="screen-panel">
        <h1 class="screen-title">Ustvarjalci</h1>
        <div class="instructions-body">
          <p>
            Ta interaktivna igrica je namenjena predstavitvi delovanja energetskega
            sistema v okviru projekta Gen-I.
          </p>
          <p>
            Podrobnejši seznam ustvarjalcev in zahvale bodo dodani kasneje.
          </p>
        </div>
        <div class="screen-footer">
          <button type="button" class="btn kb-nav-item" id="btn-back">Nazaj v meni</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#btn-back")?.addEventListener("click", () => navigate("menu"));
}
