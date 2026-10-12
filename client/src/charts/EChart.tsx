import { useEffect, useRef } from "react";
import type {
  CustomSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  ScatterSeriesOption
} from "echarts/charts";
import {
  type DataZoomComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
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
      charts.PieChart,
      components.GridComponent,
      components.TooltipComponent,
      components.DataZoomComponent,
      components.MarkLineComponent,
      components.LegendComponent,
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
  | PieSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | LegendComponentOption
  | XAXisComponentOption
  | YAXisComponentOption
>;

export type { EChartsType } from "echarts/core";

type EChartProps = {
  option: ChartOption;
  className?: string;
  ariaLabel?: string;
  onEvents?: Record<string, (params: unknown) => void>;
  onChartReady?: (chart: EChartsType) => void;
};

export function EChart({ option, className, ariaLabel = "Chart", onEvents, onChartReady }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const optionRef = useRef(option);
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const onChartReadyRef = useRef(onChartReady);
  onChartReadyRef.current = onChartReady;
  const registeredEventsRef = useRef<string[]>([]);

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
      onChartReadyRef.current?.(chart);

      if (onEventsRef.current) {
        for (const [event, handler] of Object.entries(onEventsRef.current)) {
          chart.on(event, handler);
          registeredEventsRef.current.push(event);
        }
      }

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
        registeredEventsRef.current = [];
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const event of registeredEventsRef.current) {
      chart.off(event);
    }
    registeredEventsRef.current = [];

    if (onEvents) {
      for (const [event, handler] of Object.entries(onEvents)) {
        chart.on(event, handler);
        registeredEventsRef.current.push(event);
      }
    }
  }, [onEvents]);

  useEffect(() => {
    optionRef.current = option;
    chartRef.current?.setOption(option, replaceOption);
  }, [option]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
}
