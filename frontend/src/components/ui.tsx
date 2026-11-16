import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LABEL } from "@/lib/logic";

const BTN = {
  primary: "bg-daun text-white hover:bg-daun-tua",
  secondary: "border border-garis bg-white text-tinta hover:border-daun",
  danger: "border border-merah/40 bg-white text-merah hover:bg-merah-muda",
  wa: "bg-[#0f7a6c] text-white hover:bg-[#0b5f54]",
};
const SIZE = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

/** Kelas tombol, dipakai juga untuk <Link> yang tampil sebagai tombol. */
export const btn = (variant: keyof typeof BTN = "primary", size: keyof typeof SIZE = "md") =>
  `inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${SIZE[size]}`;

export function Button({
  variant,
  size,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN; size?: keyof typeof SIZE }) {
  return <button type="button" {...props} className={`${btn(variant, size)} ${className}`} />;
}

const TONE = {
  ok: "bg-daun-muda text-daun-tua",
  warn: "bg-pepaya-muda text-pepaya-tua",
  bad: "bg-merah-muda text-merah",
  info: "bg-telang-muda text-telang",
  muted: "bg-garis/50 text-redup",
};
export type Tone = keyof typeof TONE;

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  INQUIRY: "info",
  PENDING_CONFIRMATION: "warn",
  CONFIRMED: "ok",
  PROCESSING: "info",
  COMPLETED: "ok",
  PUBLISHED: "ok",
  OUT_OF_STOCK: "warn",
  PENDING_REVIEW: "warn",
  APPROVED: "info",
  ONLINE: "ok",
  SENSOR_ERROR: "bad",
};
/** Lencana untuk semua status sistem (pesanan, produk, panen, perangkat). */
export const Status = ({ value }: { value: string }) => (
  <Badge tone={STATUS_TONE[value] ?? "muted"}>{LABEL[value] ?? value}</Badge>
);

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-lg border border-garis bg-white p-5 ${className}`}>{children}</section>;
}

export function PageHead({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-daun-tua">{title}</h1>
        {desc && <p className="mt-1 max-w-[70ch] text-redup">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-semibold ${className}`}>
      {label}
      {hint && <span className="ml-1.5 font-normal text-redup">{hint}</span>}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-garis bg-white p-4">
      <p className="text-sm font-semibold text-redup">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-daun-tua">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-redup">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-garis px-4 py-8 text-center text-redup">{children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md bg-merah-muda px-3 py-2 text-sm font-medium text-merah">
      {children}
    </p>
  );
}

/** Tabel yang bisa digeser ke samping di layar ponsel. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-garis bg-white">{children}</div>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 21V11" />
      <path d="M12 11c0-4.4-3.2-7-8-7 0 4.6 3 7.4 8 7Z" />
      <path d="M12 15c0-3.6 2.8-6 8-6 0 4-2.8 6.4-8 6Z" />
    </svg>
  );
}
