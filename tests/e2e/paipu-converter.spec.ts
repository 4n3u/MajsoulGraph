import { expect, test } from "@playwright/test";

const ordinaryUrl =
  "https://game.mahjongsoul.com/?paipu=240101-12345678-abcdef12_a280178470";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "패보 주소 변환" }).click();
});

test("converts ordinary paipu URL to anonymous URL", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill(ordinaryUrl);
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("heading", { name: "변환된 익명 패보 주소" })).toBeVisible();
  await expect(page.getByText("계정 ID")).toBeVisible();
  await expect(page.getByText("친구 ID")).toBeVisible();
  await expect(page.getByLabel("변환된 패보 주소")).toContainText("_2");
});

test("shows a Korean error for invalid input", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill("not a paipu url");
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("alert")).toContainText("패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});
