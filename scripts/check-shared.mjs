#!/usr/bin/env node
// randevu-web ile BİREBİR aynı olması gereken dosyaları karşılaştırır.
//
// Neden kopya: iki uygulama ayrı depo ve ayrı dağıtım; ortak paket (npm workspace / private registry)
// bu proje büyüklüğü için fazla yük. Bedeli: sapma. Bu betik o bedeli CI'da görünür kılar: web deposundaki
// (kaynak) dosya değişip burası güncellenmezse CI kırılır ve hangi dosyanın nasıl kopyalanacağını söyler.
//
// Kaynak: randevu-web (main). Burada değişiklik yapma; önce orada değiştir, sonra buraya kopyala.

import { readFile } from "node:fs/promises";

const SOURCE = process.env.SHARED_SOURCE ?? "https://raw.githubusercontent.com/Ycupuf/randevu-web/main";
const FILES = [
  "src/lib/time.ts",
  "src/lib/format.ts",
  "src/lib/errors.ts",
  "src/lib/redirect.ts",
  "src/lib/origin.ts",
  "src/lib/clock.ts",
  "src/lib/database.types.ts",
];

const inCI = Boolean(process.env.CI);
const drifted = [];
const unreachable = [];

for (const file of FILES) {
  const local = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  let remote;
  try {
    const res = await fetch(`${SOURCE}/${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    remote = await res.text();
  } catch (e) {
    unreachable.push(`${file} (${e instanceof Error ? e.message : e})`);
    continue;
  }
  if (local !== remote) drifted.push(file);
}

if (unreachable.length) {
  const msg = `Kaynak okunamadı:\n  ${unreachable.join("\n  ")}`;
  if (inCI) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`${msg}\n(CI dışında: atlandı)`);
}
if (drifted.length) {
  console.error(
    `randevu-web ile sapmış dosyalar:\n  ${drifted.join("\n  ")}\n\n` +
      `Kaynak randevu-web'dir. Güncel hâli kopyala:\n  for f in ${drifted.join(" ")}; do ` +
      `curl -fsS ${SOURCE}/$f -o $f; done`,
  );
  process.exit(1);
}
if (!unreachable.length) console.log(`Paylaşılan ${FILES.length} dosya randevu-web ile aynı.`);
