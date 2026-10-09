"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { translateDbError } from "@/lib/errors";
import { slugify, validateSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

const SECTORS = [
  { value: "berber", label: "Kuaför / berber", hint: "Saç, sakal; personel seçilir" },
  { value: "guzellik", label: "Güzellik merkezi", hint: "Tırnak, cilt, lazer; uzman seçilir" },
  { value: "oto_yikama", label: "Oto yıkama", hint: "Araç tipine göre süre ve fiyat; bay otomatik atanır" },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "İşletme adı en az 2 karakter olmalı").max(80),
  sector: z.enum(["berber", "guzellik", "oto_yikama"]),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(60).optional(),
});

export function NewBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [sector, setSector] = useState<(typeof SECTORS)[number]["value"]>("berber");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ name, sector, phone: phone || undefined, city: city || undefined });
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    const slugCheck = validateSlug(effectiveSlug);
    if (!slugCheck.ok) next.slug = slugCheck.reason;
    setErrors(next);
    if (Object.keys(next).length || !parsed.success || !slugCheck.ok) return;

    setBusy(true);
    setFormError(null);
    const { error } = await createClient().rpc("create_business", {
      p_name: parsed.data.name,
      p_slug: slugCheck.slug,
      p_sector: parsed.data.sector,
      p_phone: parsed.data.phone,
      p_city: parsed.data.city,
    });
    setBusy(false);
    if (error) {
      const info = translateDbError(error);
      if (error.message.includes("slug_taken")) setErrors({ slug: "Bu adres alınmış, başka bir tane dene" });
      else setFormError(info.message);
      return;
    }
    router.push(`/${slugCheck.slug}/ekip`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 grid gap-5" noValidate>
      <fieldset>
        <legend className="label">Sektör</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {SECTORS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={sector === s.value}
              className="chip h-auto text-left"
              onClick={() => setSector(s.value)}
            >
              <span className="block font-medium">{s.label}</span>
              <span className="block text-xs text-muted">{s.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="nb-name" className="label">İşletme adı</label>
        <input id="nb-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
        {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="nb-slug" className="label">Müşteri sayfası adresi</label>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">{env.NEXT_PUBLIC_CUSTOMER_URL.replace(/^https?:\/\//, "")}/</span>
          <input
            id="nb-slug"
            className="input"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            aria-invalid={Boolean(errors.slug)}
          />
        </div>
        {errors.slug && <p className="field-error" role="alert">{errors.slug}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nb-phone" className="label">Telefon (isteğe bağlı)</label>
          <input id="nb-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label htmlFor="nb-city" className="label">Şehir (isteğe bağlı)</label>
          <input id="nb-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      {formError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{formError}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Oluşturuluyor…" : "İşletmeyi oluştur"}
      </button>
    </form>
  );
}
