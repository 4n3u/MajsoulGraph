import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/index";

async function withServer<T>(
  fn: (baseUrl: string) => Promise<T>,
  options?: Parameters<typeof createApp>[0]
): Promise<T> {
  const server = createApp(options).listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing test server address");

  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("scaffold", () => {
  it("serves health status", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  it("returns JSON 404 for unknown API routes", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/missing`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: { code: "not_found", message: "Route not found" } });
    });
  });

  it("serves the app shell for non-API routes after build", async () => {
    const clientDist = await mkdtemp(path.join(tmpdir(), "majsoul-graph-client-"));

    try {
      await writeFile(path.join(clientDist, "index.html"), '<!doctype html><div id="root"></div>');

      await withServer(
        async (baseUrl) => {
          const response = await fetch(`${baseUrl}/some/client/route`);
          expect(response.status).toBe(200);
          expect(response.headers.get("content-type")).toContain("text/html");
          expect(await response.text()).toContain("id=\"root\"");
        },
        { clientDist }
      );
    } finally {
      await rm(clientDist, { recursive: true, force: true });
    }
  });

  it("keeps nested result areas unframed inside tool cards", async () => {
    const css = await readFile(path.resolve("client/src/styles.css"), "utf8");
    const nestedResultSelectors = [
      ".result-panel",
      ".result-meta div",
      ".hand-preview-panel",
      ".style-coordinates div,\n.style-stat-list div",
      ".style-chart",
      ".point-summary div",
      ".point-chart",
      ".rank-history",
      ".rank-history-row"
    ];

    for (const selector of nestedResultSelectors) {
      const start = css.indexOf(`${selector} {`);
      expect(start, `${selector} selector should exist`).toBeGreaterThanOrEqual(0);
      const end = css.indexOf("}", start);
      const block = css.slice(start, end);

      expect(block, `${selector} should not set a card background`).not.toMatch(/^\s*background:/m);
      expect(block, `${selector} should not set a card border`).not.toMatch(/^\s*border:/m);
      expect(block, `${selector} should not set a card radius`).not.toMatch(/^\s*border-radius:/m);
    }
  });

  it("uses a neutral default palette instead of the previous green theme", async () => {
    const css = await readFile(path.resolve("client/src/styles.css"), "utf8");
    const removedGreenPalette = ["#244c31", "#45604c", "#bad2c1", "#eef6f0", "#67706b", "#56615a"];

    for (const color of removedGreenPalette) {
      expect(css).not.toContain(color);
    }
  });

  it("keeps Base UI controls styled after the documentation examples", async () => {
    const css = await readFile(path.resolve("client/src/styles.css"), "utf8");

    expect(css).toContain("oklch(14.5% 0 0deg)");
    expect(css).toContain("outline-offset: -1px");
    expect(css).toContain("box-shadow: 0.25rem 0.25rem 0 rgb(0 0 0 / 12%)");
    expect(css).toContain("translate: var(--active-tab-left)");

    expect(css).toMatch(/\.base-input,\s*\.base-select-trigger,\s*\.result-url\s*{[\s\S]*border-radius: 0/);
    expect(css).toMatch(/\.primary-button,\s*\.secondary-button\s*{[\s\S]*border-radius: 0/);
    expect(css).toMatch(/\.tool-tab-indicator\s*{[\s\S]*border-top: 1px solid oklch\(14\.5% 0 0deg\)/);
  });
});
