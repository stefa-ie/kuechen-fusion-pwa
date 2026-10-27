"use client";

import { Pause, Play, Timer as TimerIcon, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { RotaryDial } from "@/components/timer/RotaryDial";
import { KIND_ICON } from "@/components/timer/TimerSheet";
import { TimerRing } from "@/components/timer/TimerRing";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { formatClock, formatShort } from "@/lib/duration";
import { requestNotificationPermission, unlockAudio } from "@/lib/timers/alarm";
import { remainingOf, useTimers } from "@/lib/timers/store";
import { formatEndTime, useNow } from "@/lib/timers/useNow";
import type { TimerKind } from "@/lib/types";

const PRESETS = [1, 3, 5, 8, 10, 15, 20, 30, 45, 60];
const KINDS: TimerKind[] = ["cook", "simmer", "bake", "rest"];

export default function TimersPage() {
  const t = useTranslations("timers");
  const locale = useLocale();
  const { timers, add, open, pause, resume, remove, clearDone } = useTimers();
  const [minutes, setMinutes] = useState(10);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TimerKind | null>(null);
  const now = useNow(500, timers.length > 0);

  const start = () => {
    unlockAudio();
    void requestNotificationPermission();
    add({
      label: label.trim() || (kind ? t(`kind.${kind}`) : t("standalone")),
      durationMs: minutes * 60_000,
      kind,
    });
    setLabel("");
  };

  const sorted = [...timers].sort((a, b) => {
    const order = { done: 0, running: 1, paused: 2 } as const;
    return order[a.status] - order[b.status] || remainingOf(a, now) - remainingOf(b, now);
  });
  const hasDone = timers.some((x) => x.status === "done");

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <h1 className="py-3 text-center text-[17px] font-semibold">{t("title")}</h1>
      </header>

      <section className="flex flex-col items-center px-4 pt-4">
        <RotaryDial minutes={minutes} onChange={setMinutes} format={formatShort} />
        <p className="mt-3 text-[13px] text-muted">{t("dialHint")}</p>

        <div className="no-scrollbar -mx-4 mt-5 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4">
          {PRESETS.map((m) => (
            <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
              {m} {t("min")}
            </Chip>
          ))}
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelPlaceholder")}
          className="mt-5 h-11 w-full rounded-lg border border-line px-3 text-[16px] outline-none focus:border-ink"
        />
        <div className="mt-3 flex w-full flex-wrap gap-2">
          {KINDS.map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
                <Icon className="size-4" />
                {t(`kind.${k}`)}
              </Chip>
            );
          })}
        </div>

        <Button variant="solid" size="lg" className="mt-6 w-full" onClick={start}>
          <Play className="size-4 fill-current" />
          {t("start", { time: formatShort(minutes) })}
        </Button>
      </section>

      <section className="px-4 pt-10 pb-8">
        <div className="flex items-center justify-between pb-3">
          <h2 className="font-serif text-[24px]">{t("running")}</h2>
          {hasDone && (
            <button onClick={clearDone} className="text-[14px] underline underline-offset-4">
              {t("clearDone")}
            </button>
          )}
        </div>
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-8 text-center text-[14px] text-muted">
            <TimerIcon className="mx-auto mb-2 size-6" strokeWidth={1.5} />
            {t("noneRunning")}
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((timer) => {
              const remaining = remainingOf(timer, now);
              const done = timer.status === "done";
              const Icon = timer.kind ? KIND_ICON[timer.kind] : TimerIcon;
              return (
                <li
                  key={timer.id}
                  className={cn("flex items-center gap-3 rounded-xl border p-3", done ? "border-ink bg-ink text-paper" : "border-line")}
                >
                  <button onClick={() => open(timer.id)} className="shrink-0" aria-label={timer.label}>
                    <TimerRing progress={timer.durationMs ? remaining / timer.durationMs : 0} size={52} stroke={5} done={done}>
                      <Icon className={cn("size-4", done && "text-paper")} />
                    </TimerRing>
                  </button>
                  <button onClick={() => open(timer.id)} className="min-w-0 flex-1 text-left">
                    <div className={cn("text-[26px] leading-none font-light tabular-nums", done && "animate-pulse-soft")}>
                      {done ? t("doneShort") : formatClock(remaining)}
                    </div>
                    <div className={cn("mt-1 truncate text-[13px]", done ? "text-paper/70" : "text-muted")}>
                      {timer.label}
                      {timer.status === "running" && timer.endsAt && ` · ${formatEndTime(timer.endsAt, locale)}`}
                      {timer.status === "paused" && ` · ${t("paused")}`}
                    </div>
                    {timer.recipeTitle && (
                      <div className={cn("truncate text-[12px]", done ? "text-paper/60" : "text-faint")}>{timer.recipeTitle}</div>
                    )}
                  </button>
                  {!done && (
                    <button
                      aria-label={timer.status === "running" ? t("pause") : t("resume")}
                      onClick={() => (timer.status === "running" ? pause(timer.id) : resume(timer.id))}
                      className="flex size-10 items-center justify-center rounded-full border border-line"
                    >
                      {timer.status === "running" ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                    </button>
                  )}
                  <button
                    aria-label={t("delete")}
                    onClick={() => remove(timer.id)}
                    className={cn("flex size-10 items-center justify-center rounded-full", done ? "hover:bg-paper/10" : "hover:bg-wash")}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {timers.some((x) => x.recipeId) && (
          <p className="mt-4 text-[13px] text-muted">
            {t("recipeTimersHint")}{" "}
            <Link href="/box" className="underline">
              {t("recipeTimersLink")}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
