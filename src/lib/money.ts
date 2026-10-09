/** "350" ya da "350,50" → kuruş. Boş metin "fiyat sorulur" demektir (null). Geçersizse undefined. */
export function tlToCents(input: string): number | null | undefined {
  const text = input.trim().replace(/\s/g, "").replace(",", ".");
  if (text === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return undefined;
  return Math.round(Number(text) * 100);
}

/** 35000 → "350"; 35050 → "350,50"; null → "" */
export function centsToTl(cents: number | null | undefined): string {
  if (cents == null) return "";
  const tl = cents / 100;
  return Number.isInteger(tl) ? String(tl) : tl.toFixed(2).replace(".", ",");
}
