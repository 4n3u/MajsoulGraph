import type { ChartOption } from "./EChart";

type StyleChartInput = {
  x: number;
  y: number;
  nickname: string;
};

const guidePoints = [
  { name: "Balanced", value: [0, 0] },
  { name: "Attack", value: [-18, 16] },
  { name: "Defense", value: [18, -16] },
  { name: "Pressure", value: [-16, -18] },
  { name: "Counter", value: [16, 18] }
] as const;

export function buildStyleChartOptions(input: StyleChartInput): ChartOption {
  return {
    animation: false,
    grid: {
      left: 48,
      right: 28,
      top: 28,
      bottom: 44,
      containLabel: true
    },
    tooltip: {
      trigger: "item"
    },
    xAxis: {
      type: "value",
      min: -30,
      max: 30,
      splitLine: {
        lineStyle: {
          color: "#e5e7eb"
        }
      }
    },
    yAxis: {
      type: "value",
      min: -30,
      max: 30,
      splitLine: {
        lineStyle: {
          color: "#e5e7eb"
        }
      }
    },
    series: [
      {
        name: "Guide",
        type: "scatter",
        symbolSize: 8,
        itemStyle: {
          color: "#94a3b8"
        },
        label: {
          show: true,
          formatter: "{b}",
          position: "top"
        },
        data: guidePoints.map((point) => ({ name: point.name, value: [...point.value] })),
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: "green",
            type: "dashed",
            width: 1.5
          },
          data: [
            [
              { coord: [-30, -30] },
              { coord: [30, 30] }
            ],
            [
              { coord: [-30, 10.5] },
              { coord: [30, -10.5] }
            ]
          ]
        }
      },
      {
        name: "User",
        type: "scatter",
        symbolSize: 14,
        itemStyle: {
          color: "#ef4444"
        },
        label: {
          show: true,
          formatter: "{b}",
          position: "right"
        },
        data: [{ name: input.nickname, value: [input.x, input.y] }]
      }
    ]
  };
}
