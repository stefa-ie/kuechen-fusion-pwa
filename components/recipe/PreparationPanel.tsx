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

export function StepBody({ step, mode, className }: { step: Recipe["steps"][number]; mode: StepMode; className?: string }) {
  if (mode === "bullets" && step.bullets.length) {
    return (
      <ul className={cn("list-disc space-y-1.5 pl-5 marker:text-ink/40", className)}>
        {step.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    );
  }
  return <p className={className}>{step.text}</p>;
}

export function PreparationPanel({ recipe, mode, onModeChange }: { recipe: Recipe; mode: StepMode; onModeChange: (m: StepMode) => void }) {
  const t = useTranslations("recipe");
  return (
    <div>
      <div className="flex justify-end pb-2">
        <StepModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <ol className="space-y-8 pb-4">
        {recipe.steps.map((step, i) => (
          <li key={i}>
            <div className="mb-2 text-[18px] font-bold">{t("step", { n: i + 1 })}</div>
            <StepBody step={step} mode={mode} className="font-serif text-[19px] leading-[1.5]" />
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
