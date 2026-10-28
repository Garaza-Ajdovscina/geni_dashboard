import { navigate } from "../router";

export function renderInstructions(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen">
      <div class="screen-panel">
        <h1 class="screen-title">Navodila za igro</h1>
        <div class="instructions-body">
          <p>
            Cilj igre je uravnavati proizvodnjo in porabo električne energije v omrežju.
            Spremljaj vreme (sonce in veter), proizvajalce na desni ter porabnike na levi.
          </p>
          <p>
            Ko je proizvodnja večja od porabe, se presežek shrani v baterijo.
            Ko je poraba večja, baterija razbremeni omrežje. Poskusi ohraniti ravnovesje čim dlje.
          </p>
          <p>
            <strong>Elementi (podrobneje kasneje):</strong> veter, sonce, plin, jedrska,
            hidro, gospodinjstva, industrija, baterija, hitrost simulacije.
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
