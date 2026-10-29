import { describe, expect, it } from "vitest";
import { ALL_SERVER_ENDPOINTS, SERVER_REGIONS } from "@client/features/serverStatus/data";

describe("server status catalog", () => {
  it("has unique endpoint ids", () => {
    const ids = ALL_SERVER_ENDPOINTS.map((endpoint) => endpoint.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives measurable endpoints a URL and leaves browser-limited routes empty", () => {
    for (const endpoint of ALL_SERVER_ENDPOINTS) {
      if (endpoint.measurable) {
        expect(endpoint.httpUrl, endpoint.id).toMatch(/^https:\/\//);
      } else {
        expect(endpoint.httpUrl, endpoint.id).toBeNull();
      }
    }
  });

  it("groups the four planned regions", () => {
    expect(SERVER_REGIONS.map((region) => region.id)).toEqual(["en-kr", "jp", "cn", "auth"]);
  });
});
