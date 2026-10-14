import { describe, expect, it } from "vitest";
import {
  calculateRankupConditions,
  DAN_OPTIONS,
  getEligibleStages,
  STAGES
} from "../../shared/src/rankup";

describe("rankup calculation", () => {
  it("determines eligible stages according to dan tier", () => {
    expect(getEligibleStages(0)).toEqual(["동탁"]);
    expect(getEligibleStages(1)).toEqual(["은탁", "동탁"]);
    expect(getEligibleStages(2)).toEqual(["금탁", "은탁"]);
    expect(getEligibleStages(3)).toEqual(["옥탁", "금탁"]);
    expect(getEligibleStages(4)).toEqual(["왕좌탁", "옥탁"]);
  });

  it("calculates rankup conditions for master1 (작호1) with 50 needed points in 4-player mahjong", () => {
    const result = calculateRankupConditions({
      mahjongType: "four",
      danId: "master1",
      currentPoints: 2750
    });

    expect(result.dan.name).toBe("작호1");
    expect(result.maxPoints).toBe(2800);
    expect(result.currentPoints).toBe(2750);
    expect(result.neededPoints).toBe(50);
    expect(result.conditions).toHaveLength(4);

    const jadeSouth = result.conditions.find(
      (c) => c.stage === "옥탁" && c.gameMode === "사마 반장"
    );
    expect(jadeSouth).toBeDefined();
    expect(jadeSouth?.firstPlace).toEqual({ type: "unconditional" });
    expect(jadeSouth?.secondPlace).toEqual({ type: "score", requiredScore: 14100 });

    const jadeEast = result.conditions.find(
      (c) => c.stage === "옥탁" && c.gameMode === "사마 동풍"
    );
    expect(jadeEast).toBeDefined();
    expect(jadeEast?.firstPlace).toEqual({ type: "unconditional" });
    expect(jadeEast?.secondPlace).toEqual({ type: "score", requiredScore: 39100 });

    const goldSouth = result.conditions.find(
      (c) => c.stage === "금탁" && c.gameMode === "사마 반장"
    );
    expect(goldSouth?.firstPlace).toEqual({ type: "unconditional" });
    expect(goldSouth?.secondPlace).toEqual({ type: "score", requiredScore: 29100 });
  });

  it("marks 2nd place as impossible when required score exceeds 70,000", () => {
    const result = calculateRankupConditions({
      mahjongType: "four",
      danId: "master1",
      currentPoints: 2600
    });

    const jadeSouth = result.conditions.find(
      (c) => c.stage === "옥탁" && c.gameMode === "사마 반장"
    );
    expect(jadeSouth?.secondPlace).toEqual({ type: "impossible" });
    expect(jadeSouth?.firstPlace).toEqual({ type: "score", requiredScore: 99100 });
  });

  it("handles 3-player mahjong starting at 35,000 score with zero 2nd place rank bonus", () => {
    const result = calculateRankupConditions({
      mahjongType: "three",
      danId: "master1",
      currentPoints: 2750
    });

    expect(result.neededPoints).toBe(50);

    const jadeSouth = result.conditions.find(
      (c) => c.stage === "옥탁" && c.gameMode === "삼마 반장"
    );
    expect(jadeSouth?.firstPlace).toEqual({ type: "unconditional" });
    expect(jadeSouth?.secondPlace).toEqual({ type: "impossible" });
  });

  it("marks 2nd place as unconditional when required score is below -10,000", () => {
    const result = calculateRankupConditions({
      mahjongType: "four",
      danId: "saint1",
      currentPoints: 3990
    });

    const throneSouth = result.conditions.find(
      (c) => c.stage === "왕좌탁" && c.gameMode === "사마 반장"
    );
    expect(throneSouth?.firstPlace).toEqual({ type: "unconditional" });
    expect(throneSouth?.secondPlace).toEqual({ type: "unconditional" });
  });
});
