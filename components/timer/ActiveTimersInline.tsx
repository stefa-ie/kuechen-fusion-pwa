"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/duration";
import { remainingOf, useTimers } from "@/lib/timers/store";
import { useNow } from "@/lib/timers/useNow";

/** Running timers shown inside cooking mode, where the floating bar is hidden. */
export function ActiveTimersInline({ recipeId }: { recipeId?: string }) {
  const t = useTranslations("timers");
  const timers = useTimers((s) => s.timers);
  const open = useTimers((s) => s.open);
  const now = useNow(500, timers.length > 0);
  if (!timers.length) return null;
  const sorted = [...timers].sort((a, b) => Number(b.recipeId === recipeId) - Number(a.recipeId === recipeId));

  return (
    <div className="mt-10 border-t border-line pt-5">
      <div className="kicker mb-3 text-muted">{t("running")}</div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((timer) => (
          <button
            key={timer.id}
            onClick={() => open(timer.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left",
              timer.status === "done" ? "animate-pulse-soft border-ink bg-ink text-paper" : "border-line",
            )}
          >
            <div className="text-[22px] font-light tabular-nums">
              {timer.status === "done" ? t("doneShort") : formatClock(remainingOf(timer, now))}
            </div>
            <div className={cn("truncate text-[12px]", timer.status === "done" ? "text-paper/70" : "text-muted")}>
              {timer.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
