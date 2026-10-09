import { describe, expect, it } from "vitest";
import { badgeText, notificationView, toNotificationRow, type NotificationRow } from "./notifications";

const TZ = "Europe/Istanbul";
const person = { full_name: "Ayşe Yılmaz", phone: "+905551234567", email: "ayse@example.com" };

function row(partial: Partial<NotificationRow> & { type: NotificationRow["type"] }): NotificationRow {
  return {
    id: "n1",
    created_at: "2026-10-09T10:00:00Z",
    data: null,
    read: false,
    customer: person,
    appointment: {
      status: "confirmed",
      starts_at: "2026-10-13T11:00:00Z", // İstanbul 14:00
      ends_at: "2026-10-13T11:30:00Z",
      note: null,
      cancel_reason: null,
      resourceName: "Ali",
      customer: person,
      services: ["Saç kesimi"],
    },
    ...partial,
  };
}

describe("notificationView", () => {
  it("yeni randevu: müşteri bilgisi, hizmet, zaman ve takvim bağlantısı", () => {
    const v = notificationView(row({ type: "appointment_new" }), "demo-berber", TZ);
    expect(v.title).toBe("Yeni randevu");
    expect(v.tone).toBe("info");
    expect(v.lines).toContainEqual({ label: "Müşteri", value: "Ayşe Yılmaz" });
    expect(v.lines).toContainEqual({ label: "E-posta", value: "ayse@example.com" });
    expect(v.lines).toContainEqual({ label: "Hizmet", value: "Saç kesimi" });
    expect(v.lines).toContainEqual({ label: "Zaman", value: expect.stringContaining("14:00") });
    expect(v.href).toBe("/demo-berber/takvim?tarih=2026-10-13");
  });

  it("onay bekleyen randevu uyarı tonuyla gelir", () => {
    const base = row({ type: "appointment_new" });
    const v = notificationView({ ...base, appointment: { ...base.appointment!, status: "pending" } }, "x", TZ);
    expect(v.title).toBe("Onay bekleyen yeni randevu");
    expect(v.tone).toBe("warning");
  });

  it("iptal: nedeni gösterir", () => {
    const base = row({ type: "appointment_cancelled" });
    const v = notificationView({ ...base, appointment: { ...base.appointment!, status: "cancelled", cancel_reason: "Hastayım" } }, "x", TZ);
    expect(v.title).toBe("Müşteri randevusunu iptal etti");
    expect(v.tone).toBe("danger");
    expect(v.lines).toContainEqual({ label: "İptal nedeni", value: "Hastayım" });
  });

  it("iptal nedeni yalnızca iptal bildiriminde görünür", () => {
    const base = row({ type: "appointment_new" });
    const v = notificationView({ ...base, appointment: { ...base.appointment!, cancel_reason: "x" } }, "x", TZ);
    expect(v.lines.some((l) => l.label === "İptal nedeni")).toBe(false);
  });

  it("saat değişikliği: önceki zaman ve kişi değiştiyse önceki kişi", () => {
    const v = notificationView(
      row({ type: "appointment_rescheduled", data: { previous_starts_at: "2026-10-12T07:00:00Z", previous_resource_name: "Burak" } }),
      "x",
      TZ,
    );
    expect(v.lines).toContainEqual({ label: "Kiminle", value: "Ali (önceden Burak)" });
    expect(v.lines).toContainEqual({ label: "Önceki zaman", value: expect.stringContaining("10:00") });
  });

  it("kişi değişmediyse 'önceden' yazmaz", () => {
    const v = notificationView(row({ type: "appointment_rescheduled", data: { previous_starts_at: "2026-10-12T07:00:00Z" } }), "x", TZ);
    expect(v.lines).toContainEqual({ label: "Kiminle", value: "Ali" });
  });

  it("yeni müşteri: randevu olmadan, müşteriler sayfasına gider", () => {
    const v = notificationView(row({ type: "customer_registered", appointment: null }), "demo-berber", TZ);
    expect(v.title).toBe("Yeni müşteri kaydoldu");
    expect(v.tone).toBe("success");
    expect(v.href).toBe("/demo-berber/musteriler");
    expect(v.lines.map((l) => l.label)).toEqual(["Müşteri", "Telefon", "E-posta", "Kayıt"]);
  });

  it("telefon ve e-posta yoksa satır eklenmez", () => {
    const v = notificationView(row({ type: "customer_registered", appointment: null, customer: { full_name: "Ali", phone: null, email: null } }), "x", TZ);
    expect(v.lines.map((l) => l.label)).toEqual(["Müşteri", "Kayıt"]);
  });
});

describe("badgeText", () => {
  it("0 gizlenir, 99'dan fazlası 99+ olur", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-1)).toBeNull();
    expect(badgeText(3)).toBe("3");
    expect(badgeText(100)).toBe("99+");
  });
});

describe("toNotificationRow", () => {
  it("okundu bilgisini ve iç içe ilişkileri düzleştirir", () => {
    const r = toNotificationRow({
      id: "n1",
      type: "appointment_new",
      created_at: "2026-10-09T10:00:00Z",
      data: {},
      customers: person,
      appointments: {
        status: "confirmed", starts_at: "a", ends_at: "b", note: null, cancel_reason: null,
        resources: { name: "Ali" }, customers: person, appointment_items: [{ name: "Saç kesimi" }, { name: "Sakal" }],
      },
      notification_reads: [{ user_id: "u" }],
    });
    expect(r.read).toBe(true);
    expect(r.appointment?.resourceName).toBe("Ali");
    expect(r.appointment?.services).toEqual(["Saç kesimi", "Sakal"]);
  });

  it("randevusuz bildirimde appointment null olur, okunmamıştır", () => {
    const r = toNotificationRow({ id: "n2", type: "customer_registered", created_at: "x", data: null, customers: person, appointments: null, notification_reads: [] });
    expect(r.appointment).toBeNull();
    expect(r.read).toBe(false);
  });
});
