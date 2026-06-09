export const supportedGameModeIds = [8, 9, 11, 12, 15, 16, 21, 22, 23, 24, 25, 26] as const;

export type GameModeId = (typeof supportedGameModeIds)[number];

export const gameModeLabels: Record<GameModeId, string> = {
  8: "4금동",
  9: "4금반",
  11: "4옥동",
  12: "4옥반",
  15: "4왕동",
  16: "4왕반",
  21: "3금동",
  22: "3금반",
  23: "3옥동",
  24: "3옥반",
  25: "3왕동",
  26: "3왕반"
};
