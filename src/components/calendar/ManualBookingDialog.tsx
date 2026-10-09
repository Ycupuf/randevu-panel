"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { translateDbError } from "@/lib/errors";
import { formatDuration, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import { normalizePhoneTR } from "@/lib/phone";
import { zonedInstant } from "@/lib/time";
import { Modal } from "./Modal";
import type { ResourceLite, ServiceLite } from "./types";

const schema = z.object({
  name: z.string().trim().min(2, "Müşteri adı en az 2 karakter olmalı").max(80),
  // Boş olabilir; doluysa geçerli bir cep telefonu olmalı ve "+90..." biçimine çevrilir (müşteri sitesiyle aynı biçim)
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return "";
      const normalized = normalizePhoneTR(v);
      if (normalized === null) {
        ctx.addIssue({ code: "custom", message: "Geçerli bir cep telefonu gir (örn. 0532 123 45 67)" });
        return z.NEVER;
      }
      return normalized;
    }),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Saat seç"),
});

type Props = {
  businessId: string;
  timeZone: string;
  date: string;
  resources: ResourceLite[];
  services: ServiceLite[];
  onClose: () => void;
};

/** Telefonla ya da yüz yüze gelen randevuyu panelden girer. Çakışma ve saat kuralları yine veritabanında doğrulanır. */
export function ManualBookingDialog({ businessId, timeZone, date: initialDate, resources, services, onClose }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [variantId, setVariantId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const variants = service?.service_variants ?? [];
  const variant = variants.find((v) => v.id === variantId) ?? (variants.length ? variants[0] : undefined);

  const mutation = useMutation({
    mutationFn: async (input: { name: string; phone: string; startsAt: Date }) => {
      const supabase = createClient();
      // Aynı telefonla kayıtlı müşteri varsa onu kullan; yoksa hesapsız müşteri kaydı aç.
      let customerId: string | null = null;
      if (input.phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", input.phone)
          .limit(1)
          .maybeSingle();
        customerId = existing?.id ?? null;
      }
      if (!customerId) {
        const { data, error } = await supabase
          .from("customers")
          .insert({ business_id: businessId, full_name: input.name, phone: input.phone || null })
          .select("id")
          .single();
        if (error) throw error;
        customerId = data.id;
      }
      const { error } = await supabase.rpc("create_appointment", {
        p_business_id: businessId,
        p_customer_id: customerId,
        p_items: [{ service_id: serviceId, variant_id: variants.length ? variant?.id ?? null : null }],
        p_resource_id: resourceId,
        p_starts_at: input.startsAt.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (e: { message?: string | null }) => setFormError(translateDbError(e).message),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ name, phone, time });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate({ name: parsed.data.name, phone: parsed.data.phone, startsAt: zonedInstant(date, parsed.data.time, timeZone) });
  }

  return (
    <Modal title="Randevu ekle" onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div>
          <label htmlFor="mb-name" className="label">Müşteri adı</label>
          <input id="mb-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
          {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="mb-phone" className="label">Telefon (isteğe bağlı)</label>
          <input id="mb-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} />
          {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="mb-service" className="label">Hizmet</label>
          <select
            id="mb-service"
            className="input"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setVariantId("");
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {variants.length > 0 && (
          <div>
            <label htmlFor="mb-variant" className="label">Seçenek</label>
            <select id="mb-variant" className="input" value={variant?.id ?? ""} onChange={(e) => setVariantId(e.target.value)}>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {formatDuration(v.duration_min)} · {formatPrice(v.price_cents) ?? "Fiyat sorulur"}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="mb-res" className="label">Kişi / alan</label>
          <select id="mb-res" className="input" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mb-date" className="label">Tarih</label>
            <input id="mb-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="mb-time" className="label">Saat</label>
            <input id="mb-time" type="time" step={300} className="input" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={Boolean(errors.time)} />
            {errors.time && <p className="field-error" role="alert">{errors.time}</p>}
          </div>
        </div>
        {formError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Kaydediliyor…" : "Randevuyu ekle"}
        </button>
      </form>
    </Modal>
  );
}
