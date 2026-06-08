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

export type PointTimelineInput = {
  recordsDescending: PointTimelineGameRecord[];
  targetAccountId: number;
  initialLevel: number;
  historyLevel: number;
};

type PointTimelineProcessorState = {
  chronological: PointTimelineGameRecord[];
  currentPoint: number;
  historyPoint: number;
  historyPreviousLevel: number;
  nextIndex: number;
  points: TimelinePoint[];
  previousLevel: number;
  rankHistory: RankHistoryEntry[];
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

function createProcessorState(input: PointTimelineInput): PointTimelineProcessorState {
  const chronological = [...input.recordsDescending].reverse();
  const initialModeId = chronological[0] === undefined ? 16 : assertGameModeId(chronological[0].modeId);

  return {
    chronological,
    currentPoint: 600,
    historyPoint: 600,
    historyPreviousLevel: input.historyLevel,
    nextIndex: 0,
    points: [
      {
        index: 0,
        point: 600,
        level: input.initialLevel,
        rank: 0,
        modeId: initialModeId,
        startTime: 0,
        endTime: 0
      }
    ],
    previousLevel: input.initialLevel,
    rankHistory: []
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
    state.currentPoint = levelPtBase(player.level);
  }

  state.currentPoint = applyGradingScore(player.level, state.currentPoint, player.gradingScore);

  state.points.push({
    index: index + 1,
    point: state.currentPoint,
    level: player.level,
    rank,
    modeId,
    startTime: game.startTime,
    endTime: game.endTime
  });

  if (state.historyPreviousLevel !== player.level) {
    state.historyPoint = levelPtBase(player.level);
  }

  const pointBefore = state.historyPoint;
  state.historyPoint = applyGradingScore(player.level, state.historyPoint, player.gradingScore);

  state.rankHistory.push({
    index: index + 1,
    fromLevel: state.historyPreviousLevel,
    toLevel: player.level,
    fromLevelLabel: levelDan(state.historyPreviousLevel),
    toLevelLabel: levelDan(player.level),
    rank,
    pointBefore,
    pointAfter: state.historyPoint,
    modeId,
    startTime: game.startTime,
    endTime: game.endTime
  });

  state.previousLevel = player.level;
  state.historyPreviousLevel = player.level;
}

function finalizeTimeline(state: PointTimelineProcessorState): TimelineResult {
  const pointValues = state.points.map((point) => point.point);
  const highestLevel = Math.max(...state.points.map((point) => point.level));

  return {
    points: state.points,
    rankHistory: state.rankHistory,
    summary: {
      gameCount: Math.max(state.points.length - 1, 0),
      lowPoint: Math.min(...pointValues),
      highPoint: Math.max(...pointValues),
      finalPoint: state.points.at(-1)?.point ?? 600,
      highestLevel,
      highestLevelLabel: levelDan(highestLevel)
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
