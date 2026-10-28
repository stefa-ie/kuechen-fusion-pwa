"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ActiveTimersInline } from "@/components/timer/ActiveTimersInline";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useCooking, useRecipeCooking } from "@/lib/cooking-state";
import type { Recipe } from "@/lib/types";
import { useWakeLock } from "@/lib/useWakeLock";
import { IngredientsPanel } from "./IngredientsPanel";
import { StepBody, StepModeToggle } from "./PreparationPanel";
import { TimerChip } from "./TimerChip";

type Tab = "ingredients" | "preparation";

export function CookSheet({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const t = useTranslations("recipe");
  const { servings, checked, step } = useRecipeCooking(recipe.id, recipe.servings);
  const { setServings, toggleChecked, setStep, stepMode, setStepMode } = useCooking();
  const [tab, setTab] = useState<Tab>("ingredients");
  const currentRef = useRef<HTMLLIElement>(null);
  const current = Math.min(step, Math.max(0, recipe.steps.length - 1));
  useWakeLock(open);

  useEffect(() => {
    if (open && tab === "preparation") currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, tab, current]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={
        <div className="relative">
          <button
            aria-label={t("closeCooking")}
            onClick={onClose}
            className="absolute top-1/2 -left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-wash"
          >
            <ChevronDown className="size-6" strokeWidth={1.8} />
          </button>
          <div className="truncate px-8">{recipe.title}</div>
        </div>
      }
    >
      <div className="sticky top-0 z-10 grid grid-cols-2 gap-6 bg-paper px-6">
        {(["ingredients", "preparation"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn("kicker border-b-[3px] py-2.5 text-[15px]", tab === key ? "border-ink text-ink" : "border-transparent text-muted")}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="px-6 pt-5 pb-10">
        {tab === "ingredients" ? (
          <IngredientsPanel
            recipe={recipe}
            servings={servings}
            onServingsChange={(n) => setServings(recipe.id, n)}
            checked={checked}
            onToggle={(i) => toggleChecked(recipe.id, i)}
          />
        ) : (
          <>
            <div className="flex justify-end pb-2">
              <StepModeToggle mode={stepMode} onChange={setStepMode} />
            </div>
            <ol className="space-y-7">
              {recipe.steps.map((s, i) => {
                const active = i === current;
                return (
                  <li key={i} ref={active ? currentRef : undefined}>
                    <button onClick={() => setStep(recipe.id, i)} className="block w-full text-left">
                      <div className={cn("mb-2 text-[13px] font-bold tracking-[0.06em] uppercase", active ? "text-ink" : "text-accent")}>
                        {t("step", { n: i + 1 })}
                      </div>
                      <StepBody
                        step={s}
                        mode={stepMode}
                        className={cn("text-[22px] leading-[1.4]", active ? "font-semibold text-ink" : "text-ink-soft")}
                      />
                    </button>
                    {s.timers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.timers.map((timer, k) => (
                          <TimerChip key={k} timer={timer} recipe={recipe} stepIndex={i} stepText={s.text} />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <ActiveTimersInline recipeId={recipe.id} />
          </>
        )}
      </div>
    </Sheet>
  );
}
