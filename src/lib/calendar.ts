import { DEFAULT_TIME_ZONE, addDays, localDateString, zonedInstant } from "./time";

export const HOUR_HEIGHT = 56; // px / saat

/** Bir günün [başlangıç, bitiş) aralığı (işletme saat diliminde, UTC olarak). */
export function dayRange(dateStr: string, timeZone = DEFAULT_TIME_ZONE) {
  return {
    from: zonedInstant(dateStr, "00:00", timeZone),
    to: zonedInstant(addDays(dateStr, 1), "00:00", timeZone),
  };
}

export type Block = { id: string; startsAt: string; endsAt: string };

/** Takvim ızgarasının görünür saat aralığı: en az 08-20, randevular taşarsa genişler. */
export function visibleHours(blocks: Block[], timeZone = DEFAULT_TIME_ZONE): { startHour: number; endHour: number } {
  let startHour = 8;
  let endHour = 20;
  for (const b of blocks) {
    const s = minutesOfDay(b.startsAt, timeZone);
    const e = minutesOfDay(b.endsAt, timeZone);
    startHour = Math.min(startHour, Math.floor(s / 60));
    endHour = Math.max(endHour, Math.ceil(e / 60));
  }
  return { startHour, endHour: Math.min(24, endHour) };
}

export function minutesOfDay(iso: string, timeZone = DEFAULT_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Bloğun ızgaradaki dikey konumu ve yüksekliği (px). */
export function blockStyle(block: Block, startHour: number, timeZone = DEFAULT_TIME_ZONE) {
  const s = minutesOfDay(block.startsAt, timeZone);
  const e = Math.max(minutesOfDay(block.endsAt, timeZone), s + 15);
  return {
    top: ((s - startHour * 60) / 60) * HOUR_HEIGHT,
    height: Math.max(((e - s) / 60) * HOUR_HEIGHT, 28),
  };
}

export function todayString(now: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return localDateString(now, timeZone);
}
