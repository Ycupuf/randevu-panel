# Randevu Panel

Kuaför, güzellik merkezi ve oto yıkama gibi randevuyla çalışan işletmeler için **işletme paneli**: takvim, müşteriler, hizmetler, ekip ve çalışma saatleri, ayarlar, rapor.

Müşterilerin randevu aldığı site ayrı bir depodadır: **[randevu-web](https://github.com/Ycupuf/randevu-web)** ([canlı](https://randevu-web-delta.vercel.app)). İki uygulama aynı Supabase projesini (Postgres + Auth + RLS) paylaşır.

> Portfolyo projesidir; ücretsiz ve ödemesizdir. Amaç gerçek bir ürünün çalışan, test edilmiş ve güvenli bir örneğini göstermektir.

## Canlıda dene

1. Panel: **<https://randevu-panel-psi.vercel.app>**
2. **"Demo hesabıyla devam et"** düğmesine bas. E-posta gerekmez; üç örnek işletme (kuaför, güzellik, oto yıkama) hazır gelir.
3. Takvimde bekleyen bir randevuyu **onayla**, ya da **Randevu ekle** ile telefonla gelen bir müşteriyi gir. Aynı kişiye aynı saati ikinci kez vermeyi dene: veritabanı reddeder.
4. Müşteri tarafını görmek için işletme kartındaki **Müşteri sayfası** bağlantısına git; orada alınan randevu panelde görünür.

Demo hesabı herkesle paylaşılır ve her demo girişinde örnek verilerle sıfırlanır.

## Özellikler

| Bölüm | Ne yapar |
|---|---|
| **Takvim** | Gün görünümü, ekip üyesi başına sütun, 30 sn'de bir yenilenir. Randevuyu onayla/reddet, tamamlandı/gelmedi işaretle, saatini değiştir, iptal et. Telefonla gelen randevuyu elle ekle. |
| **Müşteriler** | Ad, telefon (`0532`/`+90` farkı gözetmez) ve e-posta ile arama (Türkçe karakterden bağımsız), randevu/gelmedi/son ziyaret sayıları, yalnızca ekibin gördüğü özel not. |
| **Hizmetler** | Süre, hazırlık payı, fiyat; araç tipi gibi seçenekler (süre ve fiyatı seçeneğe göre değişir); pasif yapma. |
| **Ekip ve saatler** | Ekip üyeleri/alanlar, yaptıkları hizmetler, haftalık çalışma saatleri (mola için bölünmüş aralıklar), izin ve resmi tatil. |
| **Ayarlar** | Yayına alma, paylaşım bağlantısı ve QR kod, onay modu, saat aralığı, en geç/en ileri randevu, iptal süresi, ek form soruları (plaka, alerji notu). |
| **Rapor** | Günlük randevu, popüler hizmetler, ekip yoğunluğu, yoğun saatler, gelmeme oranı, tahmini ciro (7/30/90 gün). |
| **Kurulum sihirbazı** | Sektör seç; hazır hizmet şablonu gelir. Sıradaki kurulum adımı her sayfada hatırlatılır. |

## Mimari

```
Tarayıcı ──► Next.js 16 (App Router, Vercel)
              ├─ Sunucu bileşenleri: veri okur (RLS ile)
              ├─ proxy.ts: oturum çerezini yeniler
              └─ İstemci bileşenleri: TanStack Query + Zustand ile etkileşim
                      │
                      ▼
              Supabase (Postgres + Auth + RLS)
                ├─ RLS: kullanıcı yalnızca üyesi olduğu işletmeyi görür
                ├─ EXCLUDE (gist) kısıtı: aynı kişiye çakışan randevu fiziksel olarak mümkün değil
                └─ Yazma yalnızca RPC fonksiyonlarıyla (create/reschedule/cancel_appointment, set_appointment_status)
```

**Neden böyle?** İş kuralları (çakışma, durum geçişleri, çalışma saati) uygulama kodunda değil **veritabanında** zorlanır; iki uygulama aynı kuralları paylaşır ve eşzamanlı isteklerde bile çifte rezervasyon olmaz. Panel RLS sayesinde başka işletmenin varlığını bile göremez (bulunamadı döner).

Şema ve migration dosyaları [randevu-web/supabase/migrations](https://github.com/Ycupuf/randevu-web/tree/main/supabase/migrations) içindedir.

## Teknolojiler

Next.js 16 · React 19 · TypeScript (strict) · Tailwind 4 · Supabase (Postgres, Auth magic link, RLS, RPC) · TanStack Query · Zustand · zod · date-fns + @date-fns/tz (Europe/Istanbul, UTC saklama) · Vitest · Playwright · GitHub Actions · Vercel

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # Supabase adresi ve yayınlanabilir anahtarı doldur
npm run dev -- -p 3001
```

Demo girişi için `.env.local` içine `NEXT_PUBLIC_DEMO_LOGIN=1` ve `DEMO_OWNER_EMAIL`/`DEMO_OWNER_PASSWORD` yaz (hesabı randevu-web deposundaki `scripts/create-demo-users.mjs` oluşturur). Şifre yalnızca sunucuda okunur.

| Komut | Ne yapar |
|---|---|
| `npm test` | Birim testleri (Vitest) |
| `npm run typecheck` | Next yol tipleri + TypeScript |
| `npm run lint` | ESLint |
| `npm run e2e` | Uçtan uca testler (Playwright, masaüstü + mobil) |
| `npm run build` | Üretim derlemesi |

## Test

- **Vitest**: takvim yerleşimi, haftalık saat doğrulama, müşteri istatistiği ve arama, rapor hesapları, para dönüşümü, saat dilimi, hata çevirisi.
- **Playwright**: giriş koruması, açık yönlendirme engeli, demo sahibi ile randevu onayı, elle randevu ve çakışma reddi, müşteri araması, çıkış. Hem masaüstü hem mobil.
- **CI**: her push'ta tip kontrolü, lint, Vitest, derleme ve (depo değişkenleri tanımlıysa) Playwright.

## Bilinen eksikler

- Onay/hatırlatma e-postası yok (Supabase varsayılan e-postası yalnızca giriş bağlantısı içindir; gerçek kullanım için özel SMTP gerekir).
- Hafta/ay görünümü yok; takvim gün görünümüdür.
- Personel rolü salt okunur ve yalnızca kendi kaynağının randevusunu görür; davet akışı henüz yok (üyelik veritabanından eklenir).
- Captcha ve CSP yok.
