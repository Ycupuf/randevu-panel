import type { Metadata } from "next";
import QRCode from "qrcode";
import { SettingsView } from "@/components/SettingsView";
import { env } from "@/lib/env";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage({ params }: PageProps<"/[slug]/ayarlar">) {
  const { slug } = await params;
  const { business, settings, role } = await loadBusiness(slug);
  const supabase = await createClient();
  const [{ data: fields }, { data: resources }] = await Promise.all([
    supabase.from("booking_fields").select("*").eq("business_id", business.id).order("sort"),
    supabase.from("resources").select("id, working_hours(id), resource_services(service_id)").eq("business_id", business.id).eq("active", true),
  ]);

  const publicUrl = `${env.NEXT_PUBLIC_CUSTOMER_URL}/${business.slug}`;
  const qr = await QRCode.toDataURL(publicUrl, { margin: 1, width: 240 });
  const ready = (resources ?? []).some((r) => r.working_hours.length > 0 && r.resource_services.length > 0);

  return (
    <SettingsView
      business={business}
      settings={settings}
      fields={fields ?? []}
      canEdit={role === "owner"}
      publicUrl={publicUrl}
      qrDataUrl={qr}
      readyToPublish={ready}
    />
  );
}
