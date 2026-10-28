"use client";

import { Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { KIND_ICON } from "@/components/timer/TimerSheet";
import { cn } from "@/lib/cn";
import { formatClock, formatMinutes } from "@/lib/duration";
import { requestNotificationPermission, unlockAudio } from "@/lib/timers/alarm";
import { remainingOf, useTimers } from "@/lib/timers/store";
import { useNow } from "@/lib/timers/useNow";
import type { Recipe, StepTimer } from "@/lib/types";

export function TimerChip({
  timer,
  recipe,
  stepIndex,
  stepText,
  large,
}: {
  timer: StepTimer;
  recipe: Pick<Recipe, "id" | "title" | "imageUrl">;
  stepIndex: number;
  stepText: string;
  large?: boolean;
}) {
  const t = useTranslations("timers");
  const locale = useLocale();
  const running = useTimers((s) =>
    s.timers.find((x) => x.recipeId === recipe.id && x.stepIndex === stepIndex && x.label === timer.label),
  );
  const { add, open } = useTimers.getState();
  const now = useNow(500, Boolean(running));
  const Icon = KIND_ICON[timer.kind];

  const start = () => {
    unlockAudio();
    void requestNotificationPermission();
    const id = add({
      label: timer.label,
      durationMs: timer.seconds * 1000,
      detail: stepText,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      imageUrl: recipe.imageUrl,
      stepIndex,
      kind: timer.kind,
    });
    open(id);
  };

  return (
    <button
      onClick={() => (running ? open(running.id) : start())}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border text-left transition-colors",
        large ? "h-12 px-5 text-[16px]" : "h-9 px-3.5 text-[14px]",
        running
          ? running.status === "done"
            ? "animate-pulse-soft border-ink bg-ink text-paper"
            : "border-ink bg-paper"
          : "border-ink/25 bg-wash hover:border-ink",
      )}
    >
      {running ? <Icon className="size-4" /> : <Play className="size-3.5" fill="currentColor" />}
      <span className="font-semibold tabular-nums">
        {running
          ? running.status === "done"
            ? t("doneShort")
            : formatClock(remainingOf(running, now))
          : formatMinutes(Math.round(timer.seconds / 60), locale)}
      </span>
      <span className={cn("max-w-44 truncate", running?.status === "done" ? "text-paper/80" : "text-muted")}>
        {t(`kind.${timer.kind}`)}
      </span>
    </button>
  );
}
