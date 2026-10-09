// Müşteri listesi için saf yardımcılar: istatistik ve arama.

export type CustomerAppointment = { status: string; starts_at: string };

export type CustomerStats = {
  total: number;
  completed: number;
  noShow: number;
  cancelled: number;
  lastVisit: string | null; // son tamamlanan randevunun başlangıcı
  noShowRate: number; // 0-1; gelmedi / (tamamlandı + gelmedi)
};

export function customerStats(appointments: CustomerAppointment[]): CustomerStats {
  let completed = 0;
  let noShow = 0;
  let cancelled = 0;
  let lastVisit: string | null = null;
  for (const a of appointments) {
    if (a.status === "completed") {
      completed++;
      if (!lastVisit || a.starts_at > lastVisit) lastVisit = a.starts_at;
    } else if (a.status === "no_show") noShow++;
    else if (a.status === "cancelled") cancelled++;
  }
  const attended = completed + noShow;
  return { total: appointments.length, completed, noShow, cancelled, lastVisit, noShowRate: attended ? noShow / attended : 0 };
}

const TR_MAP: Record<string, string> = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c" };

/** Aramada Türkçe karakter ve büyük/küçük harf farkını yok sayar ("sule" = "Şule"). */
export function normalizeSearch(text: string): string {
  return text.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TR_MAP[c]).toLowerCase().trim();
}

/** Telefonu karşılaştırma anahtarına çevirir: yalnızca rakamlar, ülke kodu (90) ve baştaki 0 atılır. */
function phoneKey(phone: string): string {
  const raw = phone.trim();
  let d = raw.replace(/\D/g, "");
  // "+90 ..." ve "0090 ..." açıkça ülke kodudur; yazılı + yoksa yalnızca 10 haneden uzun numarada 90 atılır.
  if (raw.startsWith("+90")) d = d.slice(2);
  else if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length > 10) d = d.slice(2);
  return d.replace(/^0+/, "");
}

/** Ad, telefon (yalnızca rakamlar) ya da e-posta içinde arar. */
export function matchesCustomer(c: { full_name: string; phone: string | null; email: string | null }, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const digits = phoneKey(query);
  if (digits.length >= 3 && c.phone && phoneKey(c.phone).includes(digits)) return true;
  return normalizeSearch(c.full_name).includes(q) || normalizeSearch(c.email ?? "").includes(q);
}
