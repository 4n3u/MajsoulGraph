import { expect, test } from "@playwright/test";

test("opens direct tool routes and updates the URL from tabs", async ({ page }) => {
  await page.goto("/style");
  await expect(page.getByRole("tab", { name: "사마 스타일 분석" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "사마 스타일 분석" })).toBeVisible();

  await page.getByRole("tab", { name: "손패 이미지 생성" }).click();
  await expect(page).toHaveURL(/\/pai-image$/);
  await expect(page.getByRole("heading", { name: "손패 이미지 생성" })).toBeVisible();

  await page.getByRole("tab", { name: "패보 주소 변환" }).click();
  await expect(page).toHaveURL(/\/pai-pu$/);
  await expect(page.getByRole("heading", { name: "패보 주소 변환" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.getByRole("heading", { name: "포인트 추이 그래프" })).toBeVisible();
});
