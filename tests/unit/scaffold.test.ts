import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/index";

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createApp().listen(0);
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
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/some/client/route`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("id=\"root\"");
    });
  });
});
