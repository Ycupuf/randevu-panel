import { describe, expect, it } from "vitest";
import { normalizePhoneTR } from "./phone";

describe("normalizePhoneTR", () => {
  it.each([
    ["0532 123 45 67", "+905321234567"],
    ["532-123-4567", "+905321234567"],
    ["+90 532 123 45 67", "+905321234567"],
    ["905321234567", "+905321234567"],
    ["(0532) 123 45 67", "+905321234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhoneTR(input)).toBe(expected);
  });

  it.each(["", "abc", "0212 123 45 67", "0532 123 45", "+1 555 123 4567", "05321234567890"])("geçersiz: %j", (input) => {
    expect(normalizePhoneTR(input)).toBeNull();
  });

  it("aynı kişi farklı yazımlarla aynı anahtara iner (kopya müşteri oluşmaz)", () => {
    expect(normalizePhoneTR("0532 123 45 67")).toBe(normalizePhoneTR("+905321234567"));
  });
});
