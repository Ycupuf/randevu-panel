import type { Metadata } from "next";
import { TeamManager } from "@/components/TeamManager";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ekip ve saatler" };

export default async function TeamPage({ params }: PageProps<"/[slug]/ekip">) {
  const { slug } = await params;
  const { business, settings, role } = await loadBusiness(slug);
  const supabase = await createClient();
  const [{ data: resources }, { data: services }, { data: timeOff }] = await Promise.all([
    supabase
      .from("resources")
      .select("*, working_hours(weekday, start_time, end_time), resource_services(service_id)")
      .eq("business_id", business.id)
      .order("sort"),
    supabase.from("services").select("id, name").eq("business_id", business.id).eq("active", true).order("sort"),
    supabase.from("time_off").select("*").eq("business_id", business.id).gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);

  return (
    <TeamManager
      businessId={business.id}
      sector={business.sector}
      timeZone={business.timezone}
      resourceLabel={settings.resource_label}
      canEdit={role === "owner"}
      resources={resources ?? []}
      services={services ?? []}
      timeOff={timeOff ?? []}
    />
  );
}
