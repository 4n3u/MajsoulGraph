import { supportedGameModeIds, type GameModeId } from "./mahjongModes";

export type { GameModeId } from "./mahjongModes";

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
  pointBefore: number;
  point: number;
  basePoint: number;
  promotionPoint: number;
  level: number;
  rank: number;
  modeId: GameModeId;
  startTime: number;
  endTime: number;
};

export type RankTransition = {
  index: number;
  fromLevel: number;
  toLevel: number;
  fromLevelLabel: string;
  toLevelLabel: string;
  ceilingPoint: number;
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

export type RankPeriodSummary = {
  averageRank: number;
  endTime: number;
  gameCount: number;
  highPoint: number;
  indexEnd: number;
  indexStart: number;
  level: number;
  levelLabel: string;
  lowPoint: number;
  modeCounts: Partial<Record<GameModeId, number>>;
  periodDays: number;
  rankCounts: Record<1 | 2 | 3 | 4, number>;
  startTime: number;
};

export type TimelineResult = {
  points: TimelinePoint[];
  rankHistory: RankHistoryEntry[];
  rankPeriods: RankPeriodSummary[];
  rankTransitions: RankTransition[];
  summary: {
    gameCount: number;
    lowPoint: number;
    highPoint: number;
    finalPoint: number;
    highestLevel: number;
    highestLevelLabel: string;
    maxPointLimit: number;
  };
};

type PointTimelineGameRecord = Omit<GameRecord, "modeId"> & {
  modeId: GameModeId | number;
};

export type PointTimelineInput = {
  recordsDescending: PointTimelineGameRecord[];
  targetAccountId: number;
  initialLevel: number;
  historyLevel: number;
};

type PointTimelineProcessorState = {
  chronological: PointTimelineGameRecord[];
  currentBasePoint: number;
  currentPoint: number;
  historyPoint: number;
  historyPreviousLevel: number;
  nextIndex: number;
  points: TimelinePoint[];
  previousLevel: number;
  rankHistory: RankHistoryEntry[];
  rankTransitions: RankTransition[];
};

const danNames = ["사", "걸", "호", "성", "천", "천"] as const;
const ptBase: Record<number, number> = { 301: 6, 302: 7, 303: 10, 401: 14, 402: 16, 403: 18, 501: 20, 502: 30, 503: 45 };
const maxUp: Record<number, number> = {
  301: 1200,
  302: 1400,
  303: 2000,
  401: 2800,
  402: 3200,
  403: 3600,
  501: 4000,
  502: 6000,
  503: 9000
};
const supportedModeIds = new Set<number>(supportedGameModeIds);

for (let level = 601; level <= 620; level += 1) {
  maxUp[level] = 10000;
}

for (let level = 701; level <= 720; level += 1) {
  maxUp[level] = 10000;
}

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

export function levelPointLimit(level: number): number {
  return maxUp[level % 1000] ?? 5000;
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

function createProcessorState(input: PointTimelineInput): PointTimelineProcessorState {
  const chronological = [...input.recordsDescending].reverse();
  const initialModeId = chronological[0] === undefined ? 16 : assertGameModeId(chronological[0].modeId);

  return {
    chronological,
    currentBasePoint: 600,
    currentPoint: 600,
    historyPoint: 600,
    historyPreviousLevel: input.historyLevel,
    nextIndex: 0,
    points: [
      {
        index: 0,
        pointBefore: 600,
        point: 600,
        basePoint: 600,
        promotionPoint: 1200,
        level: input.initialLevel,
        rank: 0,
        modeId: initialModeId,
        startTime: 0,
        endTime: 0
      }
    ],
    previousLevel: input.initialLevel,
    rankHistory: [],
    rankTransitions: []
  };
}

function processTimelineRecord(state: PointTimelineProcessorState, input: PointTimelineInput): void {
  const game = state.chronological[state.nextIndex];
  if (!game) return;

  const index = state.nextIndex;
  state.nextIndex += 1;

  const player = game.players.find((item) => item.accountId === input.targetAccountId);
  if (!player) return;

  const modeId = assertGameModeId(game.modeId);
  const rank = getRank(game.players, input.targetAccountId);

  if (state.previousLevel !== player.level) {
    state.rankTransitions.push({
      index,
      fromLevel: state.previousLevel,
      toLevel: player.level,
      fromLevelLabel: levelDan(state.previousLevel),
      toLevelLabel: levelDan(player.level),
      ceilingPoint: Math.max(levelPtBase(player.level), levelPtBase(state.previousLevel)) * 2
    });
    state.currentBasePoint = levelPtBase(player.level);
    state.currentPoint = levelPtBase(player.level);
  }

  const pointBefore = state.currentPoint;
  state.currentPoint = applyGradingScore(player.level, state.currentPoint, player.gradingScore);

  state.points.push({
    index: index + 1,
    pointBefore,
    point: state.currentPoint,
    basePoint: state.currentBasePoint,
    promotionPoint: state.currentBasePoint * 2,
    level: player.level,
    rank,
    modeId,
    startTime: game.startTime,
    endTime: game.endTime
  });

  if (state.historyPreviousLevel !== player.level) {
    state.historyPoint = levelPtBase(player.level);
  }

  const historyPointBefore = state.historyPoint;
  state.historyPoint = applyGradingScore(player.level, state.historyPoint, player.gradingScore);

  state.rankHistory.push({
    index: index + 1,
    fromLevel: state.historyPreviousLevel,
    toLevel: player.level,
    fromLevelLabel: levelDan(state.historyPreviousLevel),
    toLevelLabel: levelDan(player.level),
    rank,
    pointBefore: historyPointBefore,
    pointAfter: state.historyPoint,
    modeId,
    startTime: game.startTime,
    endTime: game.endTime
  });

  state.previousLevel = player.level;
  state.historyPreviousLevel = player.level;
}

function dayNumber(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 86_400_000);
}

function createEmptyRankCounts(): Record<1 | 2 | 3 | 4, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

function buildRankPeriods(rankHistory: RankHistoryEntry[]): RankPeriodSummary[] {
  type MutableRankPeriod = Omit<RankPeriodSummary, "averageRank" | "periodDays"> & {
    rankTotal: number;
  };

  const periods: MutableRankPeriod[] = [];

  for (const entry of rankHistory) {
    let period = periods.at(-1);
    if (!period || period.level !== entry.toLevel) {
      period = {
        endTime: entry.endTime,
        gameCount: 0,
        highPoint: entry.pointBefore,
        indexEnd: entry.index,
        indexStart: entry.index,
        level: entry.toLevel,
        levelLabel: entry.toLevelLabel,
        lowPoint: entry.pointBefore,
        modeCounts: {},
        rankCounts: createEmptyRankCounts(),
        rankTotal: 0,
        startTime: entry.startTime
      };
      periods.push(period);
    }

    period.endTime = entry.endTime;
    period.indexEnd = entry.index;
    period.gameCount += 1;
    period.highPoint = Math.max(period.highPoint, entry.pointBefore, entry.pointAfter);
    period.lowPoint = Math.min(period.lowPoint, entry.pointBefore, entry.pointAfter);
    period.rankTotal += entry.rank;

    if (entry.rank === 1 || entry.rank === 2 || entry.rank === 3 || entry.rank === 4) {
      period.rankCounts[entry.rank] += 1;
    }
    period.modeCounts[entry.modeId] = (period.modeCounts[entry.modeId] ?? 0) + 1;
  }

  return periods.map(({ rankTotal, ...period }) => ({
    ...period,
    averageRank: rankTotal / period.gameCount,
    periodDays: dayNumber(period.endTime) - dayNumber(period.startTime) + 1
  }));
}

function finalizeTimeline(state: PointTimelineProcessorState): TimelineResult {
  const pointValues = state.points.map((point) => point.point);
  const highestLevel = Math.max(...state.points.map((point) => point.level));

  return {
    points: state.points,
    rankHistory: state.rankHistory,
    rankPeriods: buildRankPeriods(state.rankHistory),
    rankTransitions: state.rankTransitions,
    summary: {
      gameCount: Math.max(state.points.length - 1, 0),
      lowPoint: Math.min(...pointValues),
      highPoint: Math.max(...pointValues),
      finalPoint: state.points.at(-1)?.point ?? 600,
      highestLevel,
      highestLevelLabel: levelDan(highestLevel),
      maxPointLimit: levelPointLimit(highestLevel)
    }
  };
}

export function createPointTimelineProcessor(input: PointTimelineInput) {
  const state = createProcessorState(input);

  return {
    get current() {
      return state.nextIndex;
    },
    get total() {
      return state.chronological.length;
    },
    processNext() {
      processTimelineRecord(state, input);
      return {
        current: state.nextIndex,
        total: state.chronological.length
      };
    },
    finish(): TimelineResult {
      while (state.nextIndex < state.chronological.length) {
        processTimelineRecord(state, input);
      }

      return finalizeTimeline(state);
    }
  };
}

export function buildPointTimeline(input: PointTimelineInput): TimelineResult {
  return createPointTimelineProcessor(input).finish();
}
