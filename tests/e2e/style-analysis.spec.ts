import { expect, test, type Page } from "@playwright/test";

async function chooseSelectOption(page: Page, label: string, option: string) {
  await page
    .locator(".base-select-field", { hasText: label })
    .locator(".base-select-trigger")
    .click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function expectErrorToast(page: Page, message: string) {
  const toast = page.locator(".base-toast");

  await expect(toast).toContainText("오류");
  await expect(toast).toContainText(message);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const styleTab = page.getByRole("tab", { name: "사마 스타일 분석" });
  await expect(styleTab).toBeVisible();
  await styleTab.click();
});

test("empty submit shows a Korean validation error", async ({ page }) => {
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
  await page.getByLabel("대국 수").fill("0");
  await page.getByRole("button", { name: "스타일 분석" }).click();

  await expectErrorToast(page, "대국 수는 양의 정수로 입력해주세요.");
  expect(apiCalled).toBe(false);
});

test("renders style analysis result from mocked API response", async ({ page }) => {
  const requestedUrls: string[] = [];

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
  await page.getByLabel("대국 수").fill("50");
  await chooseSelectOption(page, "동일 닉네임 구분", "1");
  await page.getByRole("button", { name: "스타일 분석" }).click();

  const result = page.getByLabel("스타일 분석 결과");
  await expect(result.getByText("당신은 중증 멘젠 고득점형입니다.")).toBeVisible();
  await expect(result.getByText("X 좌표")).toBeVisible();
  await expect(result.getByText("12.35")).toBeVisible();
  await expect(result.getByText("Y 좌표")).toBeVisible();
  await expect(result.getByText("-8.77")).toBeVisible();
  await expect(result.getByText("화료율")).toBeVisible();
  await expect(result.getByText("0.32")).toBeVisible();

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

  expect(requestedUrls).toHaveLength(1);
  expect(requestedUrls[0]).toContain("/api/player-style?");
  expect(requestedUrls[0]).toContain("nickname=Tester");
  expect(requestedUrls[0]).toContain("sameName=1");
  expect(requestedUrls[0]).toContain("count=50");
});
