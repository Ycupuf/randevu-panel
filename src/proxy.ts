import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16'da `middleware` yerine `proxy`. Her istekte oturum çerezini yeniler ki sunucu
// bileşenleri geçerli bir oturum görsün. Proxy paylaşılan modüllere güvenmemeli, bu yüzden
// ortam değişkenleri doğrudan okunur.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Oturumu yeniler. Oturum yoksa kullanıcıyı, gitmek istediği tam yolla (sorgu dahil) girişe yollar:
  // sayfaların kendi `requireUser` denetimi yol bilmediği için dönüş adresini yalnızca burada doğru yazabiliriz.
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  const isPublic = pathname === "/giris" || pathname.startsWith("/auth/");
  if (!data?.claims?.sub && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Statik dosyalar ve görseller hariç her yol
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
