import type { AppSettings, LeaderboardEntry } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const KEYS = {
  settings: "geni-settings",
  players: "geni-known-players",
  leaderboard: "geni-leaderboard",
  theme: "energy-grid-theme",
} as const;

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      speedIndex:
        typeof parsed.speedIndex === "number"
          ? Math.max(0, Math.min(4, parsed.speedIndex))
          : DEFAULT_SETTINGS.speedIndex,
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      theme: parsed.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  localStorage.setItem(KEYS.theme, settings.theme);
}

export function loadKnownPlayers(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.players);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
  } catch {
    return [];
  }
}

export function addKnownPlayer(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const players = loadKnownPlayers();
  const next = [trimmed, ...players.filter((p) => p.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    24
  );
  localStorage.setItem(KEYS.players, JSON.stringify(next));
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.leaderboard);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (e): e is LeaderboardEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as LeaderboardEntry).name === "string" &&
          typeof (e as LeaderboardEntry).score === "number"
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  localStorage.setItem(KEYS.leaderboard, JSON.stringify(entries.slice(0, 50)));
}

export function addLeaderboardEntry(entry: LeaderboardEntry): void {
  const list = loadLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  saveLeaderboard(list.slice(0, 50));
}
