import os from "node:os";
import path from "node:path";
import { defineConfig } from "vite";

// Vite cache outside Dropbox — much faster restarts when the project lives in synced folders
const cacheDir = path.join(os.homedir(), ".cache", "gen-i-grid-vite");

export default defineConfig({
  base: "./",
  cacheDir,
  server: {
    port: 5174,
    strictPort: false,
    // Use `npm run dev:browser` to open Safari/Chrome; plain `npm run dev` does not auto-open
    open: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
    open: false,
  },
  optimizeDeps: {
    include: ["chart.js"],
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 4096,
  },
});
