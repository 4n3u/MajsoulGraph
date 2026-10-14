import { expect, test } from "@playwright/test";

test.describe("Rankup calculator", () => {
  test("renders rankup tool and calculates conditions properly", async ({ page }) => {
    await page.goto("/rankup");

    await expect(page.getByRole("tab", { name: "승단 조건" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "승단 조건" })).toBeVisible();

    await expect(page.getByLabel("모드")).toBeVisible();
    await expect(page.getByLabel("단위")).toBeVisible();
    await expect(page.getByLabel("현재 포인트")).toBeVisible();

    await page.getByLabel("현재 포인트").fill("2750");
    await page.getByRole("button", { name: "계산하기" }).click();

    await expect(page.getByText(/작호1 2,750 \/ 2,800 pt에서 승단하려면 50 pt 필요합니다\./)).toBeVisible();

    const table = page.locator(".rankup-table");
    await expect(table).toBeVisible();
    await expect(table.getByText("옥탁").first()).toBeVisible();
    await expect(table.getByText("금탁").first()).toBeVisible();
    await expect(table.getByText("사마 반장").first()).toBeVisible();
    await expect(table.getByText("확정 승단").first()).toBeVisible();

    await expect(page.getByRole("link", { name: "GitHub 저장소" })).toBeVisible();
  });

  test("shows error toast when point is negative or exceeds maximum", async ({ page }) => {
    await page.goto("/rankup");

    await page.getByLabel("현재 포인트").fill("99999");
    await page.getByRole("button", { name: "계산하기" }).click();

    await expect(
      page.locator(".base-toast-description").getByText(/0~2,800 사이의 숫자를 입력해 주세요\./)
    ).toBeVisible();
  });
});
