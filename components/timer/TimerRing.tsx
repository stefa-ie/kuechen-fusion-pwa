import type { ReactNode } from "react";

export function TimerRing({
  progress,
  size = 260,
  stroke = 22,
  done,
  children,
}: {
  /** 1 = full, 0 = empty. */
  progress: number;
  size?: number;
  stroke?: number;
  done?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const angle = p * 2 * Math.PI - Math.PI / 2;
  const knobX = size / 2 + r * Math.cos(angle);
  const knobY = size / 2 + r * Math.sin(angle);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {done ? (
          <>
            <circle cx={size / 2} cy={size / 2} r={size / 2} className="fill-ink/10 animate-pulse-soft origin-center" />
            <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke * 0.8} className="fill-ink/20" />
            <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke * 1.6} className="fill-ink" />
          </>
        ) : (
          <>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ring-track" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - p)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="stroke-ink transition-[stroke-dashoffset] duration-300 ease-linear"
            />
            {p > 0 && p < 1 && (
              <circle cx={knobX} cy={knobY} r={stroke * 0.62} className="fill-paper stroke-ink" strokeWidth={3} />
            )}
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
