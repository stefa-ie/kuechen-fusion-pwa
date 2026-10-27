"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { Recipe } from "@/lib/types";
import { TimerChip } from "./TimerChip";

export type StepMode = "full" | "bullets";

export function StepModeToggle({ mode, onChange }: { mode: StepMode; onChange: (m: StepMode) => void }) {
  const t = useTranslations("recipe");
  return (
    <div className="inline-flex rounded-full bg-wash p-0.5 text-[13px] font-medium">
      {(["full", "bullets"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn("rounded-full px-3.5 py-1.5 transition-colors", mode === m ? "bg-paper shadow-sm" : "text-muted")}
        >
          {t(m === "full" ? "modeFull" : "modeBullets")}
        </button>
      ))}
    </div>
  );
}

export function StepBody({ step, mode, large }: { step: Recipe["steps"][number]; mode: StepMode; large?: boolean }) {
  if (mode === "bullets" && step.bullets.length) {
    return (
      <ul className={cn("list-disc space-y-1.5 pl-5 marker:text-ink/40", large ? "text-[24px] leading-snug" : "text-[18px] leading-snug")}>
        {step.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    );
  }
  return <p className={large ? "text-[26px] leading-[1.35]" : "text-[18px] leading-[1.45]"}>{step.text}</p>;
}

export function PreparationPanel({ recipe, mode, onModeChange }: { recipe: Recipe; mode: StepMode; onModeChange: (m: StepMode) => void }) {
  const t = useTranslations("recipe");
  return (
    <div className="px-4">
      <div className="flex justify-end py-4">
        <StepModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <ol className="space-y-7 pb-4">
        {recipe.steps.map((step, i) => (
          <li key={i}>
            <div className={cn("kicker mb-2 inline-block border-b-2 pb-0.5 font-sans text-[13px]", i === 0 ? "border-ink" : "border-transparent text-accent")}>
              {t("step", { n: i + 1 })}
            </div>
            <StepBody step={step} mode={mode} />
            {step.timers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {step.timers.map((timer, k) => (
                  <TimerChip key={k} timer={timer} recipe={recipe} stepIndex={i} stepText={step.text} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
