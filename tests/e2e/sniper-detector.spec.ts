import { expect, test } from "@playwright/test";

test("searches both targets and renders the sniper analysis result", async ({ page }) => {
  await page.route("**/api/search-player**", async (route) => {
    const nickname = new URL(route.request().url()).searchParams.get("nickname");
    const player = nickname === "One"
      ? { id: 101, nickname: "One", latestTimestamp: 1700000000 }
      : { id: 202, nickname: "Two", latestTimestamp: 1700000100 };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ players: [player] })
    });
  });

  await page.route("**/api/sniper-analysis**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("targetOneId")).toBe("101");
    expect(url.searchParams.get("targetTwoId")).toBe("202");
    expect(url.searchParams.get("thresholdSeconds")).toBe("30");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suspiciousCount: 2,
        successfulCount: 1,
        matches: [
          { startTime: 1700000200, nearestDifferenceSeconds: 5, metTargetTwo: true },
          { startTime: 1700000300, nearestDifferenceSeconds: 12, metTargetTwo: false }
        ]
      })
    });
  });

  await page.goto("/sniper");
  await expect(page.getByRole("tab", { name: "저격 탐지" })).toHaveAttribute("aria-selected", "true");

  await page.getByLabel("대상 1 닉네임").fill("One");
  await page.getByLabel("대상 2 닉네임").fill("Two");
  await page.getByRole("button", { name: "탐지 시작" }).click();

  const result = page.getByLabel("저격 탐지 결과");
  await expect(result).toContainText("동시 시작 의심2건");
  await expect(result).toContainText("대상 2 동석1건");
  await expect(result.getByRole("table")).toContainText("5초");
  await expect(result.getByRole("table")).toContainText("동석");
});
