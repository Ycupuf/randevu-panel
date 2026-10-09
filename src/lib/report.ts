import { minutesOfDay } from "./calendar";
import { addDays, localDateString } from "./time";

// Rapor hesapları: veritabanından bağımsız, saf işlevler (test edilebilir).

export type ReportAppointment = {
  status: string;
  starts_at: string;
  resource_id: string;
  appointment_items: { name: string; price_cents: number | null }[];
};

export type Report = {
  total: number; // iptaller hariç
  completed: number;
  noShow: number;
  cancelled: number;
  upcoming: number; // henüz gerçekleşmemiş (bekleyen + onaylı)
  noShowRate: number; // gelmedi / (tamamlandı + gelmedi)
  revenueCents: number; // yalnızca tamamlanan randevuların fiyatı belli kalemleri
  unpricedItems: number; // tamamlananlarda fiyatı sorulacak kalem sayısı
  byDay: { date: string; count: number }[];
  topServices: { name: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byResource: { id: string; name: string; count: number }[];
};

type Options = { timeZone: string; toDate: string; days: number; resourceNames: Record<string, string>; nowMs: number };

/** `toDate` dahil, geriye `days` günlük raporu hesaplar. Aralık dışı randevular yok sayılır. */
export function buildReport(appointments: ReportAppointment[], { timeZone, toDate, days, resourceNames, nowMs }: Options): Report {
  const dates = Array.from({ length: days }, (_, i) => addDays(toDate, i - (days - 1)));
  const dayCounts = new Map(dates.map((d) => [d, 0]));
  const hourCounts = new Array<number>(24).fill(0);
  const serviceCounts = new Map<string, number>();
  const resourceCounts = new Map<string, number>();

  let completed = 0;
  let noShow = 0;
  let cancelled = 0;
  let upcoming = 0;
  let revenueCents = 0;
  let unpricedItems = 0;

  for (const a of appointments) {
    const date = localDateString(new Date(a.starts_at), timeZone);
    if (!dayCounts.has(date)) continue;

    if (a.status === "cancelled") {
      cancelled++;
      continue;
    }
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
    hourCounts[Math.floor(minutesOfDay(a.starts_at, timeZone) / 60)]++;
    resourceCounts.set(a.resource_id, (resourceCounts.get(a.resource_id) ?? 0) + 1);
    for (const item of a.appointment_items) serviceCounts.set(item.name, (serviceCounts.get(item.name) ?? 0) + 1);

    if (a.status === "completed") {
      completed++;
      for (const item of a.appointment_items) {
        if (item.price_cents == null) unpricedItems++;
        else revenueCents += item.price_cents;
      }
    } else if (a.status === "no_show") noShow++;
    else if (new Date(a.starts_at).getTime() > nowMs) upcoming++;
  }

  const attended = completed + noShow;
  const byDay = dates.map((date) => ({ date, count: dayCounts.get(date) ?? 0 }));
  return {
    total: byDay.reduce((s, d) => s + d.count, 0),
    completed,
    noShow,
    cancelled,
    upcoming,
    noShowRate: attended ? noShow / attended : 0,
    revenueCents,
    unpricedItems,
    byDay,
    topServices: [...serviceCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"))
      .slice(0, 5),
    byHour: hourCounts.map((count, hour) => ({ hour, count })),
    byResource: [...resourceCounts]
      .map(([id, count]) => ({ id, name: resourceNames[id] ?? "Silinmiş", count }))
      .sort((a, b) => b.count - a.count),
  };
}
