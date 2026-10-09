"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { badgeText } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/browser";

const TABS = [
  { href: "takvim", label: "Takvim" },
  { href: "bildirimler", label: "Bildirimler" },
  { href: "musteriler", label: "Müşteriler" },
  { href: "hizmetler", label: "Hizmetler" },
  { href: "ekip", label: "Ekip ve saatler" },
  { href: "rapor", label: "Rapor" },
  { href: "ayarlar", label: "Ayarlar" },
];

export function BusinessNav({ slug, businessId, initialUnread }: { slug: string; businessId: string; initialUnread: number }) {
  const pathname = usePathname();
  // Okunmamış bildirim sayısı: sunucudan gelen değerle başlar, 30 saniyede bir ve pencereye dönünce yenilenir.
  const { data: unread = initialUnread } = useQuery({
    queryKey: ["unread", businessId],
    initialData: initialUnread,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await createClient().rpc("unread_notification_count", { p_business_id: businessId });
      if (error) throw error;
      return data ?? 0;
    },
  });
  return (
    <nav aria-label="İşletme bölümleri" className="mt-4 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {TABS.map((t) => {
          const href = `/${slug}/${t.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={t.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${
                  active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {t.href === "bildirimler" && badgeText(unread) && (
                  <span className="ml-2 rounded-full bg-danger px-1.5 py-0.5 text-xs font-semibold text-white" aria-label={`${unread} okunmamış bildirim`}>
                    {badgeText(unread)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
