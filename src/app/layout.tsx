import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Randevu Panel", template: "%s | Randevu Panel" },
  description: "Kuaför, güzellik merkezi ve oto yıkama için işletme paneli: takvim, müşteriler, hizmetler, ekip ve rapor.",
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
          <QueryProvider>{children}</QueryProvider>
        </main>
        <footer className="border-t border-border py-4 text-center text-sm text-muted">
          Randevu Panel · portfolyo projesi
        </footer>
      </body>
    </html>
  );
}
