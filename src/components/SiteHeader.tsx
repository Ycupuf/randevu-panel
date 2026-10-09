import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Randevu <span className="text-accent">Panel</span>
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn">
                Çıkış
              </button>
            </form>
          </div>
        ) : (
          <Link href="/giris" className="btn">
            Giriş yap
          </Link>
        )}
      </div>
    </header>
  );
}
