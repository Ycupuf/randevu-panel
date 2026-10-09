import type { Metadata } from "next";
import { ServicesManager } from "@/components/ServicesManager";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hizmetler" };

export default async function ServicesPage({ params }: PageProps<"/[slug]/hizmetler">) {
  const { slug } = await params;
  const { business, role } = await loadBusiness(slug);
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*, service_variants(*)")
    .eq("business_id", business.id)
    .order("sort");

  return (
    <ServicesManager
      businessId={business.id}
      canEdit={role === "owner"}
      services={(services ?? []).map((s) => ({
        ...s,
        service_variants: [...s.service_variants].sort((a, b) => a.sort - b.sort),
      }))}
    />
  );
}
