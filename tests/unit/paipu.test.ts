import { describe, expect, it } from "vitest";
import {
  acc2Friend,
  acc2Match,
  decodePaipuUuid,
  encodePaipuUuid,
  mat2Account,
  mat2Friend,
  zone
} from "@shared/paipu";

describe("paipu uuid conversion", () => {
  it("round-trips ordinary and anonymous uuid tokens", () => {
    const ordinary = "240101-12345678-abcdef12";
    const encoded = encodePaipuUuid(ordinary);

    expect(encoded).not.toBe(ordinary);
    expect(decodePaipuUuid(encoded)).toBe(ordinary);
  });

  it("preserves punctuation while shifting alphanumeric characters", () => {
    expect(encodePaipuUuid("0-a")).toBe("h-t");
    expect(decodePaipuUuid("h-t")).toBe("0-a");
  });
});

describe("account and match id conversion", () => {
  it("converts match id to account id and friend id", () => {
    const accountId = 27769725;
    const matchId = acc2Match(accountId);
    expect(mat2Account(matchId)).toBe(accountId);
    expect(mat2Friend(matchId)).toBe(acc2Friend(accountId));
  });

  it("detects server region from account id", () => {
    expect(zone(1 << 23)).toBe("CN");
    expect(zone(8 << 23)).toBe("JP");
    expect(zone(14 << 23)).toBe("EN");
  });
});
