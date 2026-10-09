import type { Metadata } from "next";
import { NewBusinessForm } from "@/components/NewBusinessForm";
import { requireUser } from "@/lib/panel";

export const metadata: Metadata = { title: "Yeni işletme" };

export default async function NewBusinessPage() {
  await requireUser("/yeni");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Yeni işletme</h1>
      <p className="mt-2 text-muted">
        Sektörünü seç; hazır hizmet listesi, fiyat ve süreler otomatik gelir. Sonra ekibini ve çalışma saatlerini girip yayına alırsın.
      </p>
      <NewBusinessForm />
    </div>
  );
}
