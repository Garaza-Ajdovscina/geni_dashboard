let currentPlayerName: string | null = null;

export function getPlayerName(): string | null {
  return currentPlayerName;
}

export function setPlayerName(name: string): void {
  currentPlayerName = name.trim() || null;
}

export function clearPlayerName(): void {
  currentPlayerName = null;
}
