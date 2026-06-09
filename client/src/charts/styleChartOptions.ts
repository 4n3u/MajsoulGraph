import type { ChartOption } from "./EChart";

type StyleChartInput = {
  x: number;
  y: number;
  nickname: string;
};

const guidePoints = [
  { name: "화료율", value: [-20, 3.9] },
  { name: "방총율", value: [-4.6, 20] },
  { name: "후로율", value: [-20, -7.2] },
  { name: "리치율", value: [-0.6, 20] },
  { name: "다마율", value: [9.6, -20] },
  { name: "평균 화료 타점", value: [20, -3.1] },
  { name: "평균 화료순", value: [20, 14.4] },
  { name: "평균 방총 타점", value: [-20, 17.5] },
  { name: "유국 텐파이율", value: [-14.3, 20] },
  { name: "리치순", value: [20, 15.5] },
  { name: "리치 선제율", value: [-5.1, -20] },
  { name: "리치 추격률", value: [14.4, 20] }
] as const;

const styleRegionLabels = [
  { name: "적극 참여형", value: [-15, 22] },
  { name: "후공 반격형", value: [7, 22] },
  { name: "후로 속공형", value: [-25, -4] },
  { name: "멘젠 고득점형", value: [17, 1] },
  { name: "선공 회피형", value: [-15, -25] },
  { name: "철벽 방어형", value: [7, -25] }
] as const;

export function buildStyleChartOptions(input: StyleChartInput): ChartOption {
  return {
    animation: false,
    grid: {
      left: 8,
      right: 16,
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
      axisLabel: {
        margin: 6
      },
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
        name: "Axes",
        type: "line",
        silent: true,
        symbol: "none",
        lineStyle: {
          color: "#111827",
          width: 1
        },
        data: [
          [-30, 0],
          [30, 0]
        ],
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: "#111827",
            width: 1
          },
          data: [
            [
              { coord: [0, -30] },
              { coord: [0, 30] }
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
      },
      {
        name: "Style regions",
        type: "scatter",
        silent: true,
        symbolSize: 0,
        label: {
          show: true,
          formatter: "{b}",
          color: "#475569",
          fontWeight: 600,
          position: "inside"
        },
        data: styleRegionLabels.map((label) => ({ name: label.name, value: [...label.value] }))
      }
    ]
  };
}
