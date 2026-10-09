import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/CalendarView";
import { now } from "@/lib/clock";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";
import { localDateString } from "@/lib/time";

export const metadata: Metadata = { title: "Takvim" };

export default async function CalendarPage({ params }: PageProps<"/[slug]/takvim">) {
  const { slug } = await params;
  const { business, settings } = await loadBusiness(slug);
  const supabase = await createClient();
  const [{ data: resources }, { data: services }] = await Promise.all([
    supabase.from("resources").select("id, name, kind").eq("business_id", business.id).eq("active", true).order("sort"),
    supabase
      .from("services")
      .select("id, name, duration_min, price_cents, service_variants(id, name, duration_min, price_cents, sort)")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort"),
  ]);

  return (
    <CalendarView
      businessId={business.id}
      timeZone={business.timezone}
      initialDate={localDateString(now(), business.timezone)}
      resourceLabel={settings.resource_label}
      resources={resources ?? []}
      services={(services ?? []).map((s) => ({
        ...s,
        service_variants: [...s.service_variants].sort((a, b) => a.sort - b.sort),
      }))}
    />
  );
}
