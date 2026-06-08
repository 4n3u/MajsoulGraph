import { describe, expect, it } from "vitest";
import {
  analyzeStyle,
  calculateCoordinates,
  getStandardizedStats,
  processStats,
  xWeights,
  yWeights
} from "@shared/styleAnalysis";

describe("style analysis", () => {
  it("processes raw stats with the same truncation rules as the Python version", () => {
    const processed = processStats({ "和牌率": 0.229400816, "平均打点": 6454.787778, "和了巡数": 12.12006667 });
    expect(processed.horyuRate).toBe(0.22);
    expect(processed.averageScore).toBe(6454);
    expect(processed.avgHoryuTurn).toBe(12);
  });

  it("classifies zero standardized stats as neutral", () => {
    const std = getStandardizedStats(processStats({}));
    for (const key of Object.keys(std) as Array<keyof typeof std>) {
      std[key] = 0;
    }
    const point = calculateCoordinates(std);
    const result = analyzeStyle(point.x, point.y);

    expect(point.x).toBeCloseTo(0, 4);
    expect(point.y).toBeCloseTo(0, 4);
    expect(result.intensity).toBe("중립");
  });

  it("classifies high positive X and Y as counterattack style", () => {
    const result = analyzeStyle(15, 20);
    expect(result.intensity).toBe("초중증");
    expect(result.style).toBe("후공 반격형");
  });

  it("exposes legacy style weights", () => {
    expect(xWeights.horyuRate).toBeCloseTo(-1.166081274);
    expect(yWeights.riichiFirstRate).toBeCloseTo(-2.393675857);
  });
});
