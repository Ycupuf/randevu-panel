/**
 * Türkiye cep telefonunu "+905321234567" biçimine çevirir (müşteri sitesindeki normalizePhoneTR ile aynı kural).
 * Kabul edilen yazımlar: "0532 123 45 67", "532-123-4567", "+90 532 123 45 67", "905321234567".
 * Sabit hatlar kabul edilmez. Geçersizse null.
 *
 * Neden önemli: müşteri sitesi telefonları "+90..." saklar; panelde elle girilen "0532..." ile aynı kişi iki kez
 * (kopya müşteri) oluşmasın diye iki taraf da aynı biçime çevrilir.
 */
export function normalizePhoneTR(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) return null;
  return `+90${digits}`;
}
