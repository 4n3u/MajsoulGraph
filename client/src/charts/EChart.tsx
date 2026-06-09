import { useEffect, useRef } from "react";
import type { CustomSeriesOption, LineSeriesOption, ScatterSeriesOption } from "echarts/charts";
import {
  type DataZoomComponentOption,
  type GridComponentOption,
  type MarkLineComponentOption,
  type TooltipComponentOption
} from "echarts/components";
import type { ComposeOption, EChartsType } from "echarts/core";
import type { XAXisComponentOption, YAXisComponentOption } from "echarts";

const replaceOption = { notMerge: true };
let echartsLoader: Promise<typeof import("echarts/core")> | null = null;

function loadEcharts(): Promise<typeof import("echarts/core")> {
  echartsLoader ??= Promise.all([
    import("echarts/core"),
    import("echarts/charts"),
    import("echarts/components"),
    import("echarts/renderers")
  ]).then(([echarts, charts, components, renderers]) => {
    echarts.use([
      charts.CustomChart,
      charts.LineChart,
      charts.ScatterChart,
      components.GridComponent,
      components.TooltipComponent,
      components.DataZoomComponent,
      components.MarkLineComponent,
      renderers.CanvasRenderer
    ]);

    return echarts;
  });

  return echartsLoader;
}

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
  const optionRef = useRef(option);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    void loadEcharts().then((echarts) => {
      if (disposed || !containerRef.current) {
        return;
      }

      const chart = echarts.init(containerRef.current);
      chartRef.current = chart;
      chart.setOption(optionRef.current, replaceOption);
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

      cleanup = () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", handleResize);
        chart.dispose();
        chartRef.current = null;
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    optionRef.current = option;
    chartRef.current?.setOption(option, replaceOption);
  }, [option]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
}
