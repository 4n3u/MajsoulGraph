import { describe, expect, it } from "vitest";
import {
  buildRankPieChartOptions,
  calculateRankDistribution,
  extractDataZoomRange
} from "@client/charts/rankPieChartOptions";
import type { TimelinePoint } from "@shared/pointTimeline";

function createMockPoint(index: number, rank: number): TimelinePoint {
  return {
    index,
    pointBefore: 600,
    point: 650,
    basePoint: 600,
    promotionPoint: 1200,
    level: 10301,
    rank,
    modeId: 16,
    startTime: 1000 * index,
    endTime: 1000 * index + 500
  };
}

describe("rank pie chart options and distribution calculation", () => {
  describe("calculateRankDistribution", () => {
    it("calculates rank counts and average rank for the full timeline", () => {
      const points: TimelinePoint[] = [
        createMockPoint(0, 0), // 0th point (baseline)
        createMockPoint(1, 1),
        createMockPoint(2, 2),
        createMockPoint(3, 1),
        createMockPoint(4, 4)
      ];

      const result = calculateRankDistribution(points, 1, 4);

      expect(result.startIndex).toBe(1);
      expect(result.endIndex).toBe(4);
      expect(result.totalGames).toBe(4);
      expect(result.rankCounts).toEqual({ 1: 2, 2: 1, 3: 0, 4: 1 });
      // (1*2 + 2*1 + 3*0 + 4*1) / 4 = 8 / 4 = 2.0
      expect(result.averageRank).toBe(2);
    });

    it("filters correctly by selected index range", () => {
      const points: TimelinePoint[] = [
        createMockPoint(0, 0),
        createMockPoint(1, 4),
        createMockPoint(2, 3),
        createMockPoint(3, 1),
        createMockPoint(4, 2),
        createMockPoint(5, 1)
      ];

      // range: 2 to 4 (games 2, 3, 4)
      const result = calculateRankDistribution(points, 2, 4);

      expect(result.startIndex).toBe(2);
      expect(result.endIndex).toBe(4);
      expect(result.totalGames).toBe(3);
      expect(result.rankCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 0 });
      // (3 + 1 + 2) / 3 = 2.0
      expect(result.averageRank).toBe(2);
    });

    it("returns zero counts and average rank for empty range", () => {
      const points: TimelinePoint[] = [createMockPoint(0, 0), createMockPoint(1, 1)];
      const result = calculateRankDistribution(points, 5, 10);

      expect(result.totalGames).toBe(0);
      expect(result.averageRank).toBe(0);
      expect(result.rankCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 });
    });
  });

  describe("extractDataZoomRange", () => {
    it("extracts range from startValue and endValue", () => {
      const event = { startValue: 3.2, endValue: 8.7 };
      const range = extractDataZoomRange(event, 20);

      expect(range.startIndex).toBe(3);
      expect(range.endIndex).toBe(9);
    });

    it("extracts range from event.batch", () => {
      const event = {
        batch: [{ startValue: 1.1, endValue: 5.4 }]
      };
      const range = extractDataZoomRange(event, 20);

      expect(range.startIndex).toBe(1);
      expect(range.endIndex).toBe(5);
    });

    it("extracts range from percentage start and end", () => {
      // 50% to 100% of 100 games -> games 50 to 100
      const event = { start: 50, end: 100 };
      const range = extractDataZoomRange(event, 100);

      expect(range.startIndex).toBe(50);
      expect(range.endIndex).toBe(100);
    });

    it("clamps boundaries to valid indices", () => {
      const event = { startValue: -5, endValue: 150 };
      const range = extractDataZoomRange(event, 50);

      expect(range.startIndex).toBe(1);
      expect(range.endIndex).toBe(50);
    });

    it("handles totalGames <= 0 gracefully", () => {
      const range = extractDataZoomRange({ startValue: 1, endValue: 5 }, 0);
      expect(range).toEqual({ startIndex: 1, endIndex: 1 });
    });
  });

  describe("buildRankPieChartOptions", () => {
    it("includes 4th rank in four-player mode", () => {
      const distribution = {
        startIndex: 1,
        endIndex: 10,
        totalGames: 10,
        rankCounts: { 1: 4, 2: 3, 3: 2, 4: 1 },
        averageRank: 2.0
      };

      const options = buildRankPieChartOptions(distribution, false);
      const series = Array.isArray(options.series) ? options.series[0] : options.series;

      expect(series).toBeDefined();
      expect(series?.type).toBe("pie");
      const data = series?.data as Array<{ name: string; value: number }>;
      expect(data).toHaveLength(4);
      expect(data.map((item) => item.name)).toEqual(["1위", "2위", "3위", "4위"]);
      expect(data.map((item) => item.value)).toEqual([4, 3, 2, 1]);
    });

    it("excludes 4th rank in three-player mode (Sanma)", () => {
      const distribution = {
        startIndex: 1,
        endIndex: 6,
        totalGames: 6,
        rankCounts: { 1: 3, 2: 2, 3: 1, 4: 0 },
        averageRank: 1.667
      };

      const options = buildRankPieChartOptions(distribution, true);
      const series = Array.isArray(options.series) ? options.series[0] : options.series;

      expect(series).toBeDefined();
      const data = series?.data as Array<{ name: string; value: number }>;
      expect(data).toHaveLength(3);
      expect(data.map((item) => item.name)).toEqual(["1위", "2위", "3위"]);
    });

    it("formats pie label with percentage only", () => {
      const distribution = {
        startIndex: 1,
        endIndex: 10,
        totalGames: 10,
        rankCounts: { 1: 4, 2: 3, 3: 2, 4: 1 },
        averageRank: 2.0
      };

      const options = buildRankPieChartOptions(distribution, false);
      const series = Array.isArray(options.series) ? options.series[0] : options.series;
      const label = series?.label as { formatter?: (params: unknown) => string };

      expect(label.formatter).toBeDefined();
      const formatted = label.formatter!({ name: "1위", value: 4, percent: 40 });
      expect(formatted).toBe("1위: 40.0%");
      expect(formatted).not.toContain("판");
    });

    it("omits bottom legend index component", () => {
      const distribution = {
        startIndex: 1,
        endIndex: 10,
        totalGames: 10,
        rankCounts: { 1: 4, 2: 3, 3: 2, 4: 1 },
        averageRank: 2.0
      };

      const options = buildRankPieChartOptions(distribution, false);
      expect(options.legend).toBeUndefined();
    });
  });
});
