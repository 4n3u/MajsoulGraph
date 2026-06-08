import { describe, expect, it } from "vitest";
import { buildPointChartOptions } from "@client/charts/pointChartOptions";
import { buildStyleChartOptions } from "@client/charts/styleChartOptions";

describe("point chart options", () => {
  it("builds a zoomable line series from point timeline data", () => {
    const options = buildPointChartOptions([
      { index: 0, point: 600 },
      { index: 1, point: 650 }
    ]);

    expect(options.dataZoom).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "inside" }), expect.objectContaining({ type: "slider" })])
    );
    const series = Array.isArray(options.series) ? options.series : [options.series];

    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      type: "line",
      data: [
        [0, 600],
        [1, 650]
      ]
    });
  });
});

describe("style chart options", () => {
  it("includes the user nickname and scatter point", () => {
    const options = buildStyleChartOptions({ x: 12, y: -8, nickname: "PlayerOne" });

    expect(JSON.stringify(options)).toContain("PlayerOne");
    expect(options.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "scatter",
          data: expect.arrayContaining([expect.objectContaining({ name: "PlayerOne", value: [12, -8] })])
        })
      ])
    );
  });

  it("pins style graph bounds and guide lines", () => {
    const options = buildStyleChartOptions({ x: 0, y: 0, nickname: "Center" });

    expect(options.xAxis).toMatchObject({ min: -30, max: 30 });
    expect(options.yAxis).toMatchObject({ min: -30, max: 30 });
    expect(options.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          markLine: expect.objectContaining({
            lineStyle: expect.objectContaining({ color: expect.stringMatching(/green/i), type: "dashed" }),
            data: expect.arrayContaining([
              [
                { coord: [-30, -30] },
                { coord: [30, 30] }
              ],
              [
                { coord: [-30, 10.5] },
                { coord: [30, -10.5] }
              ]
            ])
          })
        })
      ])
    );
  });
});
