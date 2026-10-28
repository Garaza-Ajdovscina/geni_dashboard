/**
 * Starts Vite, waits until the server responds, then opens the system browser (Safari/Chrome/etc.).
 * Use: npm run dev:browser
 */
import { spawn, exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = "http://localhost:5174/";

async function waitForServer(maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function openInSystemBrowser() {
  const target = url;
  if (process.platform === "darwin") {
    exec(`open "${target}"`);
  } else if (process.platform === "win32") {
    exec(`start "" "${target}"`);
  } else {
    exec(`xdg-open "${target}"`);
  }
}

const vite = spawn("npx", ["vite"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BROWSER: "none" },
});

vite.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => vite.kill("SIGINT"));
process.on("SIGTERM", () => vite.kill("SIGTERM"));

void (async () => {
  const ready = await waitForServer();
  if (ready) {
    console.log(`\n→ Opening in your system browser: ${url}\n`);
    openInSystemBrowser();
  } else {
    console.warn(
      `\nDev server did not respond in time. When you see "ready" above, open:\n  ${url}\n`
    );
  }
})();
