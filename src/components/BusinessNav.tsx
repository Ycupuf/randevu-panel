"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "takvim", label: "Takvim" },
  { href: "musteriler", label: "Müşteriler" },
  { href: "hizmetler", label: "Hizmetler" },
  { href: "ekip", label: "Ekip ve saatler" },
  { href: "rapor", label: "Rapor" },
  { href: "ayarlar", label: "Ayarlar" },
];

export function BusinessNav({ slug }: { slug: string }) {
  const pathname = usePathname();
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
