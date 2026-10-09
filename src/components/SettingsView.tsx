"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import type { Business, Settings } from "@/lib/panel";
import type { Database } from "@/lib/database.types";
import { translateDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";

type Field = Database["public"]["Tables"]["booking_fields"]["Row"];
type Run = (action: () => PromiseLike<{ error: { message?: string | null } | null }>) => Promise<boolean>;

type Props = {
  business: Business;
  settings: Settings;
  fields: Field[];
  canEdit: boolean;
  publicUrl: string;
  qrDataUrl: string;
  readyToPublish: boolean;
};

const NOTICE = [
  [0, "Anında"], [30, "30 dakika"], [60, "1 saat"], [120, "2 saat"], [240, "4 saat"], [1440, "1 gün"],
] as const;
const CANCEL = [
  [0, "Her zaman"], [60, "1 saat kala"], [120, "2 saat kala"], [360, "6 saat kala"], [1440, "1 gün kala"],
] as const;
const HORIZON = [7, 14, 30, 60, 90] as const;
const STEPS = [5, 10, 15, 20, 30, 60] as const;

export function SettingsView({ business, settings, fields, canEdit, publicUrl, qrDataUrl, readyToPublish }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const run: Run = async (action) => {
    setMessage(null);
    const { error } = await action();
    if (error) {
      setMessage({ kind: "error", text: translateDbError(error).message });
      return false;
    }
    setMessage({ kind: "ok", text: "Kaydedildi" });
    router.refresh();
    return true;
  };

  return (
    <div className="grid max-w-3xl gap-8">
      {!canEdit && <p className="rounded-lg bg-accent-soft p-3 text-sm">Ayarları yalnızca işletme sahibi değiştirebilir.</p>}
      <div aria-live="polite">
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${message.kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
            {message.text}
          </p>
        )}
      </div>
      <PublishSection business={business} canEdit={canEdit} publicUrl={publicUrl} qrDataUrl={qrDataUrl} ready={readyToPublish} run={run} />
      <ProfileSection business={business} canEdit={canEdit} run={run} />
      <RulesSection settings={settings} canEdit={canEdit} run={run} />
      <FieldsSection businessId={business.id} fields={fields} canEdit={canEdit} run={run} />
    </div>
  );
}

function PublishSection({ business, canEdit, publicUrl, qrDataUrl, ready, run }: { business: Business; canEdit: boolean; publicUrl: string; qrDataUrl: string; ready: boolean; run: Run }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="card grid gap-4 sm:grid-cols-[1fr_auto]">
      <div>
        <h2 className="text-xl font-semibold">Yayın ve paylaşım</h2>
        <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-sm ${business.published ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {business.published ? "Yayında: müşteriler randevu alabilir" : "Yayında değil: müşteri sayfası görünmez"}
        </p>
        {!business.published && !ready && (
          <p className="mt-2 text-sm text-muted">Yayınlamadan önce en az bir ekip üyesine çalışma saati ve hizmet ata (Ekip ve saatler sekmesi).</p>
        )}
        <p className="mt-3 break-all text-sm">
          <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}
          </button>
          {canEdit && (
            <button
              type="button"
              className={`btn ${business.published ? "btn-danger" : "btn-primary"}`}
              disabled={!business.published && !ready}
              onClick={() => run(() => createClient().from("businesses").update({ published: !business.published }).eq("id", business.id))}
            >
              {business.published ? "Yayından kaldır" : "Yayına al"}
            </button>
          )}
        </div>
      </div>
      <div className="text-center">
        <Image src={qrDataUrl} alt={`${business.name} randevu sayfası QR kodu`} width={160} height={160} unoptimized className="rounded-lg border border-border bg-white p-1" />
        <a className="mt-2 inline-block text-sm underline" href={qrDataUrl} download={`${business.slug}-qr.png`}>QR kodu indir</a>
      </div>
    </section>
  );
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "İşletme adı en az 2 karakter olmalı").max(80),
  description: z.string().trim().max(500, "Açıklama en fazla 500 karakter"),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  city: z.string().trim().max(60),
});

