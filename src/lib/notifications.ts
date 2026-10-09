import { formatDateLong, formatPhoneTR, formatTime } from "./format";
import { localDateString } from "./time";

// Bildirim merkezi için saf yardımcılar: bir bildirim satırını başlığa, kısa bilgi satırlarına ve bağlantıya çevirir.
// Randevu/müşteri bilgisi veritabanından canlı okunur (bildirim satırında yalnızca olay ve ek veri durur).

/** "13 Ekim 2026 Salı, 14:00" */
function formatDateTime(iso: string, timeZone: string): string {
  return `${formatDateLong(iso, timeZone)}, ${formatTime(iso, timeZone)}`;
}

export type NotificationType = "appointment_new" | "appointment_cancelled" | "appointment_rescheduled" | "customer_registered";

type Person = { full_name: string; phone: string | null; email: string | null };

export type NotificationRow = {
  id: string;
  type: NotificationType;
  created_at: string;
  data: { previous_starts_at?: string; previous_resource_name?: string } | null;
  read: boolean;
  customer: Person | null;
  appointment: {
    status: string;
    starts_at: string;
    ends_at: string;
    note: string | null;
    cancel_reason: string | null;
    resourceName: string | null;
    customer: Person | null;
    services: string[];
  } | null;
};

export type NotificationView = {
  title: string;
  tone: "info" | "warning" | "danger" | "success";
  symbol: string;
  lines: { label: string; value: string }[];
  href: string; // panel içi bağlantı
  linkLabel: string;
};

export const TYPE_LABEL: Record<NotificationType, string> = {
  appointment_new: "Yeni randevu",
  appointment_cancelled: "İptal",
  appointment_rescheduled: "Saat değişikliği",
  customer_registered: "Yeni müşteri",
};

export function notificationView(n: NotificationRow, slug: string, timeZone: string): NotificationView {
  const person = n.appointment?.customer ?? n.customer;
  const lines: { label: string; value: string }[] = [];
  if (person) {
    lines.push({ label: "Müşteri", value: person.full_name });
    if (person.phone) lines.push({ label: "Telefon", value: formatPhoneTR(person.phone) });
    if (person.email) lines.push({ label: "E-posta", value: person.email });
  }

  if (n.type === "customer_registered") {
    lines.push({ label: "Kayıt", value: formatDateTime(n.created_at, timeZone) });
    return {
      title: "Yeni müşteri kaydoldu",
      tone: "success",
      symbol: "👤",
      lines,
      href: `/${slug}/musteriler`,
      linkLabel: "Müşterilere git",
    };
  }

  const a = n.appointment;
  if (a) {
    if (a.services.length) lines.push({ label: "Hizmet", value: a.services.join(", ") });
    lines.push({ label: "Zaman", value: formatDateTime(a.starts_at, timeZone) });
    if (a.resourceName) {
      const moved = n.type === "appointment_rescheduled" && n.data?.previous_resource_name;
      lines.push({ label: "Kiminle", value: moved ? `${a.resourceName} (önceden ${n.data?.previous_resource_name})` : a.resourceName });
    }
    if (n.type === "appointment_rescheduled" && n.data?.previous_starts_at) {
      lines.push({ label: "Önceki zaman", value: formatDateTime(n.data.previous_starts_at, timeZone) });
    }
    if (n.type === "appointment_cancelled" && a.cancel_reason) lines.push({ label: "İptal nedeni", value: a.cancel_reason });
    if (a.note) lines.push({ label: "Müşteri notu", value: a.note });
  }

  const date = a ? localDateString(new Date(a.starts_at), timeZone) : null;
  const href = date ? `/${slug}/takvim?tarih=${date}` : `/${slug}/takvim`;

  switch (n.type) {
    case "appointment_new":
      return {
        title: a?.status === "pending" ? "Onay bekleyen yeni randevu" : "Yeni randevu",
        tone: a?.status === "pending" ? "warning" : "info",
        symbol: "📅",
        lines,
        href,
        linkLabel: "Takvimde aç",
      };
    case "appointment_cancelled":
      return { title: "Müşteri randevusunu iptal etti", tone: "danger", symbol: "✕", lines, href, linkLabel: "Takvimde aç" };
    case "appointment_rescheduled":
      return {
        title: a?.status === "pending" ? "Saat değişti, onayını bekliyor" : "Müşteri randevu saatini değiştirdi",
        tone: a?.status === "pending" ? "warning" : "info",
        symbol: "↻",
        lines,
        href,
        linkLabel: "Takvimde aç",
      };
  }
}

/** Satır sayısı kadar okunmamış var mı? (rozet metni: 0 gizlenir, 99'dan fazlası "99+") */
export function badgeText(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

/** PostgREST'ten gelen satırı (iç içe ilişkilerle) NotificationRow'a düzleştirir. */
export function toNotificationRow(raw: {
  id: string;
  type: string;
  created_at: string;
  data: unknown;
  customers: Person | null;
  appointments: {
    status: string;
    starts_at: string;
    ends_at: string;
    note: string | null;
    cancel_reason: string | null;
    resources: { name: string } | null;
    customers: Person | null;
    appointment_items: { name: string }[];
  } | null;
  notification_reads: { user_id: string }[];
}): NotificationRow {
  const a = raw.appointments;
  return {
    id: raw.id,
    type: raw.type as NotificationType,
    created_at: raw.created_at,
    data: (raw.data ?? null) as NotificationRow["data"],
    read: raw.notification_reads.length > 0,
    customer: raw.customers,
    appointment: a
      ? {
          status: a.status,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          note: a.note,
          cancel_reason: a.cancel_reason,
          resourceName: a.resources?.name ?? null,
          customer: a.customers,
          services: a.appointment_items.map((i) => i.name),
        }
      : null,
  };
}
