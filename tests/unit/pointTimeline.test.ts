import { describe, expect, it } from "vitest";
import { buildPointTimeline, getRank, levelDan, levelPtBase } from "@shared/pointTimeline";

describe("rank labels and point bases", () => {
  it("ports rank label and point base behavior", () => {
    expect(levelDan(10301)).toBe("걸1");
    expect(levelPtBase(10301)).toBe(600);
    expect(levelPtBase(10701)).toBe(5000);
    expect(() => levelPtBase(10203)).toThrow("Unsupported point base");
  });
});

describe("point timeline", () => {
  it("calculates ranks and point movement in chronological order", () => {
    const games = [
      {
        modeId: 16,
        startTime: 1000,
        endTime: 2000,
        players: [
          { accountId: 1, score: 45000, level: 10301, gradingScore: 45 },
          { accountId: 2, score: 30000, level: 10301, gradingScore: 15 },
          { accountId: 3, score: 20000, level: 10301, gradingScore: -15 },
          { accountId: 4, score: 5000, level: 10301, gradingScore: -45 }
        ]
      },
      {
        modeId: 16,
        startTime: 3000,
        endTime: 4000,
        players: [
          { accountId: 2, score: 45000, level: 10301, gradingScore: 45 },
          { accountId: 1, score: 25000, level: 10301, gradingScore: 5 },
          { accountId: 3, score: 20000, level: 10301, gradingScore: -15 },
          { accountId: 4, score: 10000, level: 10301, gradingScore: -35 }
        ]
      }
    ];

    expect(getRank(games[0]!.players, 1)).toBe(1);
    expect(() => getRank([{ accountId: 2, score: 30000, level: 10301, gradingScore: 15 }], 1)).toThrow(
      "Target account not found"
    );

    const result = buildPointTimeline({
      recordsDescending: [...games].reverse(),
      targetAccountId: 1,
      initialLevel: 10301,
      historyLevel: 10203
    });

    expect(result.points.map((point) => point.point)).toEqual([600, 645, 650]);
    expect(result.summary.gameCount).toBe(2);
    expect(result.summary.highPoint).toBe(650);
  });
});
