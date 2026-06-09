import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartOption } from "@client/charts/EChart";

const echartsMock = vi.hoisted(() => ({
  dispose: vi.fn(),
  init: vi.fn(),
  resize: vi.fn(),
  setOption: vi.fn(),
  use: vi.fn()
}));

vi.mock("echarts/core", () => ({
  init: echartsMock.init,
  use: echartsMock.use
}));

vi.mock("echarts/charts", () => ({
  CustomChart: {},
  LineChart: {},
  ScatterChart: {}
}));

vi.mock("echarts/components", () => ({
  DataZoomComponent: {},
  GridComponent: {},
  MarkLineComponent: {},
  TooltipComponent: {}
}));

vi.mock("echarts/renderers", () => ({
  CanvasRenderer: {}
}));

import { EChart } from "@client/charts/EChart";

const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];

  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();

  constructor() {
    TestResizeObserver.instances.push(this);
  }
}

async function waitForChartInit() {
  for (let attempt = 0; attempt < 10 && echartsMock.init.mock.calls.length === 0; attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe("EChart", () => {
  beforeEach(() => {
    echartsMock.dispose.mockReset();
    echartsMock.init.mockReset();
    echartsMock.resize.mockReset();
    echartsMock.setOption.mockReset();
    TestResizeObserver.instances = [];
    globalThis.ResizeObserver = TestResizeObserver;
    echartsMock.init.mockReturnValue({
      dispose: echartsMock.dispose,
      resize: echartsMock.resize,
      setOption: echartsMock.setOption
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces chart options on update and disconnects container resize observer on unmount", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const pointOption: ChartOption = { series: [{ type: "line", data: [[0, 600]] }] };
    const styleOption: ChartOption = { series: [{ type: "scatter", data: [[12, -8]] }] };

    await act(async () => {
      root.render(<EChart option={pointOption} ariaLabel="Points" />);
    });
    await waitForChartInit();

    expect(echartsMock.init).toHaveBeenCalledOnce();
    expect(echartsMock.use).toHaveBeenCalledOnce();
    expect(TestResizeObserver.instances[0]?.observe).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    expect(echartsMock.setOption).toHaveBeenLastCalledWith(pointOption, expect.objectContaining({ notMerge: true }));

    await act(async () => {
      root.render(<EChart option={styleOption} ariaLabel="Style" />);
    });

    expect(echartsMock.setOption).toHaveBeenLastCalledWith(styleOption, expect.objectContaining({ notMerge: true }));

    await act(async () => {
      root.unmount();
    });

    expect(TestResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce();
    expect(echartsMock.dispose).toHaveBeenCalledOnce();
  });
});
