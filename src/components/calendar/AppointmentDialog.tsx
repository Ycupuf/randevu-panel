"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { now } from "@/lib/clock";
import { translateDbError } from "@/lib/errors";
import { formatDateLong, formatDuration, formatPhoneTR, formatPrice, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import { localDateString, zonedInstant } from "@/lib/time";
import { Modal } from "./Modal";
import { STATUS_LABEL, type CalendarAppointment, type ResourceLite, type Status } from "./types";

type Props = {
  appointment: CalendarAppointment;
  timeZone: string;
  resources: ResourceLite[];
  fieldLabels: Record<string, string>;
  onClose: () => void;
};

const TRANSITIONS: Record<Status, { to: Status; label: string; danger?: boolean; needsPast?: boolean }[]> = {
  pending: [
    { to: "confirmed", label: "Onayla" },
    { to: "cancelled", label: "Reddet", danger: true },
  ],
  confirmed: [
    { to: "completed", label: "Tamamlandı", needsPast: true },
    { to: "no_show", label: "Gelmedi", needsPast: true },
    { to: "cancelled", label: "İptal et", danger: true },
  ],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function AppointmentDialog({ appointment: a, timeZone, resources, fieldLabels, onClose }: Props) {
  const queryClient = useQueryClient();
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(() => localDateString(new Date(a.starts_at), timeZone));
  const [time, setTime] = useState(() => formatTime(a.starts_at, timeZone));
  const [resourceId, setResourceId] = useState(a.resource_id);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => now().getTime());

  const started = new Date(a.starts_at).getTime() <= nowMs;
  const total = a.appointment_items.reduce((sum, i) => sum + (i.price_cents ?? 0), 0);
  const hasUnpriced = a.appointment_items.some((i) => i.price_cents == null);
  const minutes = a.appointment_items.reduce((sum, i) => sum + i.duration_min, 0);
  const resourceName = resources.find((r) => r.id === a.resource_id)?.name ?? "";
  const answers = Object.entries((a.field_answers ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v);

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    onClose();
  };
  const fail = (e: { message?: string | null }) => setError(translateDbError(e).message);

  const statusMutation = useMutation({
    mutationFn: async (status: Status) => {
      const { error } = await createClient().rpc("set_appointment_status", { p_id: a.id, p_status: status });
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!/^\d{2}:\d{2}$/.test(time) || !date) throw { message: "invalid_time" };
      const startsAt = zonedInstant(date, time, timeZone);
      const { error } = await createClient().rpc("reschedule_appointment", {
        p_id: a.id,
        p_new_starts_at: startsAt.toISOString(),
        p_resource_id: resourceId,
      });
      if (error) throw error;
    },
    onSuccess: done,
    onError: fail,
  });

  const busy = statusMutation.isPending || rescheduleMutation.isPending;
  const open = a.status === "pending" || a.status === "confirmed";

  return (
    <Modal title="Randevu ayrıntısı" onClose={onClose}>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted">Müşteri</dt>
          <dd className="font-medium">{a.customers?.full_name}</dd>
          {a.customers?.phone && (
            <dd>
              <a className="underline" href={`tel:${a.customers.phone}`}>{formatPhoneTR(a.customers.phone)}</a>
            </dd>
          )}
          {a.customers?.email && <dd className="text-muted">{a.customers.email}</dd>}
        </div>
        <div>
          <dt className="text-muted">Zaman</dt>
          <dd className="font-medium">
            {formatDateLong(a.starts_at, timeZone)} · {formatTime(a.starts_at, timeZone)}–{formatTime(a.ends_at, timeZone)}
          </dd>
          <dd className="text-muted">{resourceName} · {a.source === "manual" ? "Elle eklendi" : "Online"}</dd>
        </div>
        <div>
          <dt className="text-muted">Hizmetler ({formatDuration(minutes)})</dt>
          {a.appointment_items.map((i, idx) => (
            <dd key={idx}>
              {i.name} · {formatPrice(i.price_cents) ?? "Fiyat sorulur"}
            </dd>
          ))}
          {total > 0 && (
            <dd className="font-medium">
              Toplam: {formatPrice(total)}
              {hasUnpriced ? " + fiyatı sorulacaklar" : ""}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-muted">Durum</dt>
          <dd className="font-medium">{STATUS_LABEL[a.status]}</dd>
        </div>
        {answers.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{fieldLabels[k] ?? k}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
        {a.note && (
          <div>
            <dt className="text-muted">Müşteri notu</dt>
            <dd>{a.note}</dd>
          </div>
        )}
      </dl>

      {error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      {open && !rescheduling && (
        <div className="mt-5 flex flex-wrap gap-2">
          {TRANSITIONS[a.status].map((t) => (
            <button
              key={t.to}
              type="button"
              className={`btn ${t.danger ? "btn-danger" : t.to === "confirmed" ? "btn-primary" : ""}`}
              disabled={busy || (t.needsPast && !started)}
              title={t.needsPast && !started ? "Randevu zamanı gelmeden işaretlenemez" : undefined}
              onClick={() => {
                if (t.danger && !window.confirm("Randevu iptal edilsin mi?")) return;
                setError(null);
                statusMutation.mutate(t.to);
              }}
            >
              {t.label}
            </button>
          ))}
          <button type="button" className="btn" disabled={busy} onClick={() => setRescheduling(true)}>
            Saati değiştir
          </button>
        </div>
      )}

      {open && rescheduling && (
        <form
          className="mt-5 grid gap-3 rounded-lg border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            rescheduleMutation.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rs-date" className="label">Tarih</label>
              <input id="rs-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="rs-time" className="label">Saat</label>
              <input id="rs-time" type="time" step={300} className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div>
            <label htmlFor="rs-res" className="label">Kişi / alan</label>
            <select id="rs-res" className="input" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {rescheduleMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button type="button" className="btn" onClick={() => setRescheduling(false)}>Vazgeç</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
