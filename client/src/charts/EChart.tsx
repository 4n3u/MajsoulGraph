import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import {
  CustomChart,
  LineChart,
  ScatterChart,
  type CustomSeriesOption,
  type LineSeriesOption,
  type ScatterSeriesOption
} from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  type DataZoomComponentOption,
  type GridComponentOption,
  type MarkLineComponentOption,
  type TooltipComponentOption
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ComposeOption, EChartsType } from "echarts/core";
import type { XAXisComponentOption, YAXisComponentOption } from "echarts";

echarts.use([
  CustomChart,
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer
]);

const replaceOption = { notMerge: true };

export type ChartOption = ComposeOption<
  | CustomSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | XAXisComponentOption
  | YAXisComponentOption
>;

type EChartProps = {
  option: ChartOption;
  className?: string;
  ariaLabel?: string;
};

export function EChart({ option, className, ariaLabel = "Chart" }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const container = containerRef.current;

    const handleResize = () => {
      chart.resize();
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            chart.resize();
          });

    resizeObserver?.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, replaceOption);
  }, [option]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
}
