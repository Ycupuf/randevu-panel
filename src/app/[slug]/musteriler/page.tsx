import type { Metadata } from "next";
import { CustomersView } from "@/components/CustomersView";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Müşteriler" };

export default async function CustomersPage({ params }: PageProps<"/[slug]/musteriler">) {
  const { slug } = await params;
  const { business } = await loadBusiness(slug);
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, full_name, phone, email, user_id, created_at, customer_notes(note), appointments(status, starts_at)")
    .eq("business_id", business.id)
    .order("full_name");

  return (
    <CustomersView
      businessId={business.id}
      timeZone={business.timezone}
      customers={(customers ?? []).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        hasAccount: Boolean(c.user_id),
        note: c.customer_notes?.note ?? "",
        appointments: c.appointments,
      }))}
    />
  );
}
