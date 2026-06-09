import { describe, expect, it } from "vitest";
import { buildPointChartOptions } from "@client/charts/pointChartOptions";
import { buildStyleChartOptions } from "@client/charts/styleChartOptions";
import { buildPointTimeline } from "@shared/pointTimeline";

describe("point chart options", () => {
  it("builds a source-aligned point graph with room fills and rank guide lines", () => {
    const timeline = buildPointTimeline({
      recordsDescending: [
        {
          modeId: 12,
          startTime: 3000,
          endTime: 4000,
          players: [{ accountId: 1, score: 25000, level: 10401, gradingScore: 15 }]
        },
        {
          modeId: 16,
          startTime: 1000,
          endTime: 2000,
          players: [{ accountId: 1, score: 45000, level: 10301, gradingScore: 45 }]
        }
      ],
      targetAccountId: 1,
      initialLevel: 10301,
      historyLevel: 10203
    });
    const options = buildPointChartOptions(timeline);

    expect(options.dataZoom).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "inside" }), expect.objectContaining({ type: "slider" })])
    );
    const series = Array.isArray(options.series) ? options.series : [options.series];

    expect(options.yAxis).toMatchObject({ min: 0, interval: 1000 });
    expect(series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "대국 구간", type: "custom" }),
        expect.objectContaining({ name: "원점", type: "line" }),
        expect.objectContaining({ name: "승단선", type: "line" }),
        expect.objectContaining({
          name: "포인트",
          type: "line",
          data: expect.arrayContaining([
            expect.objectContaining({ value: [0, 600] }),
            expect.objectContaining({ value: [1, 645] }),
            expect.objectContaining({ value: [2, 1415] })
          ]),
          markLine: expect.objectContaining({
            data: expect.arrayContaining([
              [
                expect.objectContaining({ name: "호1", coord: [1, 0] }),
                expect.objectContaining({ coord: [1, 2800] })
              ]
            ])
          })
        })
      ])
    );
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

  it("includes legacy Korean stat guides and style region labels", () => {
    const options = buildStyleChartOptions({ x: 0, y: 0, nickname: "Center" });
    const serialized = JSON.stringify(options);

    expect(serialized).toContain("화료율");
    expect(serialized).toContain("평균 화료 타점");
    expect(serialized).toContain("리치 추격률");
    expect(serialized).toContain("후공 반격형");
    expect(options.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "scatter",
          data: expect.arrayContaining([
            expect.objectContaining({ name: "화료율", value: [-20, 3.9] }),
            expect.objectContaining({ name: "리치 추격률", value: [14.4, 20] })
          ])
        }),
        expect.objectContaining({
          type: "scatter",
          data: expect.arrayContaining([
            expect.objectContaining({ name: "후공 반격형", value: [7, 22] }),
            expect.objectContaining({ name: "철벽 방어형", value: [7, -25] })
          ])
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
        }),
        expect.objectContaining({
          name: "Axes",
          data: [
            [-30, 0],
            [30, 0]
          ],
          markLine: expect.objectContaining({
            data: expect.arrayContaining([
              [
                { coord: [0, -30] },
                { coord: [0, 30] }
              ]
            ])
          })
        })
      ])
    );
  });
});
