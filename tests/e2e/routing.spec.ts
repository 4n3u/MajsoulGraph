import { expect, test } from "@playwright/test";

test("opens direct tool routes and updates the URL from tabs", async ({ page }) => {
  await page.goto("/style");
  await expect(page.getByRole("tab", { name: "사마 스타일 분석" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "사마 스타일 분석" })).toBeVisible();

  await page.getByRole("tab", { name: "손패 이미지 생성" }).click();
  await expect(page).toHaveURL(/\/pai-image$/);
  await expect(page.getByRole("heading", { name: "손패 이미지 생성" })).toBeVisible();

  await page.getByRole("tab", { name: "승단 조건" }).click();
  await expect(page).toHaveURL(/\/rankup$/);
  await expect(page.getByRole("heading", { name: "승단 조건" })).toBeVisible();

  await page.getByRole("tab", { name: "패보 주소 변환" }).click();
  await expect(page).toHaveURL(/\/pai-pu$/);
  await expect(page.getByRole("heading", { name: "패보 주소 변환" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.getByRole("heading", { name: "포인트 추이 그래프" })).toBeVisible();
});

test("preserves tool input and results when switching tabs", async ({ page }) => {
  await page.route("**/api/search-player**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [
          { id: 9999, nickname: "PersistentUser", level: { id: 10301, score: 645 }, latestTimestamp: 1700000500 }
        ]
      })
    });
  });

  await page.route("**/api/player-records**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        records: [
          {
            modeId: 16,
            startTime: 1700000000,
            endTime: 1700000200,
            players: [
              { accountId: 9999, score: 45000, level: 10301, gradingScore: 45 },
              { accountId: 2002, score: 30000, level: 10301, gradingScore: 15 },
              { accountId: 3003, score: 20000, level: 10301, gradingScore: -15 },
              { accountId: 4004, score: 5000, level: 10301, gradingScore: -45 }
            ]
          }
        ]
      })
    });
  });

  await page.goto("/graph");
  await page.getByLabel("작혼 닉네임").fill("PersistentUser");
  await page.getByRole("button", { name: "그래프 생성" }).click();

  const pointResults = page.getByLabel("포인트 추이 결과");
  await expect(pointResults).toBeVisible();
  await expect(pointResults.getByRole("img", { name: "포인트 추이 그래프" })).toBeVisible();

  // Navigate to rankup tool
  await page.getByRole("tab", { name: "승단 조건" }).click();
  await expect(page).toHaveURL(/\/rankup$/);
  await page.getByLabel("현재 포인트").fill("2750");
  await page.getByRole("button", { name: "계산하기" }).click();
  await expect(page.locator(".rankup-table")).toBeVisible();

  // Navigate back to point trend graph tool
  await page.getByRole("tab", { name: "포인트 추이 그래프" }).click();
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.getByLabel("작혼 닉네임")).toHaveValue("PersistentUser");
  await expect(page.getByLabel("포인트 추이 결과")).toBeVisible();
  await expect(page.getByLabel("포인트 추이 결과").getByRole("img", { name: "포인트 추이 그래프" })).toBeVisible();

  // Navigate back to rankup tool
  await page.getByRole("tab", { name: "승단 조건" }).click();
  await expect(page).toHaveURL(/\/rankup$/);
  await expect(page.getByLabel("현재 포인트")).toHaveValue("2750");
  await expect(page.locator(".rankup-table")).toBeVisible();
});

