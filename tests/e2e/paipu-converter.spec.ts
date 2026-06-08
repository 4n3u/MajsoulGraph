import { expect, test, type Page } from "@playwright/test";

const ordinaryUrl =
  "https://game.mahjongsoul.com/?paipu=240101-12345678-abcdef12_a280178470";
const anonymousUrl =
  "https://game.mahjongsoul.com/?paipu=jmjlln-prtvxz13-79bdfh46_a280178470_2";
const standardUuidOrdinaryUrl =
  "https://game.mahjongsoul.com/?paipu=260608-1229bf0c-abac-4517-b2f6-f6c07714d154_a418784756";
const standardUuidAnonymousUrl =
  "https://game.mahjongsoul.com/?paipu=jojqlu-prs038u7-799c-685c-iaog-rjqfnojnxmrr_a418784756_2";

async function expectErrorToast(page: Page, message: string) {
  const toast = page.locator(".base-toast");

  await expect(toast).toContainText("오류");
  await expect(toast).toContainText(message);
}

async function expectToast(page: Page, title: string, message: string) {
  const toast = page.locator(".base-toast");

  await expect(toast).toContainText(title);
  await expect(toast).toContainText(message);
}

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

test("converts ordinary standard UUID paipu URL to anonymous URL", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill(standardUuidOrdinaryUrl);
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("heading", { name: "변환된 익명 패보 주소" })).toBeVisible();
  await expect(page.getByLabel("변환된 패보 주소")).toHaveValue(standardUuidAnonymousUrl);
});

test("shows copy confirmation as a toast", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.getByLabel("패보 주소 입력").fill(ordinaryUrl);
  await page.getByRole("button", { name: "변환" }).click();
  await page.getByRole("button", { name: "복사" }).click();

  await expectToast(page, "복사됨", "패보 주소를 클립보드에 복사했습니다.");
  await expect(page.locator(".copy-status")).toHaveCount(0);
  await expect
    .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(anonymousUrl);
});

test("converts anonymous paipu URL to ordinary URL", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill(anonymousUrl);
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("heading", { name: "변환된 일반 패보 주소" })).toBeVisible();
  await expect(page.getByText("계정 ID")).toBeVisible();
  await expect(page.getByText("친구 ID")).toBeVisible();
  await expect(page.getByLabel("변환된 패보 주소")).toHaveValue(ordinaryUrl);
});

test("converts anonymous standard UUID paipu URL to ordinary URL", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill(standardUuidAnonymousUrl);
  await page.getByRole("button", { name: "변환" }).click();

  await expect(page.getByRole("heading", { name: "변환된 일반 패보 주소" })).toBeVisible();
  await expect(page.getByLabel("변환된 패보 주소")).toHaveValue(standardUuidOrdinaryUrl);
});

test("shows a Korean error for invalid input", async ({ page }) => {
  await page.getByLabel("패보 주소 입력").fill("not a paipu url");
  await page.getByRole("button", { name: "변환" }).click();

  await expectErrorToast(page, "패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});

test("shows a Korean error for malformed paipu token and match id", async ({ page }) => {
  await page
    .getByLabel("패보 주소 입력")
    .fill("https://game.mahjongsoul.com/?paipu=foo_a0");
  await page.getByRole("button", { name: "변환" }).click();

  await expectErrorToast(page, "패보 주소");
  await expect(page.getByRole("heading", { name: /변환된/ })).toBeHidden();
});
