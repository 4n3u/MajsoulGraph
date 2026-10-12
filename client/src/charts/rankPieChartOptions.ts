import type { TimelinePoint } from "@shared/pointTimeline";
import type { ChartOption } from "./EChart";

export type RankDistribution = {
  startIndex: number;
  endIndex: number;
  totalGames: number;
  rankCounts: Record<1 | 2 | 3 | 4, number>;
  averageRank: number;
};

export function calculateRankDistribution(
  points: TimelinePoint[],
  startIndex: number,
  endIndex: number
): RankDistribution {
  const rankCounts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let rankSum = 0;
  let totalGames = 0;

  for (const point of points) {
    if (point.index <= 0) continue;
    if (point.index >= startIndex && point.index <= endIndex) {
      if (point.rank === 1 || point.rank === 2 || point.rank === 3 || point.rank === 4) {
        rankCounts[point.rank] += 1;
        rankSum += point.rank;
        totalGames += 1;
      }
    }
  }

  return {
    startIndex,
    endIndex,
    totalGames,
    rankCounts,
    averageRank: totalGames > 0 ? rankSum / totalGames : 0
  };
}

export function extractDataZoomRange(
  event: unknown,
  totalGames: number
): { startIndex: number; endIndex: number } {
  if (totalGames <= 0) {
    return { startIndex: 1, endIndex: 1 };
  }

  const raw = event as {
    start?: number;
    end?: number;
    startValue?: number;
    endValue?: number;
    batch?: Array<{
      start?: number;
      end?: number;
      startValue?: number;
      endValue?: number;
    }>;
  };

  const payload = raw?.batch?.[0] ?? raw;
  let startValue = payload?.startValue;
  let endValue = payload?.endValue;

  if (typeof startValue !== "number" || typeof endValue !== "number") {
    const startPercent = typeof payload?.start === "number" ? Math.max(0, Math.min(100, payload.start)) : 0;
    const endPercent = typeof payload?.end === "number" ? Math.max(0, Math.min(100, payload.end)) : 100;

    startValue = (startPercent / 100) * totalGames;
    endValue = (endPercent / 100) * totalGames;
  }

  const lower = Math.min(startValue, endValue);
  const upper = Math.max(startValue, endValue);

  let startIndex = Math.max(1, Math.round(lower));
  let endIndex = Math.min(totalGames, Math.round(upper));

  if (startIndex > endIndex) {
    if (startIndex > totalGames) {
      startIndex = totalGames;
      endIndex = totalGames;
    } else {
      endIndex = startIndex;
    }
  }

  return { startIndex, endIndex };
}

export function buildRankPieChartOptions(
  distribution: RankDistribution,
  isSanma = false
): ChartOption {
  const data: Array<{ name: string; value: number; itemStyle: { color: string } }> = [
    { name: "1위", value: distribution.rankCounts[1], itemStyle: { color: "#2563eb" } },
    { name: "2위", value: distribution.rankCounts[2], itemStyle: { color: "#10b981" } },
    { name: "3위", value: distribution.rankCounts[3], itemStyle: { color: "#f59e0b" } }
  ];

  if (!isSanma) {
    data.push({ name: "4위", value: distribution.rankCounts[4], itemStyle: { color: "#ef4444" } });
  }

  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}판 ({d}%)"
    },
    series: [
      {
        name: "순위 분포",
        type: "pie",
        radius: ["36%", "68%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#ffffff",
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const item = params as { name: string; value: number; percent?: number };
            const percent = item.percent !== undefined ? `${item.percent.toFixed(1)}%` : "";
            return `${item.name}: ${percent}`;
          },
          fontSize: 12
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: "bold"
          }
        },
        data
      }
    ]
  };
}
