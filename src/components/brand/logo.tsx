import { useId } from "react";

/** Brand mark: a sonar sweep locking onto an opportunity above the waterline. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b3a6b" />
          <stop offset="1" stopColor="#06172d" />
        </linearGradient>
        <linearGradient id={`${id}sw`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5fe3d4" stopOpacity="0" />
          <stop offset="1" stopColor="#5fe3d4" stopOpacity=".85" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
      <g fill="none" stroke="#8fe9df" strokeOpacity=".35" strokeWidth="1.6">
        <circle cx="32" cy="32" r="21" />
        <circle cx="32" cy="32" r="13" />
      </g>
      <g className="origin-center [transform-box:view-box] motion-safe:animate-[sweep_5s_linear_infinite]" style={{ transformOrigin: "32px 32px" }}>
        <path d="M32 32 L32 11 A21 21 0 0 1 50.2 21.5 Z" fill={`url(#${id}sw)`} />
      </g>
      <circle cx="43" cy="22" r="3.2" fill="#fff" />
      <path d="M9 45c4-4 8.5 4 12.5 0s8.5 4 12.5 0 8.5 4 12.5 0 8.5 4 12.5 0" fill="none" stroke="#5fe3d4" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
