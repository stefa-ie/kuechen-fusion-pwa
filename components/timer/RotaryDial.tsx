"use client";

import { useRef, type PointerEvent } from "react";

/**
 * Drag the knob around the ring to set minutes. One revolution = 60 minutes;
 * keep turning past 12 o'clock to add hours.
 */
export function RotaryDial({
  minutes,
  onChange,
  max = 12 * 60,
  min = 1,
  size = 260,
  stroke = 22,
  format,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  max?: number;
  min?: number;
  size?: number;
  stroke?: number;
  format: (minutes: number) => string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<{ lastAngle: number; total: number } | null>(null);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const withinHour = minutes % 60 === 0 && minutes > 0 ? 1 : (minutes % 60) / 60;
  const angle = withinHour * 2 * Math.PI - Math.PI / 2;
  const knobX = size / 2 + r * Math.cos(angle);
  const knobY = size / 2 + r * Math.sin(angle);

  const pointerAngle = (e: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // 0 at 12 o'clock, clockwise, in degrees 0..360
    return ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const a = pointerAngle(e);
    const hours = Math.floor(minutes / 60);
    // Jump the knob to where the user touched within the current hour.
    const total = hours * 360 + a;
    drag.current = { lastAngle: a, total };
    onChange(Math.min(max, Math.max(min, Math.round(total / 6))));
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const a = pointerAngle(e);
    let delta = a - drag.current.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    drag.current.lastAngle = a;
    drag.current.total = Math.min(max * 6, Math.max(min * 6, drag.current.total + delta));
    onChange(Math.round(drag.current.total / 6));
  };

  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="relative select-none" style={{ width: size, height: size, touchAction: "none" }}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ring-track" />
        {minutes >= 60 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink/25" />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - withinHour)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="stroke-ink"
        />
        <circle cx={knobX} cy={knobY} r={stroke * 0.7} className="fill-paper stroke-ink" strokeWidth={3} />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-[44px] font-light tabular-nums tracking-tight">{format(minutes)}</span>
      </div>
    </div>
  );
}
