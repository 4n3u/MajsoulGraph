import { expect, test, type Page } from "@playwright/test";

async function expectErrorToast(page: Page, message: string) {
  const toast = page.locator(".base-toast");

  await expect(toast).toContainText("오류");
  await expect(toast).toContainText(message);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "손패 이미지 생성" }).click();
});

test("generates a visible nonblank hand preview canvas", async ({ page }) => {
  await page.getByLabel("패 입력").fill("m123 p456 s789 z123");
  await page.getByRole("button", { name: "이미지 생성" }).click();

  const canvas = page.getByLabel("생성된 손패 이미지");
  await expect(canvas).toBeVisible();
  await expect(page.getByText("생성된 손패 이미지")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "이미지 다운로드" })).toBeVisible();

  const preview = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext("2d");

    if (!context) {
      return { width: canvasElement.width, height: canvasElement.height, nonblankPixels: 0 };
    }

    const pixels = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    let nonblankPixels = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) > 0) {
        nonblankPixels += 1;
      }
    }

    return { width: canvasElement.width, height: canvasElement.height, nonblankPixels };
  });

  expect(preview.width).toBeGreaterThan(0);
  expect(preview.height).toBeGreaterThan(0);
  expect(preview.nonblankPixels).toBeGreaterThan(0);
});

test("renders uppercase tiles with legacy counterclockwise rotation", async ({ page }) => {
  await page.getByLabel("패 입력").fill("S1");
  await page.getByRole("button", { name: "이미지 생성" }).click();

  const canvas = page.getByLabel("생성된 손패 이미지");
  await expect(canvas).toBeVisible();

  const rotation = await canvas.evaluate(async (element) => {
    const canvasElement = element as HTMLCanvasElement;
    const sourceImage = new Image();
    sourceImage.src = "/assets/img/pai_img/1s.png";
    await sourceImage.decode();

    const expectedCanvas = document.createElement("canvas");
    expectedCanvas.width = sourceImage.naturalHeight + 20;
    expectedCanvas.height = sourceImage.naturalWidth + 20;

    const expectedContext = expectedCanvas.getContext("2d");
    const actualContext = canvasElement.getContext("2d");

    if (!expectedContext || !actualContext) {
      return { width: canvasElement.width, height: canvasElement.height, diffPixels: -1 };
    }

    expectedContext.translate(10 + sourceImage.naturalHeight / 2, 10 + sourceImage.naturalWidth / 2);
    expectedContext.rotate(-Math.PI / 2);
    expectedContext.drawImage(
      sourceImage,
      -sourceImage.naturalWidth / 2,
      -sourceImage.naturalHeight / 2
    );

    const actual = actualContext.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    const expected = expectedContext.getImageData(0, 0, expectedCanvas.width, expectedCanvas.height)
      .data;
    let diffPixels = 0;
    let nonblankPixels = 0;

    for (let index = 0; index < actual.length; index += 4) {
      const alpha = actual[index + 3] ?? 0;
      if (alpha > 0) {
        nonblankPixels += 1;
      }

      const channelDelta =
        Math.abs((actual[index] ?? 0) - (expected[index] ?? 0)) +
        Math.abs((actual[index + 1] ?? 0) - (expected[index + 1] ?? 0)) +
        Math.abs((actual[index + 2] ?? 0) - (expected[index + 2] ?? 0)) +
        Math.abs(alpha - (expected[index + 3] ?? 0));

      if (channelDelta > 4) {
        diffPixels += 1;
      }
    }

    return {
      width: canvasElement.width,
      height: canvasElement.height,
      expectedWidth: expectedCanvas.width,
      expectedHeight: expectedCanvas.height,
      diffPixels,
      nonblankPixels
    };
  });

  expect(rotation.width).toBe(rotation.expectedWidth);
  expect(rotation.height).toBe(rotation.expectedHeight);
  expect(rotation.nonblankPixels).toBeGreaterThan(0);
  expect(rotation.diffPixels).toBe(0);
});

test("shows a Korean error for hands over the tile limit", async ({ page }) => {
  await page.getByLabel("패 입력").fill("m1111111111111111111");
  await page.getByRole("button", { name: "이미지 생성" }).click();

  await expectErrorToast(page, "18개");
  await expect(page.getByLabel("생성된 손패 이미지")).toBeHidden();
});
