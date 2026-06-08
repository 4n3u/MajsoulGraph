import { expect, test } from "@playwright/test";

const tools = [
  "포인트 추이 그래프",
  "사마 스타일 분석",
  "손패 이미지 생성",
  "패보 주소 변환"
];

test("desktop shell shows heading and all four tools", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Majsoul Graph" })).toBeVisible();

  for (const tool of tools) {
    await expect(page.getByRole("tab", { name: tool })).toBeVisible();
  }

  await expect(page.locator(".app-layout")).toHaveClass(/app-layout/);
});

test("selecting a tool updates the visible placeholder title", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "손패 이미지 생성" }).click();

  await expect(page.getByRole("heading", { name: "손패 이미지 생성" })).toBeVisible();
  await expect(page.getByText("손패 이미지 생성 기능은 이후 작업에서 구현됩니다.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "손패 이미지 생성" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("mobile shell uses labelled top navigation and one-column layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("tablist", { name: "도구 선택" })).toBeVisible();

  const layout = page.locator(".app-layout");
  await expect(layout).toBeVisible();

  const stacksInOneColumn = await layout.evaluate((element) => {
    const nav = element.querySelector(".tool-nav");
    const workspace = element.querySelector(".workspace");

    if (!nav || !workspace) {
      return false;
    }

    const navBox = nav.getBoundingClientRect();
    const workspaceBox = workspace.getBoundingClientRect();

    return workspaceBox.top >= navBox.bottom && Math.abs(workspaceBox.left - navBox.left) <= 1;
  });

  expect(stacksInOneColumn).toBe(true);
});
