import { expect, test } from "@playwright/test";

// Demo sahibi hesabı sunucuda DEMO_OWNER_EMAIL/PASSWORD ile tanımlıdır. Tanımsızsa ve düğme yoksa
// bu testler kendini atlar (örn. CI'da gizli değişken verilmediğinde).
const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN === "1" && Boolean(process.env.DEMO_OWNER_PASSWORD);

test.describe("giriş", () => {
  test("giriş yapmamış kullanıcı panelden giriş sayfasına yönlenir", async ({ page }) => {
    await page.goto("/demo-berber/takvim");
    await expect(page).toHaveURL(/\/giris\?next=%2Fdemo-berber%2Ftakvim/);
    await expect(page.getByRole("heading", { name: "İşletme paneline giriş" })).toBeVisible();
  });

  test("geçersiz e-posta uyarısı gösterir", async ({ page }) => {
    await page.goto("/giris");
    await page.getByLabel("E-posta").fill("bu-bir-eposta-degil");
    await page.getByRole("button", { name: "Giriş bağlantısı gönder" }).click();
    await expect(page.locator("#login-email-err")).toContainText("Geçerli bir e-posta");
  });

  test("açık yönlendirme engellenir: next dış adres olamaz", async ({ page }) => {
    await page.goto("/giris?next=https://kotu.example");
    await expect(page.locator("input[name=next]")).toHaveCount(demoEnabled ? 1 : 0);
    if (demoEnabled) await expect(page.locator("input[name=next]")).toHaveValue("/");
  });
});

test.describe("demo işletme sahibi", () => {
  test.skip(!demoEnabled, "Demo girişi bu ortamda kapalı");

  test.beforeEach(async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("button", { name: "Demo hesabıyla devam et" }).click();
    await expect(page.getByRole("heading", { name: "İşletmelerim" })).toBeVisible();
  });

  test("üç demo işletmeyi listeler", async ({ page }) => {
    for (const name of ["Demo Berber", "Demo Güzellik Merkezi", "Demo Oto Yıkama"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("takvimde randevuyu onaylar", async ({ page }) => {
    await page.goto("/demo-berber/takvim");
    const pending = page.getByRole("button", { name: /Onay bekliyor/ }).first();
    await expect(pending).toBeVisible();
    await pending.click();
    const dialog = page.getByRole("dialog", { name: "Randevu ayrıntısı" });
    await dialog.getByRole("button", { name: "Onayla" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /Onay bekliyor/ })).toHaveCount(0);
  });

  test("elle randevu ekler ve çakışan saati reddeder", async ({ page }) => {
    await page.goto("/demo-berber/takvim");
    const add = async (name: string) => {
      await page.getByRole("button", { name: "Randevu ekle" }).click();
      const dialog = page.getByRole("dialog", { name: "Randevu ekle" });
      await dialog.getByLabel("Müşteri adı").fill(name);
      await dialog.getByLabel("Saat").fill("18:00");
      await dialog.getByRole("button", { name: "Randevuyu ekle" }).click();
      return dialog;
    };
    const first = await add("E2E Müşteri Bir");
    await expect(first).toBeHidden();
    await expect(page.getByRole("button", { name: /18:00 E2E Müşteri Bir/ })).toBeVisible();

    // Aynı kişi, aynı saat: veritabanındaki EXCLUDE kısıtı reddeder, arayüz Türkçe mesaj gösterir.
    const second = await add("E2E Müşteri İki");
    await expect(second.getByRole("alert")).toContainText("Bu saat az önce doldu");
  });

  test("müşteri araması Türkçe karakterden bağımsız çalışır", async ({ page }) => {
    await page.goto("/demo-berber/musteriler");
    const search = page.getByLabel("Ara");
    await search.fill("emre celik");
    await expect(page.getByRole("heading", { name: "Emre Çelik" })).toBeVisible();
    await search.fill("yokboyleadam");
    await expect(page.getByText("Aramaya uyan müşteri yok.")).toBeVisible();
  });

  test("hizmet sayfası ve rapor açılır", async ({ page }) => {
    await page.goto("/demo-berber/hizmetler");
    await expect(page.getByLabel("Ad").first()).toHaveValue(/.+/);
    await page.goto("/demo-berber/rapor?gun=7");
    await expect(page.getByRole("heading", { name: "Rapor" })).toBeVisible();
    await expect(page.getByText("Gelmeme oranı")).toBeVisible();
  });

  test("bildirimler sekmesi açılır ve filtreler çalışır", async ({ page }) => {
    await page.goto("/demo-berber/bildirimler");
    await expect(page.getByRole("heading", { name: "Bildirimler", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tümünü okundu say" })).toBeVisible();
    await page.getByRole("button", { name: "Yeni müşteri", exact: true }).click();
    await expect(page.getByRole("button", { name: "Yeni müşteri", exact: true })).toHaveAttribute("aria-pressed", "true");
    // Sekme menüsünde de görünür
    await expect(page.getByRole("navigation", { name: "İşletme bölümleri" }).getByRole("link", { name: /Bildirimler/ })).toBeVisible();
  });

  test("takvim ?tarih= bağlantısıyla istenen günü açar", async ({ page }) => {
    await page.goto("/demo-berber/takvim?tarih=2026-12-01");
    await expect(page.getByRole("heading", { name: "1 Aralık 2026 Salı" })).toBeVisible();
    await expect(page.getByLabel("Tarih")).toHaveValue("2026-12-01");
    // Geçersiz değer bugüne düşer, hata vermez
    await page.goto("/demo-berber/takvim?tarih=kotu");
    await expect(page.getByRole("button", { name: "Randevu ekle" })).toBeVisible();
  });

  test("çıkış yapınca panel kapanır", async ({ page }) => {
    await page.getByRole("button", { name: "Çıkış" }).click();
    await expect(page).toHaveURL(/\/giris/);
    await page.goto("/demo-berber/takvim");
    await expect(page).toHaveURL(/\/giris/);
  });
});
