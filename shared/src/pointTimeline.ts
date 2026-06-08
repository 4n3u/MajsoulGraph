export type GameModeId = 8 | 9 | 11 | 12 | 15 | 16 | 21 | 22 | 23 | 24 | 25 | 26;

export type PlayerRecord = {
  accountId: number;
  score: number;
  level: number;
  gradingScore: number;
};

export type GameRecord = {
  modeId: GameModeId;
  startTime: number;
  endTime: number;
  players: PlayerRecord[];
};

export type TimelinePoint = {
  index: number;
  point: number;
  level: number;
  rank: number;
  modeId: GameModeId;
  startTime: number;
  endTime: number;
};

export type RankHistoryEntry = {
  index: number;
  fromLevel: number;
  toLevel: number;
  fromLevelLabel: string;
  toLevelLabel: string;
  rank: number;
  pointBefore: number;
  pointAfter: number;
  modeId: GameModeId;
  startTime: number;
  endTime: number;
};

export type TimelineResult = {
  points: TimelinePoint[];
  rankHistory: RankHistoryEntry[];
  summary: {
    gameCount: number;
    lowPoint: number;
    highPoint: number;
    finalPoint: number;
    highestLevel: number;
    highestLevelLabel: string;
  };
};

type PointTimelineGameRecord = Omit<GameRecord, "modeId"> & {
  modeId: GameModeId | number;
};

const danNames = ["사", "걸", "호", "성", "천", "천"] as const;
const ptBase: Record<number, number> = { 301: 6, 302: 7, 303: 10, 401: 14, 402: 16, 403: 18, 501: 20, 502: 30, 503: 45 };
const supportedModeIds = new Set<number>([8, 9, 11, 12, 15, 16, 21, 22, 23, 24, 25, 26]);

function assertGameModeId(modeId: number): GameModeId {
  if (!supportedModeIds.has(modeId)) {
    throw new Error(`Unsupported game mode: ${modeId}`);
  }
  return modeId as GameModeId;
}

function applyGradingScore(level: number, point: number, gradingScore: number): number {
  return point + (Math.floor(level / 100) % 100 >= 7 ? gradingScore * 5 : gradingScore);
}

export function levelDan(level: number): string {
  const index = Math.floor(level / 100) % 100 - 2;
  const pythonIndex = index < 0 ? danNames.length + index : index;
  const name = danNames[pythonIndex];
  if (name === undefined) {
    throw new Error(`Unsupported rank label for level ${level}`);
  }
  return `${name}${level % 100}`;
}

export function levelPtBase(level: number): number {
  const tier = Math.floor(level / 100) % 100;
  if (tier >= 6) return 5000;
  const base = ptBase[level % 1000];
  if (base === undefined) {
    throw new Error(`Unsupported point base for level ${level}`);
  }
  return base * 100;
}

export function getRank(players: PlayerRecord[], targetAccountId: number): number {
  const rankIndex = [...players]
    .sort((a, b) => b.score - a.score)
    .findIndex((player) => player.accountId === targetAccountId);
  if (rankIndex < 0) {
    throw new Error(`Target account not found: ${targetAccountId}`);
  }
  return rankIndex + 1;
}

export function buildPointTimeline(input: {
  recordsDescending: PointTimelineGameRecord[];
  targetAccountId: number;
  initialLevel: number;
  historyLevel: number;
}): TimelineResult {
  let previousLevel = input.initialLevel;
  let currentPoint = 600;
  let historyPreviousLevel = input.historyLevel;
  let historyPoint = 600;

  const chronological = [...input.recordsDescending].reverse();
  const initialModeId = chronological[0] === undefined ? 16 : assertGameModeId(chronological[0].modeId);
  const points: TimelinePoint[] = [
    {
      index: 0,
      point: currentPoint,
      level: previousLevel,
      rank: 0,
      modeId: initialModeId,
      startTime: 0,
      endTime: 0
    }
  ];
  const rankHistory: RankHistoryEntry[] = [];

  for (let index = 0; index < chronological.length; index += 1) {
    const game = chronological[index]!;
    const player = game.players.find((item) => item.accountId === input.targetAccountId);
    if (!player) continue;

    const modeId = assertGameModeId(game.modeId);
    const rank = getRank(game.players, input.targetAccountId);

    if (previousLevel !== player.level) {
      currentPoint = levelPtBase(player.level);
    }

    currentPoint = applyGradingScore(player.level, currentPoint, player.gradingScore);

    points.push({
      index: index + 1,
      point: currentPoint,
      level: player.level,
      rank,
      modeId,
      startTime: game.startTime,
      endTime: game.endTime
    });

    if (historyPreviousLevel !== player.level) {
      historyPoint = levelPtBase(player.level);
    }

    const pointBefore = historyPoint;
    historyPoint = applyGradingScore(player.level, historyPoint, player.gradingScore);

    rankHistory.push({
      index: index + 1,
      fromLevel: historyPreviousLevel,
      toLevel: player.level,
      fromLevelLabel: levelDan(historyPreviousLevel),
      toLevelLabel: levelDan(player.level),
      rank,
      pointBefore,
      pointAfter: historyPoint,
      modeId,
      startTime: game.startTime,
      endTime: game.endTime
    });

    previousLevel = player.level;
    historyPreviousLevel = player.level;
  }

  const pointValues = points.map((point) => point.point);
  const highestLevel = Math.max(...points.map((point) => point.level));

  return {
    points,
    rankHistory,
    summary: {
      gameCount: Math.max(points.length - 1, 0),
      lowPoint: Math.min(...pointValues),
      highPoint: Math.max(...pointValues),
      finalPoint: points.at(-1)?.point ?? 600,
      highestLevel,
      highestLevelLabel: levelDan(highestLevel)
    }
  };
}
