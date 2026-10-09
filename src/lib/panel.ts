import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Settings = Database["public"]["Tables"]["business_settings"]["Row"];
export type Role = Database["public"]["Enums"]["member_role"];

/** Giriş zorunlu sayfalar için: yoksa /giris'e yollar ve geri dönülecek yolu taşır. */
export async function requireUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * Slug'a göre işletmeyi, ayarlarını ve oturumdaki kullanıcının rolünü yükler.
 * RLS yalnızca üyesi olunan işletmeleri döndürdüğü için başkasının işletmesi "bulunamadı" olur
 * (varlığı bile sızmaz). `cache` aynı istekte layout + sayfa çağrılarını tek sorguya indirir.
 */
export const loadBusiness = cache(async (slug: string) => {
  const user = await requireUser(`/${slug}/takvim`);
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (!business) notFound();
  const [{ data: settings }, { data: member }] = await Promise.all([
    supabase.from("business_settings").select("*").eq("business_id", business.id).single(),
    supabase.from("business_members").select("role").eq("business_id", business.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!settings || !member) notFound();
  return { business, settings, role: member.role, user };
});
