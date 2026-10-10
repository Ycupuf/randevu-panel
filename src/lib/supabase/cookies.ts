// Oturum çerezi bayrakları.
//
// Panel, verileri tarayıcıdan doğrudan Supabase'e yazar (RLS + RPC), bu yüzden tarayıcı istemcisinin oturum
// çerezini OKUYABİLMESİ gerekir: çerez HttpOnly yapılamaz (müşteri sitesinde yapılır). Secure ve SameSite yine
// eklenir. HttpOnly'ye geçmek, tüm yazma işlerinin sunucu eylemlerine taşınmasını gerektirir.
//
// Secure yalnızca production'da: yerelde http://localhost üzerinde bazı tarayıcılar Secure çereze izin vermez.

const secure = process.env.NODE_ENV === "production";

type CookieOptions = Record<string, unknown>;

export function hardenSessionCookie(options: CookieOptions | undefined): CookieOptions {
  return { ...options, secure, sameSite: "lax" };
}

/** Tarayıcı istemcisinin çerez yazarken (yenilenen oturum dahil) kullanacağı seçenekler. */
export const BROWSER_COOKIE_OPTIONS = { secure, sameSite: "lax" as const };
