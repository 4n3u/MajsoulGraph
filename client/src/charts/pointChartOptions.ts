import type { TimelinePoint, TimelineResult } from "@shared/pointTimeline";
import type { ChartOption } from "./EChart";

type SegmentDatum = {
  itemStyle: {
    color: string;
    opacity: number;
  };
  value: [number, number, number, number, number];
};

type TooltipItem = {
  data?: unknown;
  seriesName?: string;
};

type TooltipPointDatum = TimelinePoint & {
  value: [number, number];
};

const modeColors: Record<number, string> = {
  8: "#d9a800",
  9: "#d9a800",
  11: "#3f9f46",
  12: "#3f9f46",
  15: "#d94b4b",
  16: "#d94b4b",
  21: "#d9a800",
  22: "#d9a800",
  23: "#3f9f46",
  24: "#3f9f46",
  25: "#d94b4b",
  26: "#d94b4b"
};

const modeLabels: Record<number, string> = {
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

function playedPoints(points: TimelinePoint[]): TimelinePoint[] {
  return points.filter((point) => point.index > 0);
}

function buildSegmentData(points: TimelinePoint[]): SegmentDatum[] {
  return playedPoints(points).map((point) => ({
    value: [point.index - 1, point.pointBefore, point.index, point.point, point.modeId],
    itemStyle: {
      color: modeColors[point.modeId] ?? "#94a3b8",
      opacity: 0.08
    }
  }));
}

function buildStepLineData(points: TimelinePoint[], key: "basePoint" | "promotionPoint"): number[][] {
  const data: number[][] = [];
  for (const point of playedPoints(points)) {
    data.push([point.index - 1, point[key]]);
    data.push([point.index, point[key]]);
  }
  return data;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp * 1000));
}

function isTooltipPointDatum(data: unknown): data is TooltipPointDatum {
  if (typeof data !== "object" || data === null) return false;
  const point = data as Partial<TooltipPointDatum>;
  return (
    Array.isArray(point.value) &&
    point.value.length === 2 &&
    typeof point.index === "number" &&
    typeof point.point === "number" &&
    typeof point.level === "number" &&
    typeof point.rank === "number" &&
    typeof point.modeId === "number" &&
    typeof point.startTime === "number"
  );
}

function tooltipFormatter(params: unknown): string {
  const items = (Array.isArray(params) ? params : [params]) as TooltipItem[];
  const pointItem =
    items.find((item) => item.seriesName === "포인트" && isTooltipPointDatum(item.data)) ??
    items.find((item) => isTooltipPointDatum(item.data));

  if (!isTooltipPointDatum(pointItem?.data)) return "";

  const point = pointItem.data;
  const modeLabel = modeLabels[point.modeId] ?? String(point.modeId);
  return [
    `${point.index}전`,
    `포인트: ${point.point}`,
    `등급: ${point.level}`,
    `순위: ${point.rank}위`,
    `탁: ${modeLabel}`,
    `날짜: ${formatDate(point.startTime)}`
  ].join("<br />");
}

export function buildPointChartOptions(timeline: TimelineResult): ChartOption {
  const points = timeline.points;
  const yMax = Math.max(timeline.summary.maxPointLimit, timeline.summary.highPoint, 1000) + 100;

  return {
    animation: false,
    grid: {
      left: 52,
      right: 24,
      top: 24,
      bottom: 72,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      formatter: tooltipFormatter
    },
    xAxis: {
      type: "value",
      name: "대국 수",
      min: 0,
      max: Math.max(timeline.summary.gameCount, 1),
      minInterval: 1
    },
    yAxis: {
      type: "value",
      name: "포인트",
      min: 0,
      max: yMax,
      interval: 1000
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none"
      },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 28,
        bottom: 24,
        filterMode: "none"
      }
    ],
    series: [
      {
        name: "대국 구간",
        type: "custom",
        silent: true,
        data: buildSegmentData(points),
        renderItem(_params, api) {
          const startIndex = Number(api.value(0));
          const startPoint = Number(api.value(1));
          const endIndex = Number(api.value(2));
          const endPoint = Number(api.value(3));
          const start = api.coord([startIndex, startPoint]);
          const end = api.coord([endIndex, endPoint]);
          const endBase = api.coord([endIndex, 0]);
          const startBase = api.coord([startIndex, 0]);

          return {
            type: "polygon",
            shape: {
              points: [start, end, endBase, startBase]
            },
            style: api.style()
          };
        }
      },
      {
        name: "원점",
        type: "line",
        symbol: "none",
        silent: true,
        lineStyle: {
          color: "#111827",
          width: 1.2
        },
        data: buildStepLineData(points, "basePoint")
      },
      {
        name: "승단선",
        type: "line",
        symbol: "none",
        silent: true,
        lineStyle: {
          color: "#111827",
          width: 1.2
        },
        data: buildStepLineData(points, "promotionPoint")
      },
      {
        name: "포인트",
        type: "line",
        showSymbol: false,
        smooth: false,
        lineStyle: {
          color: "#111827",
          width: 1.8
        },
        data: points.map((point) => ({
          ...point,
          value: [point.index, point.point]
        })),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: "#111827",
            width: 1
          },
          label: {
            formatter: "{b}",
            position: "end"
          },
          data: timeline.rankTransitions.map((transition) => [
            {
              name: transition.toLevelLabel,
              coord: [transition.index, 0]
            },
            {
              coord: [transition.index, transition.ceilingPoint]
            }
          ])
        }
      }
    ]
  };
}
