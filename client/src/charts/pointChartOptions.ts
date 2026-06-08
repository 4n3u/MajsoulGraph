import type { ChartOption } from "./EChart";

export type PointChartDatum = {
  index: number;
  point: number;
  level?: number;
  rank?: number;
  mode?: string;
  startTime?: number;
};

export function buildPointChartOptions(points: PointChartDatum[]): ChartOption {
  return {
    animation: false,
    grid: {
      left: 48,
      right: 24,
      top: 24,
      bottom: 72,
      containLabel: true
    },
    tooltip: {
      trigger: "axis"
    },
    xAxis: {
      type: "value",
      name: "Game",
      minInterval: 1
    },
    yAxis: {
      type: "value",
      name: "Points",
      scale: true
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
        name: "Points",
        type: "line",
        showSymbol: true,
        symbolSize: 7,
        smooth: false,
        data: points.map((point) => [point.index, point.point])
      }
    ]
  };
}
