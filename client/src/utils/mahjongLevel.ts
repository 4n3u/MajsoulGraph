const levelNames: Record<number, string> = {
  1: "초심",
  2: "작사",
  3: "작걸",
  4: "작호",
  5: "작성",
  6: "혼천",
  7: "혼천"
};

export function formatLevelName(level: number): string {
  const tier = Math.floor(level / 100) % 100;
  const rank = level % 100;
  const name = levelNames[tier];
  if (!name || rank <= 0) return String(level);
  return `${name}${rank}`;
}
