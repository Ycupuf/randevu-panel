import { env } from "@/lib/env";

/** "Demo hesabıyla devam et": e-posta gerektirmez. Yalnızca NEXT_PUBLIC_DEMO_LOGIN=1 ise görünür. */
export function DemoLoginForm({ next }: { next: string }) {
  if (!env.NEXT_PUBLIC_DEMO_LOGIN) return null;

  return (
    <form action="/auth/demo" method="post" className="rounded-lg border border-dashed border-border p-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm font-medium">Paneli denemek mi istiyorsun?</p>
      <p className="mt-1 text-sm text-muted">
        E-posta gerekmeden, üç örnek işletmesi (kuaför, güzellik, oto yıkama) hazır bir demo hesabıyla gir. Demo verileri
        herkesle paylaşılır ve her demo girişinde örnek randevularla yeniden doldurulur.
      </p>
      <button type="submit" className="btn btn-primary mt-3">
        Demo hesabıyla devam et
      </button>
    </form>
  );
}