function ProfileSection({ business, canEdit, run }: { business: Business; canEdit: boolean; run: Run }) {
  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    const v = parsed.data;
    await run(() =>
      createClient().from("businesses").update({ name: v.name, description: v.description || null, phone: v.phone || null, address: v.address || null, city: v.city || null }).eq("id", business.id),
    );
  }

  return (
    <form onSubmit={save} className="card grid gap-4" noValidate>
      <h2 className="text-xl font-semibold">İşletme bilgileri</h2>
      <div>
        <label htmlFor="pf-name" className="label">Ad</label>
        <input id="pf-name" className="input" value={form.name} disabled={!canEdit} onChange={set("name")} />
        {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="pf-desc" className="label">Kısa tanıtım</label>
        <textarea id="pf-desc" className="input min-h-24" value={form.description} disabled={!canEdit} onChange={set("description")} />
        {errors.description && <p className="field-error" role="alert">{errors.description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-phone" className="label">Telefon</label>
          <input id="pf-phone" className="input" inputMode="tel" value={form.phone} disabled={!canEdit} onChange={set("phone")} />
        </div>
        <div>
          <label htmlFor="pf-city" className="label">Şehir</label>
          <input id="pf-city" className="input" value={form.city} disabled={!canEdit} onChange={set("city")} />
        </div>
      </div>
      <div>
        <label htmlFor="pf-addr" className="label">Adres</label>
        <input id="pf-addr" className="input" value={form.address} disabled={!canEdit} onChange={set("address")} />
      </div>
      {canEdit && <button type="submit" className="btn btn-primary justify-self-start">Bilgileri kaydet</button>}
    </form>
  );
}

function RulesSection({ settings, canEdit, run }: { settings: Settings; canEdit: boolean; run: Run }) {
  const [s, setS] = useState({
    approval_mode: settings.approval_mode,
    resource_selection: settings.resource_selection,
    step_min: settings.step_min,
    min_notice_min: settings.min_notice_min,
    horizon_days: settings.horizon_days,
    cancel_window_min: settings.cancel_window_min,
    max_active_per_customer: settings.max_active_per_customer,
    resource_label: settings.resource_label,
  });
  const num = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setS((x) => ({ ...x, [k]: Number(e.target.value) }));

  return (
    <form
      className="card grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (s.resource_label.trim().length < 2) return;
        void run(() => createClient().from("business_settings").update({ ...s, resource_label: s.resource_label.trim() }).eq("business_id", settings.business_id));
      }}
    >
      <h2 className="text-xl font-semibold">Randevu kuralları</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rl-approval" className="label">Onay</label>
          <select id="rl-approval" className="input" value={s.approval_mode} disabled={!canEdit} onChange={(e) => setS((x) => ({ ...x, approval_mode: e.target.value as Settings["approval_mode"] }))}>
            <option value="auto">Otomatik onay</option>
            <option value="manual">Ben onaylarım</option>
          </select>
        </div>
        <div>
          <label htmlFor="rl-sel" className="label">Kişi / alan seçimi</label>
          <select id="rl-sel" className="input" value={s.resource_selection} disabled={!canEdit} onChange={(e) => setS((x) => ({ ...x, resource_selection: e.target.value as Settings["resource_selection"] }))}>
            <option value="customer">Müşteri seçer</option>
            <option value="any">Müşteri seçer ya da &quot;fark etmez&quot; der</option>
            <option value="auto">Otomatik atanır (örn. oto yıkama)</option>
          </select>
        </div>
        <div>
          <label htmlFor="rl-label" className="label">Ekip üyesine ne denir</label>
          <input id="rl-label" className="input" value={s.resource_label} disabled={!canEdit} maxLength={30} onChange={(e) => setS((x) => ({ ...x, resource_label: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="rl-step" className="label">Saat aralığı</label>
          <select id="rl-step" className="input" value={s.step_min} disabled={!canEdit} onChange={num("step_min")}>
            {STEPS.map((v) => <option key={v} value={v}>{v} dakikada bir</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rl-notice" className="label">En geç ne kadar önce alınır</label>
          <select id="rl-notice" className="input" value={s.min_notice_min} disabled={!canEdit} onChange={num("min_notice_min")}>
            {NOTICE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rl-horizon" className="label">En fazla ne kadar ileri</label>
          <select id="rl-horizon" className="input" value={s.horizon_days} disabled={!canEdit} onChange={num("horizon_days")}>
            {HORIZON.map((v) => <option key={v} value={v}>{v} gün</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rl-cancel" className="label">Müşteri iptal / değişiklik süresi</label>
          <select id="rl-cancel" className="input" value={s.cancel_window_min} disabled={!canEdit} onChange={num("cancel_window_min")}>
            {CANCEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rl-max" className="label">Müşteri başına aktif randevu</label>
          <select id="rl-max" className="input" value={s.max_active_per_customer} disabled={!canEdit} onChange={num("max_active_per_customer")}>
            {[1, 2, 3, 5, 10].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      {canEdit && <button type="submit" className="btn btn-primary justify-self-start">Kuralları kaydet</button>}
    </form>
  );
}

function FieldsSection({ businessId, fields, canEdit, run }: { businessId: string; fields: Field[]; canEdit: boolean; run: Run }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"text" | "textarea">("text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setError("Soru 2-80 karakter olmalı");
      return;
    }
    const base = trimmed.toLowerCase().replace(/[ıİ]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30) || "alan";
    let key = base;
    for (let n = 2; fields.some((f) => f.key === key); n++) key = `${base}_${n}`;
    setError(null);
    const ok = await run(() =>
      createClient().from("booking_fields").insert({ business_id: businessId, key, label: trimmed, field_type: type, required, sort: fields.reduce((m, f) => Math.max(m, f.sort), 0) + 1 }),
    );
    if (ok) {
      setLabel("");
      setRequired(false);
    }
  }

  return (
    <section className="card grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Randevu formundaki ek sorular</h2>
        <p className="text-sm text-muted">Örn. oto yıkamada araç plakası, güzellik merkezinde alerji notu. Müşteri randevu alırken doldurur.</p>
      </div>
      <ul className="grid gap-2">
        {fields.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
            <span>
              <span className="font-medium">{f.label}</span>{" "}
              <span className="text-muted">({f.field_type === "textarea" ? "uzun yazı" : "kısa yazı"}{f.required ? ", zorunlu" : ""})</span>
            </span>
            {canEdit && (
              <span className="flex gap-2">
                <button type="button" className="btn" onClick={() => run(() => createClient().from("booking_fields").update({ required: !f.required }).eq("id", f.id))}>
                  {f.required ? "İsteğe bağlı yap" : "Zorunlu yap"}
                </button>
                <button type="button" className="btn btn-danger" aria-label={`${f.label} sorusunu sil`} onClick={() => run(() => createClient().from("booking_fields").delete().eq("id", f.id))}>✕</button>
              </span>
            )}
          </li>
        ))}
        {fields.length === 0 && <li className="text-sm text-muted">Ek soru yok.</li>}
      </ul>
      {canEdit && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end" noValidate>
          <div>
            <label htmlFor="bf-label" className="label">Yeni soru</label>
            <input id="bf-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Araç plakası" />
          </div>
          <div>
            <label htmlFor="bf-type" className="label">Cevap türü</label>
            <select id="bf-type" className="input" value={type} onChange={(e) => setType(e.target.value as "text" | "textarea")}>
              <option value="text">Kısa yazı</option>
              <option value="textarea">Uzun yazı</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Zorunlu
          </label>
          <button type="submit" className="btn btn-primary">Ekle</button>
          {error && <p role="alert" className="field-error sm:col-span-4">{error}</p>}
        </form>
      )}
    </section>
  );
}
