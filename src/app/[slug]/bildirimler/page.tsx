import type { Metadata } from "next";
import { NotificationsView } from "@/components/NotificationsView";
import { loadBusiness } from "@/lib/panel";
import { toNotificationRow } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bildirimler" };

export default async function NotificationsPage({ params }: PageProps<"/[slug]/bildirimler">) {
  const { slug } = await params;
  const { business } = await loadBusiness(slug);
  const supabase = await createClient();

  // RLS: sahip işletmenin hepsini, personel yalnızca kendi kaynağını ilgilendirenleri görür.
  // notification_reads yalnızca oturumdaki kullanıcının kayıtlarını döndürür (boş = okunmamış).
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, created_at, data, customers(full_name, phone, email), appointments(status, starts_at, ends_at, note, cancel_reason, resources(name), customers(full_name, phone, email), appointment_items(name)), notification_reads(user_id)",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotificationsView
      businessId={business.id}
      slug={business.slug}
      timeZone={business.timezone}
      notifications={(data ?? []).map((n) => toNotificationRow(n as unknown as Parameters<typeof toNotificationRow>[0]))}
    />
  );
}
