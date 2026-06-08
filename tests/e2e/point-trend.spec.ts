import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const pointsTab = page.getByRole("tab", { name: "포인트 추이 그래프" });
  await expect(pointsTab).toBeVisible();
  await pointsTab.click();
});

test("empty submit shows a Korean validation error", async ({ page }) => {
  await page.getByRole("button", { name: "그래프 생성" }).click();

  await expect(page.getByRole("alert")).toHaveText("닉네임을 입력해주세요.");
});

test("generates point trend chart from mocked player records", async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route("**/api/search-player**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [
          { id: 1001, nickname: "Tester", latestTimestamp: 1700000500 },
          { id: 2002, nickname: "Tester", latestTimestamp: 1700000400 }
        ]
      })
    });
  });

  await page.route("**/api/player-records**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        records: [
          {
            modeId: 16,
            startTime: 1700000300,
            endTime: 1700000600,
            players: [
              { accountId: 2002, score: 45000, level: 10301, gradingScore: 45 },
              { accountId: 1001, score: 25000, level: 10301, gradingScore: 5 },
              { accountId: 3003, score: 20000, level: 10301, gradingScore: -15 },
              { accountId: 4004, score: 10000, level: 10301, gradingScore: -35 }
            ]
          },
          {
            modeId: 16,
            startTime: 1700000000,
            endTime: 1700000200,
            players: [
              { accountId: 1001, score: 45000, level: 10301, gradingScore: 45 },
              { accountId: 2002, score: 30000, level: 10301, gradingScore: 15 },
              { accountId: 3003, score: 20000, level: 10301, gradingScore: -15 },
              { accountId: 4004, score: 5000, level: 10301, gradingScore: -45 }
            ]
          }
        ]
      })
    });
  });

  await page.getByLabel("Mahjong Soul 닉네임").fill("Tester");
  await page.getByLabel("동일 닉네임 번호").selectOption("0");
  await page.getByRole("button", { name: "그래프 생성" }).click();

  await expect(page.getByText("패보를 분석하는 중...")).toBeVisible();
  const result = page.getByLabel("포인트 추이 결과");
  const chart = result.getByRole("img", { name: "포인트 추이 그래프" });
  await expect(chart).toBeVisible();
  const chartCanvas = chart.locator("canvas").first();
  await expect(chartCanvas).toBeAttached();
  await expect
    .poll(async () => {
      return chartCanvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d");

        if (!context || canvas.width <= 0 || canvas.height <= 0) {
          return false;
        }

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let index = 3; index < pixels.length; index += 4) {
          if ((pixels[index] ?? 0) > 0) {
            return canvas.clientWidth > 0 && canvas.clientHeight > 0;
          }
        }

        return false;
      });
    })
    .toBe(true);
  await expect(result.getByText("대국 수")).toBeVisible();
  await expect(result.getByText("2", { exact: true })).toBeVisible();
  await expect(result.getByText("현재 pt")).toBeVisible();
  await expect(result.getByText("650", { exact: true }).first()).toBeVisible();
  await expect(result.getByText("최고 pt")).toBeVisible();
  await expect(result.getByText("최저 pt")).toBeVisible();
  await expect(result.getByText("최고 등급")).toBeVisible();
  await expect(result.getByText("걸1", { exact: true })).toBeVisible();
  await expect(result.getByRole("heading", { name: "최근 등급 기록" })).toBeVisible();
  await expect(result.getByText("사3 -> 걸1")).toBeVisible();

  expect(requestedUrls).toHaveLength(2);
  expect(requestedUrls[0]).toContain("/api/search-player?");
  expect(requestedUrls[0]).toContain("mode=pl4");
  expect(requestedUrls[0]).toContain("nickname=Tester");
  expect(requestedUrls[1]).toContain("/api/player-records?");
  expect(requestedUrls[1]).toContain("mode=pl4");
  expect(requestedUrls[1]).toContain("playerId=1001");
  expect(requestedUrls[1]).toContain("startTime=1700000500");
  expect(requestedUrls[1]).toContain("gameModes=16%2C15%2C12%2C11%2C9%2C8");
});

test("shows Korean search error when API returns an English backend message", async ({ page }) => {
  await page.route("**/api/search-player**", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "upstream_error",
          message: "Amae-Koromo request failed"
        }
      })
    });
  });

  await page.getByLabel("Mahjong Soul 닉네임").fill("Tester");
  await page.getByLabel("동일 닉네임 번호").selectOption("0");
  await page.getByRole("button", { name: "그래프 생성" }).click();

  await expect(page.getByRole("alert")).toHaveText("닉네임 검색에 실패했습니다.");
  await expect(page.getByText("Amae-Koromo request failed")).toHaveCount(0);
});

test("shows Korean search error when the request is rejected", async ({ page }) => {
  await page.route("**/api/search-player**", async (route) => {
    await route.abort();
  });

  await page.getByLabel("Mahjong Soul 닉네임").fill("Tester");
  await page.getByLabel("동일 닉네임 번호").selectOption("0");
  await page.getByRole("button", { name: "그래프 생성" }).click();

  await expect(page.getByRole("alert")).toHaveText("닉네임 검색에 실패했습니다.");
  await expect(page.getByText("Failed to fetch")).toHaveCount(0);
});

test("locks point form while a request is in flight", async ({ page }) => {
  let releaseSearch!: () => void;
  let resolveSearchRequested!: () => void;
  const searchRequested = new Promise<void>((resolve) => {
    resolveSearchRequested = resolve;
  });

  await page.route("**/api/search-player**", async (route) => {
    resolveSearchRequested();
    await new Promise<void>((release) => {
      releaseSearch = release;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [{ id: 1001, nickname: "Tester", latestTimestamp: 1700000500 }]
      })
    });
  });
  await page.route("**/api/player-records**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ records: [] })
    });
  });

  await page.getByLabel("Mahjong Soul 닉네임").fill("Tester");
  await page.getByLabel("동일 닉네임 번호").selectOption("0");
  await page.getByRole("button", { name: "그래프 생성" }).click();
  await searchRequested;

  await expect(page.getByLabel("Mahjong Soul 닉네임")).toBeDisabled();
  await expect(page.getByLabel("모드")).toBeDisabled();
  await expect(page.getByLabel("동일 닉네임 번호")).toBeDisabled();
  await expect(page.getByRole("button", { name: "그래프 생성" })).toBeDisabled();

  releaseSearch();
});

test("shows Korean timeline error when records cannot be analyzed", async ({ page }) => {
  await page.route("**/api/search-player**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [{ id: 1001, nickname: "Tester", latestTimestamp: 1700000500 }]
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
            modeId: 999,
            startTime: 1700000000,
            endTime: 1700000200,
            players: [
              { accountId: 1001, score: 45000, level: 10301, gradingScore: 45 },
              { accountId: 2002, score: 30000, level: 10301, gradingScore: 15 }
            ]
          }
        ]
      })
    });
  });

  await page.getByLabel("Mahjong Soul 닉네임").fill("Tester");
  await page.getByLabel("동일 닉네임 번호").selectOption("0");
  await page.getByRole("button", { name: "그래프 생성" }).click();

  await expect(page.getByRole("alert")).toHaveText("패보를 분석할 수 없습니다. 대국 기록을 확인해 주세요.");
  await expect(page.getByText("Unsupported game mode")).toHaveCount(0);
});
