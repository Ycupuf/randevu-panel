import type { Database } from "@/lib/database.types";

export type Status = Database["public"]["Enums"]["appointment_status"];

export type ResourceLite = { id: string; name: string; kind: Database["public"]["Enums"]["resource_kind"] };

export type ServiceLite = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
  service_variants: { id: string; name: string; duration_min: number; price_cents: number | null }[];
};

export type CalendarAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  source: Database["public"]["Enums"]["appointment_source"];
  resource_id: string;
  note: string | null;
  field_answers: unknown;
  customers: { full_name: string; phone: string | null; email: string | null } | null;
  appointment_items: { name: string; duration_min: number; price_cents: number | null }[];
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylandı",
  cancelled: "İptal",
  completed: "Tamamlandı",
  no_show: "Gelmedi",
};

export const STATUS_CLASS: Record<Status, string> = {
  pending: "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  confirmed: "border-accent bg-accent-soft",
  cancelled: "border-border bg-surface text-muted line-through",
  completed: "border-success bg-success-soft text-success",
  no_show: "border-danger bg-danger-soft text-danger",
};
