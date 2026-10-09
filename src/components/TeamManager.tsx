"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Database } from "@/lib/database.types";
import { translateDbError } from "@/lib/errors";
import { formatDateShort, formatTime, weekdayName } from "@/lib/format";
import { copyDay, groupHours, validateWeek, WEEK_ORDER, weekToRows, weeklyHours, type Week } from "@/lib/hours";
import { createClient } from "@/lib/supabase/browser";
import { zonedInstant } from "@/lib/time";

type Resource = Database["public"]["Tables"]["resources"]["Row"] & {
  working_hours: { weekday: number; start_time: string; end_time: string }[];
  resource_services: { service_id: string }[];
};
type TimeOff = Database["public"]["Tables"]["time_off"]["Row"];
// <input type="time"> 24:00 gösteremez; mola sonrası yeni aralık makul bir bitişle başlar.
function nextInterval(start: string) {
  return { start, end: start < "18:00" ? "19:00" : "23:00" };
}

type Run = (action: () => PromiseLike<{ error: { message?: string | null } | null }>) => Promise<boolean>;

type Props = {
  businessId: string;
  sector: string;
  timeZone: string;
  resourceLabel: string;
  canEdit: boolean;
  resources: Resource[];
  services: { id: string; name: string }[];
  timeOff: TimeOff[];
};

export function TeamManager({ businessId, sector, timeZone, resourceLabel, canEdit, resources, services, timeOff }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const run: Run = async (action) => {
    setError(null);
    const { error } = await action();
    if (error) {
      setError(translateDbError(error).message);
      return false;
    }
    router.refresh();
    return true;
  };

  async function addResource(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2) {
      setError("Ad en az 2 karakter olmalı");
      return;
    }
    const ok = await run(() =>
      createClient().from("resources").insert({
        business_id: businessId,
        name,
        kind: sector === "oto_yikama" ? "bay" : "person",
        sort: resources.reduce((m, r) => Math.max(m, r.sort), 0) + 1,
      }),
    );
    if (ok) setNewName("");
  }

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="text-xl font-semibold">{resourceLabel} listesi</h2>
        <p className="text-sm text-muted">Her kişi ya da alanın kendi takvimi, çalışma saatleri ve yaptığı hizmetler vardır.</p>
        {!canEdit && <p className="mt-3 rounded-lg bg-accent-soft p-3 text-sm">Bu bölümü yalnızca işletme sahibi değiştirebilir.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {canEdit && (
          <form onSubmit={addResource} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="grow sm:max-w-xs">
              <label htmlFor="new-resource" className="label">Yeni {resourceLabel.toLowerCase()}</label>
              <input id="new-resource" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={sector === "oto_yikama" ? "Bay 1" : "Ad Soyad"} />
            </div>
            <button type="submit" className="btn btn-primary">Ekle</button>
          </form>
        )}
        <ul className="mt-5 grid gap-4">
          {resources.map((r) => (
            <ResourceCard key={`${r.id}-${r.name}-${r.active}`} resource={r} services={services} canEdit={canEdit} run={run} />
          ))}
          {resources.length === 0 && <li className="card text-muted">Henüz kimse yok. Yukarıdan ilk kişiyi ekle.</li>}
        </ul>
      </section>

      <TimeOffSection businessId={businessId} timeZone={timeZone} canEdit={canEdit} resources={resources} timeOff={timeOff} run={run} />
    </div>
  );
}

