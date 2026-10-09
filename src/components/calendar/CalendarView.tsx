"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { blockStyle, dayRange, HOUR_HEIGHT, visibleHours } from "@/lib/calendar";
import { useCalendarUi } from "@/lib/calendar-store";
import { formatDateOnlyLong, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import { addDays } from "@/lib/time";
import { AppointmentDialog } from "./AppointmentDialog";
import { ManualBookingDialog } from "./ManualBookingDialog";
import { STATUS_CLASS, STATUS_LABEL, type CalendarAppointment, type ResourceLite, type ServiceLite } from "./types";

type Props = {
  businessId: string;
  timeZone: string;
  today: string;
  initialDate: string;
  resourceLabel: string;
  fieldLabels: Record<string, string>;
  resources: ResourceLite[];
  services: ServiceLite[];
};

export function CalendarView({ businessId, timeZone, today, initialDate, resourceLabel, fieldLabels, resources, services }: Props) {
  const { date: storedDate, base, selectedId, setDate: storeDate, select, manualOpen, setManualOpen } = useCalendarUi();
  // Kullanıcının seçtiği gün yalnızca aynı başlangıç gününe aitse geçerlidir; ?tarih= ile başka gün istenirse o gün gösterilir.
  const date = storedDate && base === initialDate ? storedDate : initialDate;
  const setDate = (d: string) => storeDate(d, initialDate);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["appointments", businessId, date],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { from, to } = dayRange(date, timeZone);
      const { data, error } = await createClient()
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, source, resource_id, note, field_answers, customers(full_name, phone, email), appointment_items(name, duration_min, price_cents)",
        )
        .eq("business_id", businessId)
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as unknown as CalendarAppointment[];
    },
  });

  const appointments = useMemo(() => data ?? [], [data]);
  const active = appointments.filter((a) => a.status !== "cancelled");
  const { startHour, endHour } = visibleHours(
    active.map((a) => ({ id: a.id, startsAt: a.starts_at, endsAt: a.ends_at })),
    timeZone,
  );
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const pending = appointments.filter((a) => a.status === "pending");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={() => setDate(addDays(date, -1))} aria-label="Önceki gün">←</button>
        <input
          type="date"
          aria-label="Tarih"
          className="input w-auto"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => setDate(addDays(date, 1))} aria-label="Sonraki gün">→</button>
        <button type="button" className="btn" onClick={() => setDate(today)}>Bugün</button>
        <button type="button" className="btn btn-primary ml-auto" onClick={() => setManualOpen(true)} disabled={!resources.length || !services.length}>
          Randevu ekle
        </button>
      </div>
      <h2 className="mt-4 text-lg font-semibold">{formatDateOnlyLong(date)}</h2>

      {pending.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100" role="status">
          {pending.length} randevu onayını bekliyor:{" "}
          {pending.map((a) => (
            <button key={a.id} type="button" className="mr-2 underline" onClick={() => select(a.id)}>
              {formatTime(a.starts_at, timeZone)} {a.customers?.full_name}
            </button>
          ))}
        </div>
      )}

      {!resources.length ? (
        <p className="card mt-4 text-muted">Takvimin görünmesi için önce ekip üyesi ekle ve çalışma saatlerini gir.</p>
      ) : isError ? (
        <p role="alert" className="card mt-4 text-danger">
          Randevular yüklenemedi.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Tekrar dene</button>
        </p>
      ) : (
        <div className="card mt-4 overflow-x-auto p-0 sm:p-0" aria-busy={isPending}>
          <div className="grid min-w-max" style={{ gridTemplateColumns: `3.5rem repeat(${resources.length}, minmax(10rem, 1fr))` }}>
            <div className="border-b border-border" />
            {resources.map((r) => (
              <div key={r.id} className="border-b border-l border-border px-3 py-2 text-sm font-medium">
                {r.name}
                <span className="block text-xs font-normal text-muted">{resourceLabel}</span>
              </div>
            ))}

            <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-2 text-xs text-muted" style={{ top: i * HOUR_HEIGHT }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {resources.map((r) => (
              <div key={r.id} className="relative border-l border-border" style={{ height: hours.length * HOUR_HEIGHT }}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: i * HOUR_HEIGHT }} />
                ))}
                {active
                  .filter((a) => a.resource_id === r.id)
                  .map((a) => {
                    const pos = blockStyle({ id: a.id, startsAt: a.starts_at, endsAt: a.ends_at }, startHour, timeZone);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => select(a.id)}
                        className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm focus-visible:outline-2 focus-visible:outline-accent ${STATUS_CLASS[a.status]}`}
                        style={{ top: pos.top, height: pos.height }}
                        aria-label={`${formatTime(a.starts_at, timeZone)} ${a.customers?.full_name ?? ""}, ${STATUS_LABEL[a.status]}`}
                      >
                        <span className="block font-medium">
                          {formatTime(a.starts_at, timeZone)} {a.customers?.full_name}
                        </span>
                        <span className="block truncate">{a.appointment_items.map((i) => i.name).join(", ")}</span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPending && !isError && appointments.length === 0 && resources.length > 0 && (
        <p className="mt-3 text-sm text-muted">Bu gün için randevu yok.</p>
      )}

      {selected && (
        <AppointmentDialog
          key={selected.id}
          appointment={selected}
          timeZone={timeZone}
          resources={resources}
          fieldLabels={fieldLabels}
          onClose={() => select(null)}
        />
      )}
      {manualOpen && (
        <ManualBookingDialog
          businessId={businessId}
          timeZone={timeZone}
          date={date}
          resources={resources}
          services={services}
          onClose={() => setManualOpen(false)}
        />
      )}
    </div>
  );
}
