import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between px-4 pt-6 pb-3", className)}>
      <h2 className="kicker">{children}</h2>
      {action}
    </div>
  );
}

export function SerifHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("px-4 pt-6 pb-3 font-serif text-[24px] leading-tight", className)}>{children}</h2>;
}

export function EmptyState({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-10 py-24 text-center text-[15px] text-ink-soft">
      <div className="text-ink">{icon}</div>
      <div className="max-w-xs leading-snug">{children}</div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink", className)}
      aria-hidden
    />
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  label: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="-"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-8 items-center justify-center rounded-full border border-ink/40 text-lg leading-none disabled:opacity-30"
        disabled={value <= min}
      >
        −
      </button>
      <span className="min-w-20 text-center text-[17px] font-semibold tabular-nums">{label}</span>
      <button
        aria-label="+"
        onClick={() => onChange(value + 1)}
        className="flex size-8 items-center justify-center rounded-full border border-ink/40 text-lg leading-none"
      >
        +
      </button>
    </div>
  );
}

export function Checkbox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-[3px] border transition-colors",
        checked ? "border-ink/60 bg-paper text-ink/60" : "border-ink/50 bg-paper",
        className,
      )}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2.5 6.2 5 8.5l4.5-5" />
        </svg>
      )}
    </span>
  );
}
