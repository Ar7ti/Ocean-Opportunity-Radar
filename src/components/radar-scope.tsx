import type { CSSProperties } from "react";
import type { OppMatch } from "@/lib/radar-rules";

const SWEEP_SECONDS = 6;
// Ranked matches sit closer to the centre: #1 is the strongest contact.
const RANK_RADIUS = [0.3, 0.5, 0.64, 0.76, 0.85];

type Blip = { id: string; name: string; rank?: number; angle: number; radius: number };

// Each opportunity keeps its own bearing, so a change in rank shows as the blip moving inward or outward.
const bearing = (id: string) => {
  let hash = 7;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 3600;
  return hash / 10;
};

function blips(opps: OppMatch[], notNow: OppMatch[]): Blip[] {
  const ranked = opps.map((m, i) => ({
    id: m.opp.id, name: m.opp.name, rank: i + 1,
    angle: bearing(m.opp.id), radius: RANK_RADIUS[Math.min(i, RANK_RADIUS.length - 1)]!,
  }));
  const dormant = notNow.map((m) => ({ id: m.opp.id, name: m.opp.name, angle: bearing(m.opp.id), radius: 0.93 }));
  return [...ranked, ...dormant];
}

export function RadarScope({ opps, notNow, onSelect }: {
  opps: OppMatch[]; notNow: OppMatch[]; onSelect: (id: string) => void;
}) {
  const contacts = blips(opps, notNow);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] select-none">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(0.3_0.07_220/0.55),oklch(0.17_0.035_252/0)_70%)]" />
      {[1, 0.75, 0.5, 0.25].map((scale) => (
        <div key={scale} className="absolute rounded-full border border-[oklch(0.85_0.09_190/0.16)]"
          style={{ inset: `${(1 - scale) * 50}%` }} />
      ))}
      <div className="absolute inset-x-0 top-1/2 h-px bg-[oklch(0.85_0.09_190/0.1)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[oklch(0.85_0.09_190/0.1)]" />
      {[0, 1.33, 2.66].map((delay) => (
        <div key={delay} className="absolute inset-0 rounded-full border border-[oklch(0.85_0.11_190/0.5)] motion-safe:animate-[sonar_4s_var(--ease-out)_infinite]"
          style={{ animationDelay: `${delay}s` }} />
      ))}
      <div className="absolute inset-0 rounded-full motion-safe:animate-[sweep_6s_linear_infinite]"
        style={{ background: "conic-gradient(from 0deg, transparent 0deg 290deg, oklch(0.85 0.12 190 / 0) 290deg, oklch(0.85 0.12 190 / 0.38) 359.5deg, oklch(0.95 0.08 190 / 0.9) 360deg)", maskImage: "radial-gradient(circle, #000 69%, transparent 70.5%)" }} />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_16px_4px_oklch(0.85_0.12_190/0.7)]" />

      {contacts.map((b) => {
        const rad = (b.angle * Math.PI) / 180;
        const style = {
          // Rounded so server and browser render identical styles.
          left: `${(50 + Math.sin(rad) * b.radius * 50).toFixed(2)}%`,
          top: `${(50 - Math.cos(rad) * b.radius * 50).toFixed(2)}%`,
        } as CSSProperties;
        const top = b.rank === 1;
        const labelLeft = Math.sin(rad) > 0.35;
        return (
          <button key={b.id} type="button" onClick={() => onSelect(b.id)} style={style}
            aria-label={b.rank ? `#${b.rank} ${b.name} — show details` : `${b.name} — not actionable now`}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition-[left,top] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none">
            <span className={`relative block rounded-full motion-safe:animate-[blip-hit_6s_linear_infinite] ${top ? "h-3.5 w-3.5 bg-white" : b.rank ? "h-2.5 w-2.5 bg-[oklch(0.86_0.12_190)]" : "h-2 w-2 bg-white/35"}`}
              style={{ animationDelay: `${(b.angle / 360) * SWEEP_SECONDS}s` }}>
              {top && <span className="absolute inset-0 rounded-full bg-white motion-safe:animate-[ping-ring_2s_var(--ease-out)_infinite]" />}
            </span>
            <span className={`pointer-events-none absolute top-1/2 max-w-[44vw] -translate-y-1/2 truncate whitespace-nowrap rounded-full sm:max-w-none px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md transition-all duration-300 ${labelLeft ? "right-full mr-1" : "left-full ml-1"} ${top ? "bg-white text-abyss opacity-100" : "bg-white/12 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
              {b.rank ? `#${b.rank} · ` : ""}{b.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
