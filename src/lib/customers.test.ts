import { describe, expect, it } from "vitest";
import { customerStats, matchesCustomer, normalizeSearch } from "./customers";

describe("customerStats", () => {
  it("durumları sayar, son ziyareti ve gelmeme oranını verir", () => {
    const s = customerStats([
      { status: "completed", starts_at: "2026-09-01T10:00:00Z" },
      { status: "completed", starts_at: "2026-10-01T10:00:00Z" },
      { status: "no_show", starts_at: "2026-09-15T10:00:00Z" },
      { status: "cancelled", starts_at: "2026-09-20T10:00:00Z" },
      { status: "confirmed", starts_at: "2026-11-01T10:00:00Z" },
    ]);
    expect(s).toMatchObject({ total: 5, completed: 2, noShow: 1, cancelled: 1, lastVisit: "2026-10-01T10:00:00Z" });
    expect(s.noShowRate).toBeCloseTo(1 / 3);
  });
  it("boş geçmişte sıfır döner", () => {
    expect(customerStats([])).toEqual({ total: 0, completed: 0, noShow: 0, cancelled: 0, lastVisit: null, noShowRate: 0 });
  });
});

describe("arama", () => {
  const c = { full_name: "Şule Yılmaz", phone: "+905321234567", email: "Sule@Ornek.com" };
  it("Türkçe karakterleri ve harf büyüklüğünü yok sayar", () => {
    expect(normalizeSearch("ŞULE ığ")).toBe("sule ig");
    expect(matchesCustomer(c, "sule")).toBe(true);
    expect(matchesCustomer(c, "YILMAZ")).toBe(true);
    expect(matchesCustomer(c, "ornek.com")).toBe(true);
  });
  it("telefonu biçimden bağımsız arar, çok kısa rakamı yok sayar", () => {
    expect(matchesCustomer(c, "0532 123")).toBe(true); // baştaki 0 ve +90 farkı yok sayılır
    expect(matchesCustomer(c, "+90 532 123")).toBe(true);
    expect(matchesCustomer(c, "532 123 45")).toBe(true);
    expect(matchesCustomer(c, "12")).toBe(false);
  });
  it("boş arama herkesi getirir", () => {
    expect(matchesCustomer(c, "  ")).toBe(true);
  });
});
