// Haftalık çalışma saatleri için saf (veritabanından bağımsız) yardımcılar.
// weekday: 0 = Pazar ... 6 = Cumartesi (PostgreSQL `dow` ile aynı).

export type Interval = { start: string; end: string };
export type Week = Record<number, Interval[]>;

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // gösterim sırası: Pazartesi ... Pazar

export const DEFAULT_WEEK: Week = {
  0: [],
  1: [{ start: "09:00", end: "19:00" }],
  2: [{ start: "09:00", end: "19:00" }],
  3: [{ start: "09:00", end: "19:00" }],
  4: [{ start: "09:00", end: "19:00" }],
  5: [{ start: "09:00", end: "19:00" }],
  6: [{ start: "09:00", end: "19:00" }],
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Bir günün aralıklarını doğrular; sorun yoksa null, varsa Türkçe hata metni döner. */
export function validateDay(intervals: Interval[]): string | null {
  for (const i of intervals) {
    if (!TIME.test(i.start) || !TIME.test(i.end)) return "Saatleri SS:DD biçiminde gir";
    if (toMinutes(i.start) >= toMinutes(i.end)) return "Bitiş saati başlangıçtan sonra olmalı";
  }
  const sorted = [...intervals].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let k = 1; k < sorted.length; k++) {
    if (toMinutes(sorted[k].start) < toMinutes(sorted[k - 1].end)) return "Aralıklar birbirine girmemeli";
  }
  return null;
}

/** Tüm haftayı doğrular; ilk hatayı gün numarasıyla verir. */
export function validateWeek(week: Week): { weekday: number; message: string } | null {
  for (const weekday of WEEK_ORDER) {
    const message = validateDay(week[weekday] ?? []);
    if (message) return { weekday, message };
  }
  return null;
}

type Row = { weekday: number; start_time: string; end_time: string };

/** Veritabanı satırlarını ("09:00:00") gün gün sıralı aralıklara çevirir. */
export function groupHours(rows: Row[]): Week {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rows) week[r.weekday].push({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) });
  for (const d of Object.keys(week)) week[Number(d)].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  return week;
}

/** Haftayı veritabanına yazılacak satırlara düzleştirir. */
export function weekToRows(week: Week): Row[] {
  return WEEK_ORDER.flatMap((weekday) =>
    (week[weekday] ?? []).map((i) => ({ weekday, start_time: i.start, end_time: i.end })),
  );
}

/** Bir günün saatlerini diğer günlere kopyalar (hafta içi çalışma düzenini hızlı kurmak için). */
export function copyDay(week: Week, from: number, to: number[]): Week {
  const next: Week = { ...week };
  for (const d of to) next[d] = (week[from] ?? []).map((i) => ({ ...i }));
  return next;
}

/** Haftalık toplam çalışma süresi (saat). */
export function weeklyHours(week: Week): number {
  let minutes = 0;
  for (const d of WEEK_ORDER) for (const i of week[d] ?? []) minutes += toMinutes(i.end) - toMinutes(i.start);
  return minutes / 60;
}
