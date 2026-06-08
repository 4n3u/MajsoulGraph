export type RawStyleStats = Record<string, number>;

export type ProcessedStyleStats = {
  horyuRate: number;
  houjuRate: number;
  furoRate: number;
  riichiRate: number;
  damaRate: number;
  averageScore: number;
  avgHoryuTurn: number;
  avgHoujuScore: number;
  ryukyokuRate: number;
  riichiTurn: number;
  riichiFirstRate: number;
  riichiChaseRate: number;
};

export type StyleKey = keyof ProcessedStyleStats;

export type StyleIntensity = "초중증" | "중증" | "중등도" | "경증" | "중립";
export type StyleLabel =
  | "후공 반격형"
  | "선공 회피형"
  | "멘젠 고득점형"
  | "후로 속공형"
  | "철벽 방어형"
  | "적극 참여형";

export const statConstants: Record<StyleKey, { mean: number; stdDev: number }> = {
  horyuRate: { mean: 0.229400816, stdDev: 0.01018886 },
  houjuRate: { mean: 0.11106952, stdDev: 0.009595166 },
  furoRate: { mean: 0.331713127, stdDev: 0.037372193 },
  riichiRate: { mean: 0.182824374, stdDev: 0.018407074 },
  damaRate: { mean: 0.128029668, stdDev: 0.029703506 },
  averageScore: { mean: 6454.787778, stdDev: 235.6563516 },
  avgHoryuTurn: { mean: 12.12006667, stdDev: 0.11553016 },
  avgHoujuScore: { mean: 5387.771667, stdDev: 141.1658779 },
  ryukyokuRate: { mean: 0.421591309, stdDev: 0.04623791 },
  riichiTurn: { mean: 9.298394589, stdDev: 0.193397116 },
  riichiFirstRate: { mean: 0.828159779, stdDev: 0.021060104 },
  riichiChaseRate: { mean: 0.171840221, stdDev: 0.021060104 }
};

export const xWeights: Record<StyleKey, number> = {
  horyuRate: -1.166081274,
  houjuRate: -0.202381694,
  furoRate: -1.258740534,
  riichiRate: -0.013917045,
  damaRate: 0.708071254,
  averageScore: 1.249496931,
  avgHoryuTurn: 0.73499073,
  avgHoujuScore: -0.231466343,
  ryukyokuRate: -0.585817047,
  riichiTurn: 0.831715773,
  riichiFirstRate: -0.612817769,
  riichiChaseRate: 0.546947012
};

export const yWeights: Record<StyleKey, number> = {
  horyuRate: 0.22551386,
  houjuRate: 0.889258806,
  furoRate: -0.453560713,
  riichiRate: 0.451204072,
  damaRate: -1.48123253,
  averageScore: -0.194681556,
  avgHoryuTurn: 0.531014201,
  avgHoujuScore: 0.202878547,
  ryukyokuRate: 0.81983416,
  riichiTurn: 0.644693651,
  riichiFirstRate: -2.393675857,
  riichiChaseRate: 0.75875334
};

export function processStats(stats: RawStyleStats): ProcessedStyleStats {
  return {
    horyuRate: Math.trunc((stats["和牌率"] ?? 0) * 100) / 100,
    houjuRate: Math.trunc((stats["放铳率"] ?? 0) * 100) / 100,
    furoRate: Math.trunc((stats["副露率"] ?? 0) * 100) / 100,
    riichiRate: Math.trunc((stats["立直率"] ?? 0) * 100) / 100,
    damaRate: Math.trunc((stats["默听率"] ?? 0) * 100) / 100,
    averageScore: Math.trunc(stats["平均打点"] ?? 0),
    avgHoryuTurn: Math.trunc(stats["和了巡数"] ?? 0),
    avgHoujuScore: Math.trunc(stats["平均铳点"] ?? 0),
    ryukyokuRate: Math.trunc((stats["流听率"] ?? 0) * 100) / 100,
    riichiTurn: Math.trunc(stats["立直巡目"] ?? 0),
    riichiFirstRate: Math.trunc((stats["先制率"] ?? 0) * 100) / 100,
    riichiChaseRate: Math.trunc((stats["追立率"] ?? 0) * 100) / 100
  };
}

export function standardize(value: number, mean: number, stdDev: number): number {
  return (value - mean) / stdDev;
}

export function getStandardizedStats(stats: ProcessedStyleStats): Record<StyleKey, number> {
  const result = {} as Record<StyleKey, number>;
  for (const key of Object.keys(stats) as StyleKey[]) {
    const constants = statConstants[key];
    result[key] = standardize(stats[key], constants.mean, constants.stdDev);
  }
  return result;
}

export function calculateCoordinates(stdStats: Record<StyleKey, number>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const key of Object.keys(stdStats) as StyleKey[]) {
    x += stdStats[key] * xWeights[key];
    y += stdStats[key] * yWeights[key];
  }
  return { x, y };
}

export function analyzeStyle(
  x: number,
  y: number
): { intensity: StyleIntensity; style: StyleLabel; distance: number; slope: number } {
  const distance = Math.sqrt(x ** 2 + y ** 2);
  const slope = x !== 0 ? y / x : Number.POSITIVE_INFINITY;

  const intensity: StyleIntensity =
    distance > 12.71 ? "초중증" :
    distance > 8.89 ? "중증" :
    distance > 3.2 ? "중등도" :
    distance > 1.47 ? "경증" :
    "중립";

  let style: StyleLabel;
  if (slope > 1) {
    style = x > 0 ? "후공 반격형" : "선공 회피형";
  } else if (slope > -0.35) {
    style = x > 0 ? "멘젠 고득점형" : "후로 속공형";
  } else {
    style = x > 0 ? "철벽 방어형" : "적극 참여형";
  }

  return { intensity, style, distance, slope };
}
