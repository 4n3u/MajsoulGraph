import { expect, test, type Page } from "@playwright/test";

async function expectErrorToast(page: Page, message: string) {
  const toast = page.locator(".base-toast");

  await expect(toast).toContainText("오류");
  await expect(toast).toContainText(message);
}

async function expectStyleStatGrid(page: Page, result: ReturnType<Page["getByLabel"]>) {
  const statItems = result.locator(".style-stat-list > div");
  await expect(statItems).toHaveCount(12);

  const first = await statItems.nth(0).boundingBox();
  const second = await statItems.nth(1).boundingBox();
  const third = await statItems.nth(2).boundingBox();

  if (!first || !second || !third) {
    throw new Error("Style stat item bounds were not available");
  }

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 768) {
    expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    expect(third.y).toBeGreaterThan(first.y + first.height * 0.5);
    return;
  }

  const fourth = await statItems.nth(3).boundingBox();
  if (!fourth) {
    throw new Error("Style stat item bounds were not available");
  }
  expect(Math.abs(first.y - fourth.y)).toBeLessThan(2);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/style");
  const styleTab = page.getByRole("tab", { name: "사마 스타일 분석" });
  await expect(styleTab).toBeVisible();
  await expect(styleTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/style$/);
});

test("empty submit shows a Korean validation error", async ({ page }) => {
  await expect(page.getByRole("link", { name: "@yuraku_urame" })).toHaveAttribute(
    "href",
    "https://x.com/yuraku_urame"
  );
  await expect(page.getByRole("link", { name: "@AmaeKoromo_MajS" })).toHaveAttribute(
    "href",
    "https://amae-koromo.sapk.ch/"
  );
  await expect(page.getByText("동일 닉네임 구분")).toHaveCount(0);
  await page.getByRole("button", { name: "대국 수 설명" }).click();
  await expect(page.getByText("최근 해당 대국 수 범위")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "스타일 분석" }).click();

  await expectErrorToast(page, "닉네임을 입력해주세요.");
});

test("invalid count shows a Korean validation error without calling the API", async ({ page }) => {
  let apiCalled = false;
  await page.route("**/api/player-style**", async (route) => {
    apiCalled = true;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "unexpected", message: "unexpected request" } })
    });
  });

  await page.getByLabel("작혼 닉네임").fill("Tester");
  await page.getByRole("spinbutton", { name: "대국 수", exact: true }).fill("0");
  await page.getByRole("button", { name: "스타일 분석" }).click();

  await expectErrorToast(page, "대국 수는 양의 정수로 입력해주세요.");
  expect(apiCalled).toBe(false);
});

test("renders style analysis result from mocked API response", async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route("**/api/search-player**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        players: [
          { id: 123, nickname: "Tester", level: { id: 10301, score: 645 }, latestTimestamp: 1700000000 },
          { id: 456, nickname: "Tester", level: { id: 10403, score: 1298 }, latestTimestamp: 1710000123 }
        ]
      })
    });
  });

  await page.route("**/api/player-style**", async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(url.toString());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        player: { id: 123, nickname: "Tester" },
        processed: {
          horyuRate: 0.32,
          houjuRate: 0.09,
          furoRate: 0.41,
          riichiRate: 0.18,
          damaRate: 0.1,
          averageScore: 7200,
          avgHoryuTurn: 11,
          avgHoujuScore: 5100,
          ryukyokuRate: 0.47,
          riichiTurn: 9,
          riichiFirstRate: 0.84,
          riichiChaseRate: 0.16
        },
        point: { x: 12.345, y: -8.765 },
        analysis: {
          intensity: "중증",
          style: "멘젠 고득점형",
          distance: 15.14,
          slope: -0.71
        }
      })
    });
  });

  await page.getByLabel("작혼 닉네임").fill("Tester");
  await page.getByRole("spinbutton", { name: "대국 수", exact: true }).fill("50");
  await page.getByRole("button", { name: "스타일 분석" }).click();

  const accountPicker = page.getByLabel("계정 선택");
  await expect(accountPicker).toBeVisible();
  await expect(accountPicker.getByText("작걸1 645pt")).toBeVisible();
  await expect(accountPicker.getByText("작호3 1298pt")).toBeVisible();
  await accountPicker.locator(".account-option", { hasText: "ID 456" }).click();

  const result = page.getByLabel("스타일 분석 결과");
  await expect(result.getByText("중증 멘젠 고득점형(12.35,-8.77)")).toBeVisible();
  await expect(result.getByText("당신은")).toHaveCount(0);
  await expect(result.getByText("X 좌표")).toHaveCount(0);
  await expect(result.getByText("Y 좌표")).toHaveCount(0);
  await expect(result.getByText("화료율")).toBeVisible();
  await expect(result.getByText("0.32")).toBeVisible();
  await expectStyleStatGrid(page, result);

  const chart = result.getByRole("img", { name: "스타일 분석 산점도" });
  await expect(chart).toBeVisible();
  const chartBox = await chart.boundingBox();
  if (!chartBox) {
    throw new Error("Style chart bounds were not available");
  }
  expect(Math.abs(chartBox.width - chartBox.height)).toBeLessThan(2);
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

  expect(requestedUrls).toHaveLength(2);
  expect(requestedUrls[0]).toContain("/api/search-player?");
  expect(requestedUrls[0]).toContain("nickname=Tester");
  expect(requestedUrls[1]).toContain("/api/player-style?");
  expect(requestedUrls[1]).toContain("nickname=Tester");
  expect(requestedUrls[1]).toContain("playerId=456");
  expect(requestedUrls[1]).toContain("latestTimestamp=1710000123");
  expect(requestedUrls[1]).toContain("count=50");
});
