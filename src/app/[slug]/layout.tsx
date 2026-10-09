import Link from "next/link";
import { BusinessNav } from "@/components/BusinessNav";
import { loadBusiness } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";
import { sectorLabel } from "@/lib/format";
import { env } from "@/lib/env";

export default async function BusinessLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const { business, role } = await loadBusiness(slug);

  // Kurulum kontrolü: yayına almadan önce en az bir ekip üyesi, çalışma saati ve hizmet ataması gerekir.
  const supabase = await createClient();
  const [{ data: resources }, { count: serviceCount }] = await Promise.all([
    supabase.from("resources").select("id, working_hours(id), resource_services(service_id)").eq("business_id", business.id).eq("active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("active", true),
  ]);
  const hasResource = (resources?.length ?? 0) > 0;
  const hasHours = (resources ?? []).some((r) => r.working_hours.length > 0);
  const hasAssignment = (resources ?? []).some((r) => r.resource_services.length > 0);
  const steps = [
    { done: (serviceCount ?? 0) > 0, label: "Hizmet ekle", href: `/${slug}/hizmetler` },
    { done: hasResource, label: "Ekip üyesi ekle", href: `/${slug}/ekip` },
    { done: hasHours, label: "Çalışma saatlerini gir", href: `/${slug}/ekip` },
    { done: hasAssignment, label: "Hizmetleri ekibe ata", href: `/${slug}/ekip` },
    { done: business.published, label: "Yayına al", href: `/${slug}/ayarlar` },
  ];
  const next = steps.find((s) => !s.done);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muted hover:underline">← İşletmelerim</Link>
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <p className="text-sm text-muted">
            {sectorLabel(business.sector)} · {role === "owner" ? "Sahip" : "Personel"}
          </p>
        </div>
        <a href={`${env.NEXT_PUBLIC_CUSTOMER_URL}/${business.slug}`} target="_blank" rel="noreferrer" className="btn">
          Müşteri sayfasını aç ↗
        </a>
      </div>
      {next && (
        <div className="mt-4 rounded-lg border border-accent bg-accent-soft p-3 text-sm" role="status">
          <p className="font-medium">Kurulum: {steps.filter((s) => s.done).length}/{steps.length} adım tamam</p>
          <p className="mt-1">
            Sıradaki adım: <Link href={next.href} className="font-medium underline">{next.label}</Link>
          </p>
        </div>
      )}
      <BusinessNav slug={slug} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
