// Küçük, bağımlılıksız grafikler. Grafik kütüphanesi yerine SVG/CSS: bu veri için yeterli ve hafif.

type Datum = { label: string; value: number };

/** Dikey çubuk grafik (günlük sayılar). Ekran okuyucu için özet metin ve tablo benzeri liste içerir. */
export function BarChart({ data, label }: { data: Datum[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 100;
  const gap = data.length > 40 ? 0.3 : 1;
  const barWidth = Math.max((width - gap * (data.length - 1)) / data.length, 0.5);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <figure className="mt-3">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={`${label}: toplam ${total}`} className="h-40 w-full">
        {data.map((d, i) => {
          const h = (d.value / max) * 36;
          return (
            <rect key={i} x={i * (barWidth + gap)} y={38 - h} width={barWidth} height={Math.max(h, d.value ? 0.6 : 0.2)} rx="0.4" className="fill-accent">
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          );
        })}
        <line x1="0" x2="100" y1="38" y2="38" className="stroke-border" strokeWidth="0.3" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{data[0]?.label}</span>
        <span>en yüksek: {max === 1 && total === 0 ? 0 : max}</span>
        <span>{data.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}

/** Yatay çubuk listesi (en çok yapılan hizmetler vb.). */
export function HBars({ data, empty }: { data: Datum[]; empty: string }) {
  if (data.length === 0) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="mt-3 grid gap-2">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-accent-soft" aria-hidden>
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
