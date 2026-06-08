export type ParsedTile = { fileName: string; rotate: boolean };

const segmentPattern = /([A-Za-z])([0-9]+)/y;
const maxTiles = 18;
const validSuits = new Set(["m", "p", "s", "z"]);

export function parsePaiGroups(input: string): ParsedTile[][] {
  const groups = input.trim().split(/\s+/).filter(Boolean);
  let totalTiles = 0;

  return groups.map((group) => {
    const tiles: ParsedTile[] = [];
    segmentPattern.lastIndex = 0;

    while (segmentPattern.lastIndex < group.length) {
      const match = segmentPattern.exec(group);
      if (!match) {
        throw new Error(`Invalid tile group: ${group}`);
      }

      const suit = match[1]!;
      const rotate = suit.toUpperCase() === suit;
      const tileSuit = suit.toLowerCase();
      if (!validSuits.has(tileSuit)) {
        throw new Error(`Unsupported tile suit: ${suit}`);
      }

      for (const digit of match[2]!) {
        if (tileSuit === "z" && Number(digit) > 7) {
          throw new Error(`Unsupported tile digit for honor suit: ${digit}`);
        }

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
