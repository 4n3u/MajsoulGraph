import { describe, expect, it } from "vitest";
import { analyzeSniperRecords } from "@shared/sniperAnalysis";

describe("sniper analysis", () => {
  it("sorts unsorted records and marks nearby target-one games containing target two as successful", () => {
    const result = analyzeSniperRecords(
      [
        { startTime: 200, players: [{ accountId: 2 }] },
        { startTime: 100, players: [{ accountId: 1 }] }
      ],
      [
        { startTime: 225, players: [] },
        { startTime: 75, players: [] }
      ],
      2,
      30
    );

    expect(result).toEqual({
      suspiciousCount: 2,
      successfulCount: 1,
      matches: [
        { startTime: 100, nearestDifferenceSeconds: 25, metTargetTwo: false },
        { startTime: 200, nearestDifferenceSeconds: 25, metTargetTwo: true }
      ]
    });
  });

  it("excludes records exactly at the threshold", () => {
    const result = analyzeSniperRecords(
      [{ startTime: 100, players: [] }],
      [{ startTime: 130, players: [] }],
      2,
      30
    );

    expect(result).toEqual({ suspiciousCount: 0, successfulCount: 0, matches: [] });
  });

  it("returns no matches when target two has no nearby games", () => {
    const result = analyzeSniperRecords(
      [{ startTime: 100, players: [{ accountId: 2 }] }],
      [{ startTime: 200, players: [] }],
      2,
      30
    );

    expect(result).toEqual({ suspiciousCount: 0, successfulCount: 0, matches: [] });
  });

  it("counts each nearby target-one game independently", () => {
    const result = analyzeSniperRecords(
      [
        { startTime: 102, players: [] },
        { startTime: 110, players: [{ accountId: 2 }] }
      ],
      [{ startTime: 100, players: [] }],
      2,
      30
    );

    expect(result).toMatchObject({ suspiciousCount: 2, successfulCount: 1 });
    expect(result.matches.map((match) => match.nearestDifferenceSeconds)).toEqual([2, 10]);
  });
});
