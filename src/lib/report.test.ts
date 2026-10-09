import { describe, expect, it } from "vitest";
import { buildReport, type ReportAppointment } from "./report";

const opts = { timeZone: "Europe/Istanbul", toDate: "2026-10-12", days: 7, resourceNames: { r1: "Ali", r2: "Ayşe" }, nowMs: Date.parse("2026-10-12T12:00:00Z") };

function appt(partial: Partial<ReportAppointment> & { starts_at: string }): ReportAppointment {
  return { status: "completed", resource_id: "r1", appointment_items: [{ name: "Saç kesimi", price_cents: 35000 }], ...partial };
}

describe("buildReport", () => {
  it("boş veride sıfır ve tam gün listesi döner", () => {
    const r = buildReport([], opts);
    expect(r.total).toBe(0);
    expect(r.byDay).toHaveLength(7);
    expect(r.byDay[0].date).toBe("2026-10-06");
    expect(r.byDay[6].date).toBe("2026-10-12");
    expect(r.noShowRate).toBe(0);
  });

  it("durumları sayar; iptal toplama girmez", () => {
    const r = buildReport(
      [
        appt({ starts_at: "2026-10-10T07:00:00Z" }),
        appt({ starts_at: "2026-10-10T08:00:00Z", status: "no_show" }),
        appt({ starts_at: "2026-10-11T08:00:00Z", status: "cancelled" }),
        appt({ starts_at: "2026-10-12T15:00:00Z", status: "confirmed" }),
        appt({ starts_at: "2026-10-12T08:00:00Z", status: "pending" }), // saat geçmiş: bekleyen ama "yaklaşan" değil
      ],
      opts,
    );
    expect(r).toMatchObject({ total: 4, completed: 1, noShow: 1, cancelled: 1, upcoming: 1 });
    expect(r.noShowRate).toBe(0.5);
  });

  it("geliri yalnızca tamamlananlardan toplar, fiyatsız kalemi ayrı sayar", () => {
    const r = buildReport(
      [
        appt({ starts_at: "2026-10-10T07:00:00Z", appointment_items: [{ name: "A", price_cents: 10000 }, { name: "B", price_cents: null }] }),
        appt({ starts_at: "2026-10-10T09:00:00Z", status: "confirmed" }),
        appt({ starts_at: "2026-10-10T10:00:00Z", status: "no_show" }),
      ],
      opts,
    );
    expect(r.revenueCents).toBe(10000);
    expect(r.unpricedItems).toBe(1);
  });

  it("aralık dışını yok sayar ve gün sınırını İstanbul saatiyle çizer", () => {
    // 2026-10-12T21:30Z = İstanbul'da 13 Ekim 00:30: aralık dışı. 2026-10-05T21:30Z = 6 Ekim 00:30: içeride.
    const r = buildReport([appt({ starts_at: "2026-10-12T21:30:00Z" }), appt({ starts_at: "2026-10-05T21:30:00Z" })], opts);
    expect(r.total).toBe(1);
    expect(r.byDay[0]).toEqual({ date: "2026-10-06", count: 1 });
  });

  it("popüler hizmet, saat ve kaynak dağılımını sıralar", () => {
    const r = buildReport(
      [
        appt({ starts_at: "2026-10-10T07:00:00Z" }), // 10:00
        appt({ starts_at: "2026-10-10T07:30:00Z", resource_id: "r2", appointment_items: [{ name: "Boya", price_cents: 1 }, { name: "Saç kesimi", price_cents: 1 }] }),
        appt({ starts_at: "2026-10-10T11:00:00Z" }), // 14:00
      ],
      opts,
    );
    expect(r.topServices[0]).toEqual({ name: "Saç kesimi", count: 3 });
    expect(r.byHour[10].count).toBe(2);
    expect(r.byHour[14].count).toBe(1);
    expect(r.byResource).toEqual([
      { id: "r1", name: "Ali", count: 2 },
      { id: "r2", name: "Ayşe", count: 1 },
    ]);
  });
});
