import { describe, expect, it } from "vitest";
import { parsePaiGroups } from "@shared/handParser";

describe("hand parser", () => {
  it("preserves grouped tile syntax and uppercase rotation", () => {
    expect(parsePaiGroups("p111m109s9 S1s11 z0z55z0")).toEqual([
      [
        { fileName: "1p.png", rotate: false },
        { fileName: "1p.png", rotate: false },
        { fileName: "1p.png", rotate: false },
        { fileName: "1m.png", rotate: false },
        { fileName: "0m.png", rotate: false },
        { fileName: "9m.png", rotate: false },
        { fileName: "9s.png", rotate: false }
      ],
      [
        { fileName: "1s.png", rotate: true },
        { fileName: "1s.png", rotate: false },
        { fileName: "1s.png", rotate: false }
      ],
      [
        { fileName: "0z.png", rotate: false },
        { fileName: "5z.png", rotate: false },
        { fileName: "5z.png", rotate: false },
        { fileName: "0z.png", rotate: false }
      ]
    ]);
  });

  it("rejects hands over the tile limit", () => {
    expect(() => parsePaiGroups("m1111111111111111111")).toThrow("maximum 18");
  });

  it("rejects malformed groups without any valid segments", () => {
    expect(() => parsePaiGroups("abc")).toThrow("Invalid tile group");
  });

  it("rejects malformed groups with partial segment matches", () => {
    expect(() => parsePaiGroups("m12!p3")).toThrow("Invalid tile group");
  });

  it("rejects unsupported suits", () => {
    expect(() => parsePaiGroups("x1")).toThrow("Unsupported tile suit");
  });

  it("rejects honor digits without production assets", () => {
    expect(() => parsePaiGroups("z89")).toThrow("Unsupported tile digit");
  });

  it("returns no groups for whitespace-only input", () => {
    expect(parsePaiGroups(" \n\t ")).toEqual([]);
  });
});
