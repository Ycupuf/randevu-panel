import { describe, expect, it } from "vitest";
import { centsToTl, tlToCents } from "./money";

describe("money", () => {
  it("TL metnini kuruşa çevirir", () => {
    expect(tlToCents("350")).toBe(35000);
    expect(tlToCents("350,50")).toBe(35050);
    expect(tlToCents(" 12.5 ")).toBe(1250);
    expect(tlToCents("0")).toBe(0);
  });
  it("boş metin fiyat sorulur (null), bozuk metin undefined", () => {
    expect(tlToCents("")).toBeNull();
    expect(tlToCents("  ")).toBeNull();
    expect(tlToCents("abc")).toBeUndefined();
    expect(tlToCents("-5")).toBeUndefined();
    expect(tlToCents("1,234")).toBeUndefined();
  });
  it("kuruşu metne çevirir", () => {
    expect(centsToTl(35000)).toBe("350");
    expect(centsToTl(35050)).toBe("350,50");
    expect(centsToTl(null)).toBe("");
  });
  it("gidiş dönüş tutarlıdır", () => {
    for (const c of [0, 5, 100, 1999, 120000]) expect(tlToCents(centsToTl(c))).toBe(c);
  });
});
