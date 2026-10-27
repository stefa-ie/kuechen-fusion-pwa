"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/duration";
import { remainingOf, useTimers } from "@/lib/timers/store";
import { useNow } from "@/lib/timers/useNow";

/** Floating pills above the tab bar so running timers stay visible on every screen. */
export function ActiveTimersBar() {
  const pathname = usePathname();
  const timers = useTimers((s) => s.timers);
  const open = useTimers((s) => s.open);
  const now = useNow(500, timers.length > 0);

  if (!timers.length || pathname.startsWith("/timers") || /\/cook$/.test(pathname)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(66px+env(safe-area-inset-bottom))] z-30">
      <div className="no-scrollbar pointer-events-auto mx-auto flex max-w-xl gap-2 overflow-x-auto px-3 pb-1">
        {timers.map((timer) => {
          const remaining = remainingOf(timer, now);
          const progress = timer.durationMs ? remaining / timer.durationMs : 0;
          const done = timer.status === "done";
          return (
            <button
              key={timer.id}
              onClick={() => open(timer.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 shadow-md",
                done ? "animate-pulse-soft border-ink bg-ink text-paper" : "border-line bg-paper text-ink",
              )}
            >
              <MiniRing progress={progress} done={done} />
              <span className="max-w-32 truncate text-[13px]">{timer.label}</span>
              <span className={cn("text-[14px] font-semibold tabular-nums", timer.status === "paused" && "opacity-50")}>
                {done ? <Bell className="size-4" /> : formatClock(remaining)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniRing({ progress, done }: { progress: number; done: boolean }) {
  const size = 26;
  const r = 10;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={13} cy={13} r={r} fill="none" strokeWidth={3} className={done ? "stroke-paper/30" : "stroke-ring-track"} />
      <circle
        cx={13}
        cy={13}
        r={r}
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, done ? 1 : progress)))}
        transform="rotate(-90 13 13)"
        className={done ? "stroke-paper" : "stroke-ink"}
      />
    </svg>
  );
}
