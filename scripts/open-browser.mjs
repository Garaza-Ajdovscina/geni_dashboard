/** Opens the game in your system browser (run while dev server is up). */
import { exec } from "node:child_process";

const url = "http://localhost:5174/";

if (process.platform === "darwin") {
  exec(`open "${url}"`);
} else if (process.platform === "win32") {
  exec(`start "" "${url}"`);
} else {
  exec(`xdg-open "${url}"`);
}

console.log(`Opening ${url}`);
