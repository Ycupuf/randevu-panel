"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { translateDbError } from "@/lib/errors";
import { formatDateShort, formatTime } from "@/lib/format";
import { notificationView, TYPE_LABEL, type NotificationRow, type NotificationType } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/browser";

const TONE: Record<string, string> = {
  info: "bg-accent-soft text-accent-strong",
  warning: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

const FILTERS: (NotificationType | "all")[] = ["all", "appointment_new", "appointment_cancelled", "appointment_rescheduled", "customer_registered"];

export function NotificationsView({
  businessId,
  slug,
  timeZone,
  notifications,
}: {
  businessId: string;
  slug: string;
  timeZone: string;
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unread = notifications.filter((n) => !n.read).length;
  const shown = notifications.filter((n) => (filter === "all" || n.type === filter) && (!onlyUnread || !n.read));

  async function markAllRead() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("mark_notifications_read", { p_business_id: businessId });
    setBusy(false);
    if (error) {
      setError(translateDbError(error).message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["unread", businessId] });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Bildirimler</h2>
          <p className="text-sm text-muted">
            Müşteri sitesinden gelen yeni randevular, iptaller, saat değişiklikleri ve yeni müşteriler. Son 90 gün saklanır.
          </p>
        </div>
        <button type="button" className="btn" disabled={busy || unread === 0} onClick={markAllRead}>
          {busy ? "İşaretleniyor…" : `Tümünü okundu say${unread ? ` (${unread})` : ""}`}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Bildirim türü">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "Hepsi" : TYPE_LABEL[f]}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={onlyUnread} onClick={() => setOnlyUnread((v) => !v)}>
          Yalnızca okunmamış
        </button>
      </div>

      <ul className="mt-4 grid gap-3" aria-live="polite">
        {shown.map((n) => {
          const v = notificationView(n, slug, timeZone);
          return (
            <li key={n.id} className={`card grid gap-3 ${n.read ? "" : "border-accent"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span aria-hidden className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${TONE[v.tone]}`}>
                    {v.symbol}
                  </span>
                  <div>
                    <h3 className="font-semibold">
                      {v.title}
                      {!n.read && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-xs font-medium text-white">Yeni</span>}
                    </h3>
                    <p className="text-sm text-muted">
                      {formatDateShort(n.created_at, timeZone)} {formatTime(n.created_at, timeZone)}
                    </p>
                  </div>
                </div>
                <Link href={v.href} className="btn">
                  {v.linkLabel}
                </Link>
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {v.lines.map((l) => (
                  <div key={l.label} className="flex gap-2">
                    <dt className="shrink-0 text-muted">{l.label}:</dt>
                    <dd className="font-medium">{l.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="card text-muted">
            {notifications.length === 0
              ? "Henüz bildirim yok. Müşteri sitesinden randevu alındığında burada görünür."
              : "Seçtiğin filtreye uyan bildirim yok."}
          </li>
        )}
      </ul>
    </div>
  );
}
