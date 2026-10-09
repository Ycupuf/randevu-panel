import Link from "next/link";
import { sectorLabel } from "@/lib/format";
import { requireUser } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export default async function HomePage() {
  await requireUser("/");
  const supabase = await createClient();
  const { data: businesses } = await supabase.from("businesses").select("id, name, slug, sector, published, city").order("created_at");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">İşletmelerim</h1>
        <Link href="/yeni" className="btn btn-primary">
          Yeni işletme
        </Link>
      </div>
      {!businesses?.length ? (
        <div className="card mt-6 text-center">
          <p className="font-medium">Henüz işletmen yok</p>
          <p className="mt-1 text-sm text-muted">Sektörünü seç, hazır hizmet şablonuyla birkaç dakikada yayına al.</p>
          <Link href="/yeni" className="btn btn-primary mt-4">
            İlk işletmeni oluştur
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <li key={b.id} className="card flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold">{b.name}</h2>
                <p className="text-sm text-muted">
                  {sectorLabel(b.sector)}
                  {b.city ? ` · ${b.city}` : ""}
                </p>
                <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${b.published ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                  {b.published ? "Yayında" : "Yayında değil"}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/${b.slug}/takvim`} className="btn btn-primary">
                  Paneli aç
                </Link>
                <a href={`${env.NEXT_PUBLIC_CUSTOMER_URL}/${b.slug}`} target="_blank" rel="noreferrer" className="btn">
                  Müşteri sayfası
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
