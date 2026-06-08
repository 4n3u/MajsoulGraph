export type ParsedTile = { fileName: string; rotate: boolean };

const segmentPattern = /([A-Za-z])([0-9]+)/g;
const maxTiles = 18;

export function parsePaiGroups(input: string): ParsedTile[][] {
  const groups = input.trim().split(/\s+/).filter(Boolean);
  let totalTiles = 0;

  return groups.map((group) => {
    const tiles: ParsedTile[] = [];

    for (const match of group.matchAll(segmentPattern)) {
      const suit = match[1]!;
      const rotate = suit.toUpperCase() === suit;
      const tileSuit = suit.toLowerCase();

      for (const digit of match[2]!) {
        totalTiles += 1;
        if (totalTiles > maxTiles) {
          throw new Error("Hand parser supports a maximum 18 tiles");
        }

        tiles.push({ fileName: `${digit}${tileSuit}.png`, rotate });
      }
    }

    return tiles;
  });
}
