import type { ReactNode } from "react";
import { useCountUp, useReveal } from "@/hooks/use-motion";

export function Reveal({ children, className = "", as: Tag = "div", id, delay = 0, ...rest }: {
  children: ReactNode; className?: string; as?: "div" | "section"; id?: string; delay?: number; "aria-label"?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref} id={id} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}

/** Ring gauge whose arc and number animate up to the current value. */
export function Gauge({ value, max, label, tone = "ocean", size = 120 }: {
  value: number | null; max: number; label: string; tone?: "ocean" | "lagoon" | "sun"; size?: number;
}) {
  const shown = useCountUp(value);
  const r = 46;
  const c = 2 * Math.PI * r;
  const progress = value === null ? 0 : Math.max(0, Math.min(1, shown / max));
  const stroke = { ocean: "url(#gauge-ocean)", lagoon: "url(#gauge-lagoon)", sun: "url(#gauge-sun)" }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value ?? "unknown"} of ${max}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="gauge-ocean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="oklch(0.62 0.15 235)" /><stop offset="1" stopColor="oklch(0.45 0.13 250)" /></linearGradient>
          <linearGradient id="gauge-lagoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="oklch(0.82 0.12 185)" /><stop offset="1" stopColor="oklch(0.58 0.12 210)" /></linearGradient>
          <linearGradient id="gauge-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="oklch(0.84 0.14 80)" /><stop offset="1" stopColor="oklch(0.66 0.17 45)" /></linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums">{value === null ? "—" : Math.round(shown)}</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{value === null ? "unknown" : `of ${max}`}</p>
        </div>
      </div>
    </div>
  );
}
