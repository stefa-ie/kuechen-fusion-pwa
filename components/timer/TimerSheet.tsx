"use client";

import { AlarmClock, Bell, Check, CookingPot, Flame, Hourglass, Pause, Pencil, Play, RotateCcw, Timer, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { formatClock, formatShort } from "@/lib/duration";
import { remainingOf, useTimers, type KitchenTimer } from "@/lib/timers/store";
import { formatEndTime, useNow } from "@/lib/timers/useNow";
import type { TimerKind } from "@/lib/types";
import { RotaryDial } from "./RotaryDial";
import { TimerRing } from "./TimerRing";

export const KIND_ICON: Record<TimerKind, typeof Flame> = {
  bake: Flame,
  rest: Hourglass,
  simmer: CookingPot,
  cook: CookingPot,
};

export function TimerSheet() {
  const openId = useTimers((s) => s.openId);
  const timer = useTimers((s) => s.timers.find((t) => t.id === s.openId));
  const open = useTimers((s) => s.open);

  return (
    <Sheet open={Boolean(openId && timer)} onClose={() => open(null)}>
      {timer && <TimerSheetBody key={timer.id} timer={timer} onClose={() => open(null)} />}
    </Sheet>
  );
}

function TimerSheetBody({ timer, onClose }: { timer: KitchenTimer; onClose: () => void }) {
  const t = useTranslations("timers");
  const locale = useLocale();
  const now = useNow(250);
  const { pause, resume, remove, repeat, snooze, adjust } = useTimers.getState();
  const [view, setView] = useState<"timer" | "snooze" | "custom">("timer");
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [custom, setCustom] = useState("");

  const remaining = remainingOf(timer, now);
  const progress = timer.durationMs ? remaining / timer.durationMs : 0;
  const done = timer.status === "done";
  const endsAt = timer.status === "running" && timer.endsAt ? timer.endsAt : now + remaining;
  const Icon = timer.kind ? KIND_ICON[timer.kind] : Timer;

  if (view === "snooze" || view === "custom") {
    return (
      <div className="flex flex-col items-center px-6 pb-6">
        <div className="mb-6 flex w-full items-center justify-between">
          <h3 className="text-[22px] font-semibold">{t("snooze")}</h3>
          <button aria-label={t("back")} onClick={() => setView("timer")} className="rounded-full p-2 hover:bg-wash">
            <X className="size-5" />
          </button>
        </div>
        {view === "snooze" ? (
          <RotaryDial minutes={snoozeMinutes} onChange={setSnoozeMinutes} max={180} format={formatShort} />
        ) : (
          <label className="flex h-[260px] flex-col items-center justify-center gap-2">
            <span className="text-[14px] text-muted">{t("customMinutes")}</span>
            <input
              autoFocus
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
              className="w-40 border-b-2 border-ink bg-transparent text-center text-[56px] font-light tabular-nums outline-none"
              placeholder="5"
            />
          </label>
        )}
        <button
          onClick={() => {
            const minutes = view === "custom" ? parseInt(custom || "0", 10) : snoozeMinutes;
            if (minutes > 0) snooze(timer.id, minutes * 60_000);
            setView("timer");
          }}
          className="mt-8 h-14 w-full rounded-full bg-ink text-[16px] font-semibold text-paper"
        >
          {t("confirm")}
        </button>
        <button
          onClick={() => setView(view === "custom" ? "snooze" : "custom")}
          className="mt-4 flex items-center gap-1.5 text-[14px] text-muted"
        >
          <Pencil className="size-3.5" />
          {view === "custom" ? t("dial") : t("custom")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-6">
      {timer.detail && (
        <p className="mx-4 mb-3 rounded-xl bg-wash px-4 py-3 text-[15px] leading-snug text-ink-soft">{timer.detail}</p>
      )}
      <div className="flex items-center gap-3 border-b border-line px-5 pb-4">
        {timer.imageUrl ? (
          <img src={timer.imageUrl} alt="" className="size-10 rounded-full object-cover grayscale" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-wash">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{timer.label}</div>
          <div className="truncate text-[13px] text-muted">
            {timer.recipeTitle ?? (timer.kind ? t(`kind.${timer.kind}`) : t("standalone"))}
            {timer.stepIndex != null && ` · ${t("step", { n: timer.stepIndex + 1 })}`}
          </div>
        </div>
        <button aria-label={t("delete")} onClick={() => remove(timer.id)} className="rounded-full p-2 text-muted hover:bg-wash">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex justify-center py-8">
        <TimerRing progress={progress} done={done}>
          {done ? (
            <Check className="size-10 text-paper" strokeWidth={2.5} />
          ) : (
            <>
              <span className="text-[52px] font-light tabular-nums tracking-tight">{formatClock(remaining)}</span>
              <span className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                <Bell className="size-3.5" />
                {timer.status === "paused" ? t("paused") : formatEndTime(endsAt, locale)}
              </span>
            </>
          )}
        </TimerRing>
      </div>

      <div className="flex flex-col items-center gap-3 px-6">
        {done ? (
          <>
            <button
              onClick={() => setView("snooze")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-[16px] font-semibold text-paper"
            >
              <AlarmClock className="size-4" />
              {t("snooze")}
            </button>
            <button
              onClick={() => {
                remove(timer.id);
                onClose();
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-wash text-[15px] font-medium"
            >
              <Check className="size-4" />
              {t("dismiss")}
            </button>
          </>
        ) : (
          <>
            <div className="flex w-full gap-2">
              <button
                onClick={() => adjust(timer.id, -60_000)}
                className="h-12 flex-1 rounded-full border border-line text-[15px] font-medium"
              >
                −1 {t("min")}
              </button>
              <button
                onClick={() => (timer.status === "paused" ? resume(timer.id) : pause(timer.id))}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-line text-[15px] font-medium"
              >
                {timer.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
                {timer.status === "paused" ? t("resume") : t("pause")}
              </button>
              <button
                onClick={() => adjust(timer.id, 60_000)}
                className="h-12 flex-1 rounded-full border border-line text-[15px] font-medium"
              >
                +1 {t("min")}
              </button>
            </div>
            <button
              onClick={() => {
                remove(timer.id);
                onClose();
              }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-wash text-[16px] font-semibold"
            >
              <Check className="size-4" />
              {t("finish")}
            </button>
          </>
        )}
        <button onClick={() => repeat(timer.id)} className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
          <RotateCcw className="size-3.5" />
          {t("repeat")}
        </button>
      </div>
    </div>
  );
}
