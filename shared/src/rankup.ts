export type MahjongType = "four" | "three";

export type StageName = "동탁" | "은탁" | "금탁" | "옥탁" | "왕좌탁";

export interface DanOption {
  id: string;
  name: string;
  necessaryPoint: number;
  tierIndex: number;
}

export const STAGES: readonly StageName[] = ["동탁", "은탁", "금탁", "옥탁", "왕좌탁"];

export const DAN_OPTIONS: readonly DanOption[] = [
  { id: "novice1", name: "초심1", necessaryPoint: 20, tierIndex: 0 },
  { id: "novice2", name: "초심2", necessaryPoint: 80, tierIndex: 0 },
  { id: "novice3", name: "초심3", necessaryPoint: 200, tierIndex: 0 },
  { id: "adept1", name: "작사1", necessaryPoint: 600, tierIndex: 1 },
  { id: "adept2", name: "작사2", necessaryPoint: 800, tierIndex: 1 },
  { id: "adept3", name: "작사3", necessaryPoint: 1000, tierIndex: 1 },
  { id: "expert1", name: "작걸1", necessaryPoint: 1200, tierIndex: 2 },
  { id: "expert2", name: "작걸2", necessaryPoint: 1400, tierIndex: 2 },
  { id: "expert3", name: "작걸3", necessaryPoint: 2000, tierIndex: 2 },
  { id: "master1", name: "작호1", necessaryPoint: 2800, tierIndex: 3 },
  { id: "master2", name: "작호2", necessaryPoint: 3200, tierIndex: 3 },
  { id: "master3", name: "작호3", necessaryPoint: 3600, tierIndex: 3 },
  { id: "saint1", name: "작성1", necessaryPoint: 4000, tierIndex: 4 },
  { id: "saint2", name: "작성2", necessaryPoint: 6000, tierIndex: 4 },
  { id: "saint3", name: "작성3", necessaryPoint: 9000, tierIndex: 4 },
];

export const SCORE_FOUR_SOUTH: readonly (readonly [number, number])[] = [
  [35, 15],
  [55, 25],
  [95, 45],
  [125, 60],
  [135, 65]
];

export const SCORE_FOUR_EAST: readonly (readonly [number, number])[] = [
  [25, 10],
  [35, 15],
  [55, 25],
  [70, 35],
  [75, 35]
];

export const SCORE_THREE_SOUTH: readonly (readonly [number, number])[] = [
  [45, 0],
  [75, 0],
  [120, 0],
  [175, 0],
  [255, 0]
];

export const SCORE_THREE_EAST: readonly (readonly [number, number])[] = [
  [30, 0],
  [45, 0],
  [70, 0],
  [90, 0],
  [135, 0]
];

export type RankConditionResult =
  | { type: "unconditional" }
  | { type: "impossible" }
  | { type: "score"; requiredScore: number };

export interface RankupConditionRow {
  stage: StageName;
  gameMode: string;
  firstPlace: RankConditionResult;
  secondPlace: RankConditionResult;
}

export interface RankupCalculationResult {
  dan: DanOption;
  currentPoints: number;
  maxPoints: number;
  neededPoints: number;
  conditions: RankupConditionRow[];
}

export const DEFAULT_DAN: DanOption = DAN_OPTIONS[9]!;

export function getEligibleStages(tierIndex: number): StageName[] {
  if (tierIndex <= 0) {
    return ["동탁"];
  }
  const current = STAGES[tierIndex] ?? "동탁";
  const lower = STAGES[tierIndex - 1] ?? "동탁";
  return [current, lower];
}

export function calculateRankupConditions(params: {
  mahjongType: MahjongType;
  danId: string;
  currentPoints: number;
}): RankupCalculationResult {
  const dan = DAN_OPTIONS.find((item) => item.id === params.danId) ?? DEFAULT_DAN;
  const maxPoints = dan.necessaryPoint;
  const currentPoints = Math.max(0, Math.min(params.currentPoints, maxPoints));
  const neededPoints = maxPoints - currentPoints;

  const isFour = params.mahjongType === "four";
  const initialScore = isFour ? 25000 : 35000;
  const lengthNames = isFour ? ["사마 반장", "사마 동풍"] : ["삼마 반장", "삼마 동풍"];
  const scoreTables = isFour
    ? [SCORE_FOUR_SOUTH, SCORE_FOUR_EAST]
    : [SCORE_THREE_SOUTH, SCORE_THREE_EAST];

  const eligibleStages = getEligibleStages(dan.tierIndex);
  const conditions: RankupConditionRow[] = [];

  for (const stage of eligibleStages) {
    const stageIndex = STAGES.indexOf(stage);

    const defaultTable = isFour ? SCORE_FOUR_SOUTH : SCORE_THREE_SOUTH;
    for (let l = 0; l < 2; l++) {
      const gameMode = lengthNames[l] ?? (isFour ? "사마 반장" : "삼마 반장");
      const table = scoreTables[l] ?? defaultTable;
      const scores = table[stageIndex] ?? [0, 0];

      const getPoint1 = neededPoints - scores[0];
      let firstPlace: RankConditionResult;
      if (getPoint1 <= 0) {
        firstPlace = { type: "unconditional" };
      } else {
        firstPlace = {
          type: "score",
          requiredScore: initialScore + getPoint1 * 1000 - 900
        };
      }

      const getPoint2 = neededPoints - scores[1];
      const calcScore2 = initialScore + getPoint2 * 1000 - 900;
      let secondPlace: RankConditionResult;
      if (calcScore2 > 70000) {
        secondPlace = { type: "impossible" };
      } else if (calcScore2 < -10000) {
        secondPlace = { type: "unconditional" };
      } else {
        secondPlace = {
          type: "score",
          requiredScore: calcScore2
        };
      }

      conditions.push({
        stage,
        gameMode,
        firstPlace,
        secondPlace
      });
    }
  }

  return {
    dan,
    currentPoints,
    maxPoints,
    neededPoints,
    conditions
  };
}
