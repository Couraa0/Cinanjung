import { jam } from "@/lib/format";
import { Empty } from "./ui";

const W = 640;
const H = 200;
const L = 44;
const R = 10;
const T = 10;
const B = 26;

/** Grafik garis riwayat sensor. Nilai null (sensor error) tampil sebagai celah, bukan angka nol. */
export function LineChart({
  points,
  unit,
  band,
}: {
  points: { t: number; v: number | null }[];
  unit: string;
  band?: { min: number; max: number };
}) {
  const vals = points.flatMap((p) => (p.v == null ? [] : [p.v]));
  if (vals.length < 2) return <Empty>Belum cukup data untuk digambar.</Empty>;

  const dataLo = Math.min(...vals, band?.min ?? Infinity);
  const dataHi = Math.max(...vals, band?.max ?? -Infinity);
  const pad = (dataHi - dataLo || 1) * 0.08;
  const lo = dataLo - pad;
  const hi = dataHi + pad;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const x = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

  const path = points
    .map((p, i) => (p.v == null ? "" : `${i && points[i - 1].v != null ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`))
    .join("");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Grafik riwayat dalam ${unit}`}>
      {band && (
        <rect x={L} y={y(band.max)} width={W - L - R} height={y(band.min) - y(band.max)} className="fill-daun-muda/60" />
      )}
      {[dataLo, (dataLo + dataHi) / 2, dataHi].map((v, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-garis" strokeDasharray="2 4" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-redup text-[11px]">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      <path d={path} fill="none" className="stroke-telang" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <text x={L} y={H - 6} className="fill-redup text-[11px]">
        {jam(t0)}
      </text>
      <text x={W - R} y={H - 6} textAnchor="end" className="fill-redup text-[11px]">
        {jam(t1)}
      </text>
    </svg>
  );
}

/** Batang omzet per hari. */
export function Bars({ data, format }: { data: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((x) => x.value), 1);
  return (
    <ol className="flex h-40 items-end gap-1" aria-label="Omzet per hari">
      {data.map((x) => (
        <li key={x.label} className="flex h-full flex-1 flex-col justify-end" title={`${x.label}: ${format(x.value)}`}>
          <div className="rounded-t bg-daun" style={{ height: `${(x.value / max) * 100}%`, minHeight: x.value ? 3 : 0 }} />
          <span className="mt-1 block truncate text-center text-[10px] text-redup">{x.label}</span>
        </li>
      ))}
    </ol>
  );
}
