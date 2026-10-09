import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/redirect";

// POST /auth/demo : e-posta gerektirmeden ortak DEMO işletme sahibi hesabıyla giriş yaptırır.
// Şifre yalnızca sunucu ortam değişkenlerinden okunur, tarayıcıya hiç gitmez. Ortak hesap her girişte
// sıfırlanır ve örnek randevularla yeniden doldurulur (reset_demo_owner). Değişkenler tanımlı değilse kapalıdır.
export async function POST(request: NextRequest) {
  // Başka bir sitenin gizli formuyla tetiklenemez (login CSRF)
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const { origin } = request.nextUrl;
  const form = await request.formData().catch(() => null);
  const next = safeNext(typeof form?.get("next") === "string" ? (form?.get("next") as string) : null, "/");

  const email = process.env.DEMO_OWNER_EMAIL;
  const password = process.env.DEMO_OWNER_PASSWORD;
  if (!email || !password) {
    return NextResponse.redirect(new URL("/giris?hata=demo", origin), { status: 303 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(new URL("/giris?hata=demo", origin), { status: 303 });
  }
  await supabase.rpc("reset_demo_owner");
  return NextResponse.redirect(new URL(next, origin), { status: 303 });
}
