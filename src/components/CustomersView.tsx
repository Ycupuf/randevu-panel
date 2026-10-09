"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { customerStats, matchesCustomer, type CustomerAppointment } from "@/lib/customers";
import { translateDbError } from "@/lib/errors";
import { formatDateShort, formatPhoneTR } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  hasAccount: boolean;
  note: string;
  appointments: CustomerAppointment[];
};

export function CustomersView({ businessId, timeZone, customers }: { businessId: string; timeZone: string; customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const [onlyRisky, setOnlyRisky] = useState(false);

  const rows = useMemo(
    () =>
      customers
        .map((c) => ({ c, stats: customerStats(c.appointments) }))
        .filter(({ c, stats }) => matchesCustomer(c, query) && (!onlyRisky || stats.noShow > 0)),
    [customers, query, onlyRisky],
  );

  return (
    <div>
      <h2 className="text-xl font-semibold">Müşteriler</h2>
      <p className="text-sm text-muted">Randevu alan herkes burada görünür. Notları yalnızca işletme ekibi görür.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grow sm:max-w-sm">
          <label htmlFor="cust-search" className="label">Ara</label>
          <input id="cust-search" type="search" className="input" placeholder="Ad, telefon ya da e-posta" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="chip" aria-pressed={onlyRisky} onClick={() => setOnlyRisky((v) => !v)}>
          Gelmeyenler
        </button>
        <p className="pb-3 text-sm text-muted" aria-live="polite">{rows.length} müşteri</p>
      </div>

      <ul className="mt-4 grid gap-3">
        {rows.map(({ c, stats }) => (
          <li key={c.id} className="card grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{c.full_name}</h3>
                <p className="text-sm text-muted">
                  {c.phone ? <a className="underline" href={`tel:${c.phone}`}>{formatPhoneTR(c.phone)}</a> : "Telefon yok"}
                  {c.email ? ` · ${c.email}` : ""}
                  {c.hasAccount ? "" : " · hesapsız (elle eklendi)"}
                </p>
              </div>
              <dl className="flex gap-4 text-center text-sm">
                <div><dt className="text-muted">Randevu</dt><dd className="font-semibold">{stats.total}</dd></div>
                <div><dt className="text-muted">Gelmedi</dt><dd className={`font-semibold ${stats.noShow ? "text-danger" : ""}`}>{stats.noShow}</dd></div>
                <div><dt className="text-muted">Son ziyaret</dt><dd className="font-semibold">{stats.lastVisit ? formatDateShort(stats.lastVisit, timeZone) : "–"}</dd></div>
              </dl>
            </div>
            <NoteEditor businessId={businessId} customerId={c.id} initial={c.note} />
          </li>
        ))}
        {rows.length === 0 && <li className="card text-muted">{customers.length ? "Aramaya uyan müşteri yok." : "Henüz müşteri yok. İlk randevuyla birlikte burada görünür."}</li>}
      </ul>
    </div>
  );
}

function NoteEditor({ businessId, customerId, initial }: { businessId: string; customerId: string; initial: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const dirty = note.trim() !== initial.trim();

  async function save() {
    setStatus("saving");
    setError(null);
    const supabase = createClient();
    const trimmed = note.trim();
    const { error } = trimmed
      ? await supabase.from("customer_notes").upsert({ customer_id: customerId, business_id: businessId, note: trimmed })
      : await supabase.from("customer_notes").delete().eq("customer_id", customerId);
    if (error) {
      setStatus("error");
      setError(translateDbError(error).message);
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  const id = `note-${customerId}`;
  return (
    <div>
      <label htmlFor={id} className="label">Özel not</label>
      <textarea id={id} className="input min-h-20" maxLength={1000} placeholder="Örn. Sakal şekli: 2 numara, alerjisi var…" value={note} onChange={(e) => { setNote(e.target.value); setStatus("idle"); }} />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn" disabled={!dirty || status === "saving"} onClick={save}>
          {status === "saving" ? "Kaydediliyor…" : "Notu kaydet"}
        </button>
        {status === "saved" && !dirty && <span role="status" className="text-sm text-success">Kaydedildi</span>}
        {error && <span role="alert" className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
