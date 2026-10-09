"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { translateDbError } from "@/lib/errors";
import { centsToTl, tlToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/browser";

type Service = Database["public"]["Tables"]["services"]["Row"] & {
  service_variants: Database["public"]["Tables"]["service_variants"]["Row"][];
};

const fieldsSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı").max(80),
  duration: z.coerce.number().int("Süre tam sayı olmalı").min(5, "En az 5 dakika").max(480, "En fazla 480 dakika"),
  buffer: z.coerce.number().int().min(0, "Eksi olamaz").max(120, "En fazla 120 dakika"),
});

export function ServicesManager({ businessId, canEdit, services }: { businessId: string; canEdit: boolean; services: Service[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => PromiseLike<{ error: { message?: string | null } | null }>) {
    setError(null);
    const { error } = await action();
    if (error) {
      setError(translateDbError(error).message);
      return false;
    }
    router.refresh();
    return true;
  }

  const nextSort = services.reduce((m, s) => Math.max(m, s.sort), 0) + 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Hizmetler</h2>
          <p className="text-sm text-muted">
            Süre, hazırlık payı ve fiyat randevu saatlerini belirler. Fiyatı boş bırakırsan müşteriye &quot;fiyat sorulur&quot; gösterilir.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              run(() =>
                createClient().from("services").insert({ business_id: businessId, name: "Yeni hizmet", duration_min: 30, sort: nextSort }),
              )
            }
          >
            Hizmet ekle
          </button>
        )}
      </div>
      {!canEdit && <p className="mt-3 rounded-lg bg-accent-soft p-3 text-sm">Hizmetleri yalnızca işletme sahibi değiştirebilir.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      <ul className="mt-5 grid gap-4">
        {services.map((s) => (
          <ServiceCard key={`${s.id}-${s.sort}-${s.name}-${s.duration_min}-${s.price_cents}-${s.buffer_after_min}-${s.active}`} service={s} canEdit={canEdit} run={run} />
        ))}
        {services.length === 0 && <li className="card text-muted">Henüz hizmet yok.</li>}
      </ul>
    </div>
  );
}

type Run = (action: () => PromiseLike<{ error: { message?: string | null } | null }>) => Promise<boolean>;

function ServiceCard({ service: s, canEdit, run }: { service: Service; canEdit: boolean; run: Run }) {
  const [name, setName] = useState(s.name);
  const [duration, setDuration] = useState(String(s.duration_min));
  const [buffer, setBuffer] = useState(String(s.buffer_after_min));
  const [price, setPrice] = useState(centsToTl(s.price_cents));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasVariants = s.service_variants.length > 0;

  async function save() {
    const parsed = fieldsSchema.safeParse({ name, duration, buffer });
    const cents = tlToCents(price);
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    if (cents === undefined) next.price = "Fiyatı 350 ya da 350,50 gibi yaz";
    setErrors(next);
    if (!parsed.success || cents === undefined) return;
    await run(() =>
      createClient()
        .from("services")
        .update({ name: parsed.data.name, duration_min: parsed.data.duration, buffer_after_min: parsed.data.buffer, price_cents: hasVariants ? null : cents })
        .eq("id", s.id),
    );
  }

  const id = (f: string) => `svc-${s.id}-${f}`;

  return (
    <li className={`card grid gap-4 ${s.active ? "" : "opacity-70"}`}>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <label htmlFor={id("name")} className="label">Ad</label>
          <input id={id("name")} className="input" value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={id("dur")} className="label">Süre (dk)</label>
          <input id={id("dur")} className="input" inputMode="numeric" value={duration} disabled={!canEdit} onChange={(e) => setDuration(e.target.value)} />
          {errors.duration && <p className="field-error" role="alert">{errors.duration}</p>}
        </div>
        <div>
          <label htmlFor={id("buf")} className="label">Hazırlık payı (dk)</label>
          <input id={id("buf")} className="input" inputMode="numeric" value={buffer} disabled={!canEdit} onChange={(e) => setBuffer(e.target.value)} />
          {errors.buffer && <p className="field-error" role="alert">{errors.buffer}</p>}
        </div>
        <div>
          <label htmlFor={id("price")} className="label">Fiyat (₺)</label>
          <input
            id={id("price")}
            className="input"
            inputMode="decimal"
            value={hasVariants ? "" : price}
            placeholder={hasVariants ? "Seçeneklerde" : "Sorulur"}
            disabled={!canEdit || hasVariants}
            onChange={(e) => setPrice(e.target.value)}
          />
          {errors.price && <p className="field-error" role="alert">{errors.price}</p>}
        </div>
      </div>

      {hasVariants && (
        <div>
          <p className="label">Seçenekler (örn. araç tipi)</p>
          <ul className="grid gap-2">
            {s.service_variants.map((v) => (
              <VariantRow key={`${v.id}-${v.name}-${v.duration_min}-${v.price_cents}`} variant={v} canEdit={canEdit} run={run} />
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={save}>Kaydet</button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              run(() =>
                createClient().from("service_variants").insert({
                  service_id: s.id,
                  name: "Yeni seçenek",
                  duration_min: s.duration_min,
                  price_cents: s.price_cents,
                  sort: s.service_variants.reduce((m, v) => Math.max(m, v.sort), 0) + 1,
                }),
              )
            }
          >
            Seçenek ekle
          </button>
          <button type="button" className="btn" onClick={() => run(() => createClient().from("services").update({ active: !s.active }).eq("id", s.id))}>
            {s.active ? "Pasif yap" : "Aktif yap"}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`"${s.name}" silinsin mi? Geçmiş randevulardaki kayıt adı korunur.`)) {
                void run(() => createClient().from("services").delete().eq("id", s.id));
              }
            }}
          >
            Sil
          </button>
          {!s.active && <span className="self-center text-sm text-muted">Pasif: müşteriler göremez</span>}
        </div>
      )}
    </li>
  );
}

function VariantRow({ variant: v, canEdit, run }: { variant: Service["service_variants"][number]; canEdit: boolean; run: Run }) {
  const [name, setName] = useState(v.name);
  const [duration, setDuration] = useState(String(v.duration_min));
  const [price, setPrice] = useState(centsToTl(v.price_cents));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = z.object({ name: z.string().trim().min(1).max(60), duration: z.coerce.number().int().min(5).max(480) }).safeParse({ name, duration });
    const cents = tlToCents(price);
    if (!parsed.success || cents === undefined) {
      setError("Ad, süre (5-480 dk) ve fiyatı kontrol et");
      return;
    }
    setError(null);
    await run(() => createClient().from("service_variants").update({ name: parsed.data.name, duration_min: parsed.data.duration, price_cents: cents }).eq("id", v.id));
  }

  return (
    <li className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
      <input aria-label="Seçenek adı" className="input" value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
      <input aria-label="Seçenek süresi (dk)" className="input" inputMode="numeric" value={duration} disabled={!canEdit} onChange={(e) => setDuration(e.target.value)} />
      <input aria-label="Seçenek fiyatı (₺)" className="input" inputMode="decimal" placeholder="Sorulur" value={price} disabled={!canEdit} onChange={(e) => setPrice(e.target.value)} />
      {canEdit && (
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={save}>Kaydet</button>
          <button type="button" className="btn btn-danger" onClick={() => run(() => createClient().from("service_variants").delete().eq("id", v.id))} aria-label={`${v.name} seçeneğini sil`}>
            ✕
          </button>
        </div>
      )}
      {error && <p className="field-error sm:col-span-4" role="alert">{error}</p>}
    </li>
  );
}
