export type ViewId =
  | "menu"
  | "username"
  | "game"
  | "leaderboard"
  | "instructions"
  | "settings"
  | "hardware-test"
  | "credits";

export interface AppSettings {
  speedIndex: number;
  soundEnabled: boolean;
  theme: "light" | "dark";
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  playedAt: string;
  durationSec?: number;
  balanceScore?: number;
}

export const SPEED_OPTIONS = [1, 2, 4, 8, 16] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  speedIndex: 0,
  soundEnabled: true,
  theme: "light",
};
