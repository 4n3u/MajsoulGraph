import { expect, test } from "@playwright/test";

const tools = [
  "포인트 추이 그래프",
  "사마 스타일 분석",
  "손패 이미지 생성",
  "패보 주소 변환"
];

test("shell omits the app header block and shows all four tools", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#root > div > header > div")).toHaveCount(0);

  for (const tool of tools) {
    await expect(page.getByRole("tab", { name: tool })).toBeVisible();
  }

  await expect(page.locator(".app-layout")).toHaveClass(/app-layout/);
});

test("selecting the style tool shows the analysis form", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "사마 스타일 분석" }).click();

  await expect(page.getByRole("heading", { name: "사마 스타일 분석" })).toBeVisible();
  await expect(page.getByLabel("Mahjong Soul 닉네임")).toBeVisible();
  await expect(page.getByRole("button", { name: "분석하기" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "사마 스타일 분석" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("placeholder heading ids are generated and unique after changing tools", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "패보 주소 변환" }).click();

  const { duplicateIds, placeholderHeadingIds } = await page
    .locator(".app-shell")
    .evaluate((appShell) => {
      const ids = Array.from(
        appShell.querySelectorAll<HTMLElement>("[id]"),
        (element) => element.id
      );
      const placeholderHeadingIds = Array.from(
        appShell.querySelectorAll<HTMLHeadingElement>(".tool-placeholder h2"),
        (element) => element.id
      );
      const seen = new Set<string>();

      const duplicateIds = ids.filter((id) => {
        if (seen.has(id)) {
          return true;
        }

        seen.add(id);
        return false;
      });

      return { duplicateIds, placeholderHeadingIds };
    });

  expect(duplicateIds).toEqual([]);
  expect(placeholderHeadingIds).not.toContain("tool-placeholder-title");
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
