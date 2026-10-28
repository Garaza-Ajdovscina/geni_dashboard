import { loadLeaderboard } from "../core/storage";
import { navigate } from "../router";

export function renderLeaderboard(root: HTMLElement): void {
  const entries = loadLeaderboard();
  const rows =
    entries.length === 0
      ? `<tr><td colspan="4">Še ni rezultatov. Odigraj prvo igro!</td></tr>`
      : entries
          .map(
            (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(e.name)}</td>
          <td>${e.score}</td>
          <td>${formatDate(e.playedAt)}</td>
        </tr>`
          )
          .join("");

  root.innerHTML = `
    <div class="screen">
      <div class="screen-panel">
        <h1 class="screen-title">Lestvica najboljših</h1>
        <p class="screen-subtitle">Shranjeni rezultati (več statistik pride kasneje)</p>
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Igralec</th>
              <th>Točke</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="screen-footer">
          <button type="button" class="btn kb-nav-item" id="btn-back">Nazaj v meni</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#btn-back")?.addEventListener("click", () => navigate("menu"));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