function ResourceCard({ resource: r, services, canEdit, run }: { resource: Resource; services: { id: string; name: string }[]; canEdit: boolean; run: Run }) {
  const [name, setName] = useState(r.name);
  const [week, setWeek] = useState<Week>(() => groupHours(r.working_hours));
  const [hoursError, setHoursError] = useState<string | null>(null);
  const assigned = new Set(r.resource_services.map((s) => s.service_id));

  async function saveHours() {
    const problem = validateWeek(week);
    if (problem) {
      setHoursError(`${weekdayName(problem.weekday)}: ${problem.message}`);
      return;
    }
    setHoursError(null);
    const supabase = createClient();
    const ok = await run(() => supabase.from("working_hours").delete().eq("resource_id", r.id));
    if (!ok) return;
    const rows = weekToRows(week).map((row) => ({ ...row, resource_id: r.id }));
    if (rows.length) await run(() => supabase.from("working_hours").insert(rows));
  }

  function setInterval(weekday: number, index: number, field: "start" | "end", value: string) {
    setWeek((w) => ({ ...w, [weekday]: w[weekday].map((i, k) => (k === index ? { ...i, [field]: value } : i)) }));
  }

  return (
    <li className={`card grid gap-5 ${r.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grow sm:max-w-xs">
          <label htmlFor={`rn-${r.id}`} className="label">Ad</label>
          <input id={`rn-${r.id}`} className="input" value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
        </div>
        {canEdit && (
          <>
            <button type="button" className="btn" disabled={name.trim().length < 2} onClick={() => run(() => createClient().from("resources").update({ name: name.trim() }).eq("id", r.id))}>
              Adı kaydet
            </button>
            <button type="button" className="btn" onClick={() => run(() => createClient().from("resources").update({ active: !r.active }).eq("id", r.id))}>
              {r.active ? "Pasif yap" : "Aktif yap"}
            </button>
          </>
        )}
      </div>

      <fieldset>
        <legend className="label">Yaptığı hizmetler</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              role="checkbox"
              aria-checked={assigned.has(s.id)}
              disabled={!canEdit}
              onClick={() =>
                run(() =>
                  assigned.has(s.id)
                    ? createClient().from("resource_services").delete().eq("resource_id", r.id).eq("service_id", s.id)
                    : createClient().from("resource_services").insert({ resource_id: r.id, service_id: s.id }),
                )
              }
            >
              {s.name}
            </button>
          ))}
          {services.length === 0 && <span className="text-sm text-muted">Önce Hizmetler sekmesinden hizmet ekle.</span>}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Haftalık çalışma saatleri ({weeklyHours(week)} saat)</legend>
        <div className="grid gap-2">
          {WEEK_ORDER.map((d) => (
            <div key={d} className="grid items-start gap-2 sm:grid-cols-[7rem_1fr]">
              <span className="pt-2 text-sm font-medium">{weekdayName(d)}</span>
              <div className="grid gap-2">
                {week[d].length === 0 && <span className="pt-2 text-sm text-muted">Kapalı</span>}
                {week[d].map((i, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-2">
                    <input aria-label={`${weekdayName(d)} başlangıç`} type="time" className="input w-auto" value={i.start} disabled={!canEdit} onChange={(e) => setInterval(d, k, "start", e.target.value)} />
                    <span aria-hidden>–</span>
                    <input aria-label={`${weekdayName(d)} bitiş`} type="time" className="input w-auto" value={i.end} disabled={!canEdit} onChange={(e) => setInterval(d, k, "end", e.target.value)} />
                    {canEdit && (
                      <button type="button" className="btn" aria-label={`${weekdayName(d)} aralığını sil`} onClick={() => setWeek((w) => ({ ...w, [d]: w[d].filter((_, j) => j !== k) }))}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn" onClick={() => setWeek((w) => ({ ...w, [d]: [...w[d], w[d].length ? nextInterval(w[d].at(-1)!.end) : { start: "09:00", end: "19:00" }] }))}>
                      {week[d].length ? "Aralık ekle (mola için böl)" : "Aç"}
                    </button>
                    <button type="button" className="btn" onClick={() => setWeek((w) => copyDay(w, d, WEEK_ORDER.filter((x) => x !== d)))}>
                      Tüm günlere kopyala
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {hoursError && <p role="alert" className="field-error">{hoursError}</p>}
        {canEdit && (
          <button type="button" className="btn btn-primary mt-3" onClick={saveHours}>Saatleri kaydet</button>
        )}
      </fieldset>
    </li>
  );
}

function TimeOffSection({ businessId, timeZone, canEdit, resources, timeOff, run }: { businessId: string; timeZone: string; canEdit: boolean; resources: Resource[]; timeOff: TimeOff[]; run: Run }) {
  const [resourceId, setResourceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!startDate || !endDate) {
      setError("Başlangıç ve bitiş tarihini seç");
      return;
    }
    const startsAt = zonedInstant(startDate, startTime, timeZone);
    const endsAt = zonedInstant(endDate, endTime, timeZone);
    if (endsAt <= startsAt) {
      setError("Bitiş, başlangıçtan sonra olmalı");
      return;
    }
    setError(null);
    const ok = await run(() =>
      createClient().from("time_off").insert({
        business_id: businessId,
        resource_id: resourceId || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: reason.trim() || null,
      }),
    );
    if (ok) setReason("");
  }

  return (
    <section>
      <h2 className="text-xl font-semibold">İzin ve kapalı günler</h2>
      <p className="text-sm text-muted">Bu aralıklarda müşteriler randevu alamaz. Mevcut randevular otomatik iptal edilmez.</p>
      {canEdit && (
        <form onSubmit={add} className="card mt-4 grid gap-3" noValidate>
          <div>
            <label htmlFor="to-res" className="label">Kim için</label>
            <select id="to-res" className="input" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              <option value="">Tüm işletme (resmi tatil vb.)</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <div>
                <label htmlFor="to-sd" className="label">Başlangıç günü</label>
                <input id="to-sd" type="date" className="input" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} />
              </div>
              <div>
                <label htmlFor="to-st" className="label">Saat</label>
                <input id="to-st" type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <div>
                <label htmlFor="to-ed" className="label">Bitiş günü</label>
                <input id="to-ed" type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="to-et" className="label">Saat</label>
                <input id="to-et" type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="to-reason" className="label">Not (yalnızca sen görürsün)</label>
            <input id="to-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary justify-self-start">İzin ekle</button>
        </form>
      )}
      <ul className="mt-4 grid gap-2">
        {timeOff.map((t) => (
          <li key={t.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="text-sm">
              <p className="font-medium">
                {formatDateShort(t.starts_at, timeZone)} {formatTime(t.starts_at, timeZone)} → {formatDateShort(t.ends_at, timeZone)} {formatTime(t.ends_at, timeZone)}
              </p>
              <p className="text-muted">
                {t.resource_id ? resources.find((r) => r.id === t.resource_id)?.name : "Tüm işletme"}
                {t.reason ? ` · ${t.reason}` : ""}
              </p>
            </div>
            {canEdit && (
              <button type="button" className="btn btn-danger" onClick={() => run(() => createClient().from("time_off").delete().eq("id", t.id))}>
                Sil
              </button>
            )}
          </li>
        ))}
        {timeOff.length === 0 && <li className="text-sm text-muted">Planlı izin yok.</li>}
      </ul>
    </section>
  );
}
