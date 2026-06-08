import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "손패 이미지 생성" }).click();
});

test("generates a visible nonblank hand preview canvas", async ({ page }) => {
  await page.getByLabel("패 입력").fill("m123 p456 s789 z123");
  await page.getByRole("button", { name: "생성" }).click();

  const canvas = page.getByLabel("생성된 손패 이미지");
  await expect(canvas).toBeVisible();

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

test("shows a Korean error for hands over the tile limit", async ({ page }) => {
  await page.getByLabel("패 입력").fill("m1111111111111111111");
  await page.getByRole("button", { name: "생성" }).click();

  await expect(page.getByRole("alert")).toContainText("18개");
  await expect(page.getByLabel("생성된 손패 이미지")).toBeHidden();
});
