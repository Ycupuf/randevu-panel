import type { Metadata } from "next";
import Link from "next/link";
import { BarChart, HBars } from "@/components/Charts";
import { now } from "@/lib/clock";
import { formatDayMonth, formatPrice } from "@/lib/format";
import { loadBusiness } from "@/lib/panel";
import { buildReport } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import { addDays, localDateString, zonedInstant } from "@/lib/time";

export const metadata: Metadata = { title: "Rapor" };

const RANGES = [7, 30, 90] as const;

export default async function ReportPage({ params, searchParams }: PageProps<"/[slug]/rapor">) {
  const { slug } = await params;
  const query = await searchParams;
  const days = RANGES.find((d) => String(d) === query.gun) ?? 30;

  const { business } = await loadBusiness(slug);
  const tz = business.timezone;
  const current = now();
  const toDate = localDateString(current, tz);
  const from = zonedInstant(addDays(toDate, -(days - 1)), "00:00", tz);
  const to = zonedInstant(addDays(toDate, 1), "00:00", tz);

  const supabase = await createClient();
  // Supabase API tek istekte en fazla 1000 satır döndürür; 90 günlük rapor sessizce kesilmesin diye sayfalanır.
  const PAGE = 1000;
  const appointments: Parameters<typeof buildReport>[0] = [];
  for (let page = 0; page < 20; page++) {
    const { data } = await supabase
      .from("appointments")
      .select("status, starts_at, resource_id, appointment_items(name, price_cents)")
      .eq("business_id", business.id)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at")
      .order("id")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (!data) break;
    appointments.push(...data);
    if (data.length < PAGE) break;
  }
  const { data: resources } = await supabase.from("resources").select("id, name").eq("business_id", business.id);

  const report = buildReport(appointments, {
    timeZone: tz,
    toDate,
    days,
    resourceNames: Object.fromEntries((resources ?? []).map((r) => [r.id, r.name])),
    nowMs: current.getTime(),
  });

  const busyHours = report.byHour.filter((h) => h.count > 0);
  const stats = [
    { label: "Randevu", value: String(report.total) },
    { label: "Tamamlanan", value: String(report.completed) },
    { label: "Gelmeme oranı", value: `%${Math.round(report.noShowRate * 100)}` },
    { label: "İptal", value: String(report.cancelled) },
    { label: "Tahmini ciro", value: formatPrice(report.revenueCents) ?? "0 ₺", note: report.unpricedItems ? `+ ${report.unpricedItems} fiyatı sorulan kalem` : undefined },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Rapor</h2>
          <p className="text-sm text-muted">Son {days} gün · iptaller toplama girmez · ciro yalnızca &quot;tamamlandı&quot; işaretlenenlerden</p>
        </div>
        <nav aria-label="Rapor aralığı" className="flex gap-2">
          {RANGES.map((d) => (
            <Link key={d} href={`/${slug}/rapor?gun=${d}`} className="chip inline-flex items-center" aria-current={d === days ? "page" : undefined} scroll={false}>
              {d} gün
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card py-3">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="text-2xl font-semibold">{s.value}</dd>
            {s.note && <dd className="text-xs text-muted">{s.note}</dd>}
          </div>
        ))}
      </dl>

      <section className="card mt-5" aria-labelledby="daily">
        <h3 id="daily" className="font-semibold">Günlük randevu sayısı</h3>
        <BarChart
          label={`Son ${days} gün günlük randevu sayısı`}
          data={report.byDay.map((d) => ({ label: formatDayMonth(d.date), value: d.count }))}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card" aria-labelledby="top">
          <h3 id="top" className="font-semibold">Popüler hizmetler</h3>
          <HBars data={report.topServices.map((s) => ({ label: s.name, value: s.count }))} empty="Henüz veri yok" />
        </section>
        <section className="card" aria-labelledby="res">
          <h3 id="res" className="font-semibold">Ekip yoğunluğu</h3>
          <HBars data={report.byResource.map((r) => ({ label: r.name, value: r.count }))} empty="Henüz veri yok" />
        </section>
        <section className="card" aria-labelledby="hours">
          <h3 id="hours" className="font-semibold">En yoğun saatler</h3>
          <HBars
            data={[...busyHours].sort((a, b) => b.count - a.count).slice(0, 5).map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, value: h.count }))}
            empty="Henüz veri yok"
          />
        </section>
      </div>
    </div>
  );
}
