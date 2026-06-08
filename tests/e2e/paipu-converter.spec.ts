import { expect, test } from "@playwright/test";

const ordinaryUrl =
  "https://game.mahjongsoul.com/?paipu=240101-12345678-abcdef12_a244931874";
const anonymousUrl =
  "https://game.mahjongsoul.com/?paipu=jmjlln-prtvxz13-79bdfh46_a244931874_2";

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
  await expect(page.getByLabel("변환된 패보 주소")).toHaveValue(anonymousUrl);
});

test("converts anonymous paipu URL to ordinary URL", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill(anonymousUrl);
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("heading", { name: "변환된 일반 패보 주소" })).toBeVisible();
  await expect(page.getByText("계정 ID")).toBeVisible();
  await expect(page.getByText("친구 ID")).toBeVisible();
  await expect(page.getByLabel("변환된 패보 주소")).toHaveValue(ordinaryUrl);
});

test("shows a Korean error for invalid input", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill("not a paipu url");
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("alert")).toContainText("패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});

test("shows a Korean error for malformed paipu token and match id", async ({ page }) => {
  await page
    .getByLabel("패보 주소 입력")
    .fill("https://game.mahjongsoul.com/?paipu=foo_a0");
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("alert")).toContainText("패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});

test("shows a Korean error for non-canonical match id", async ({ page }) => {
  await page
    .getByLabel("패보 주소 입력")
    .fill("https://game.mahjongsoul.com/?paipu=240101-12345678-abcdef12_a244931875");
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("alert")).toContainText("패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});
