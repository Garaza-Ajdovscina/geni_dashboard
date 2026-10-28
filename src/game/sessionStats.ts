/** Per-game counters; extend with additional fields as needed. */
export interface SessionStats {
  /** Simulated game seconds elapsed while running (not paused). */
  playGameSeconds: number;
  /** Simulated game seconds with hub imbalance alert active. */
  imbalanceAlertGameSeconds: number;
}

export function createSessionStats(): SessionStats {
  return {
    playGameSeconds: 0,
    imbalanceAlertGameSeconds: 0,
  };
}

export function recordSessionTick(stats: SessionStats, inImbalanceAlert: boolean): void {
  stats.playGameSeconds += 1;
  if (inImbalanceAlert) stats.imbalanceAlertGameSeconds += 1;
}

export function imbalanceAlertFraction(stats: SessionStats): number {
  if (stats.playGameSeconds <= 0) return 0;
  return stats.imbalanceAlertGameSeconds / stats.playGameSeconds;
}

export function imbalanceAlertPct(stats: SessionStats): number {
  return Math.round(imbalanceAlertFraction(stats) * 1000) / 10;
}
