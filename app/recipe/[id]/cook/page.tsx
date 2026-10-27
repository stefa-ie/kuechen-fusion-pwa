"use client";

import { ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { IngredientLine } from "@/components/recipe/IngredientsPanel";
import { StepBody, StepModeToggle } from "@/components/recipe/PreparationPanel";
import { TimerChip } from "@/components/recipe/TimerChip";
import { ActiveTimersInline } from "@/components/timer/ActiveTimersInline";
import { Checkbox, Spinner } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useCooking, useRecipeCooking } from "@/lib/cooking-state";
import { useRecipe } from "@/lib/data/hooks";
import { scaleIngredient } from "@/lib/ingredients";

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Not supported or denied (e.g. low battery).
      }
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);
}

export default function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("recipe");
  const locale = useLocale();
  const router = useRouter();
  const { data: recipe } = useRecipe(id);
  const { servings, checked, step } = useRecipeCooking(id, recipe?.servings ?? null);
  const { setStep, toggleChecked, stepMode, setStepMode } = useCooking();
  const [showIngredients, setShowIngredients] = useState(false);
  useWakeLock();

  if (!recipe) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  const total = recipe.steps.length;
  const current = Math.min(step, Math.max(0, total - 1));
  const s = recipe.steps[current];
  const factor = recipe.servings ? servings / recipe.servings : 1;
  const go = (n: number) => setStep(recipe.id, Math.max(0, Math.min(total - 1, n)));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <header className="safe-top border-b border-line">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-2">
          <button aria-label={t("closeCooking")} onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
            <X className="size-6" strokeWidth={1.6} />
          </button>
          <div className="truncate px-2 text-[15px] font-semibold">{recipe.title}</div>
          <button aria-label={t("ingredients")} onClick={() => setShowIngredients(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-wash">
            <ListChecks className="size-5" />
          </button>
        </div>
        <div className="h-0.5 bg-line">
          <div className="h-full bg-ink transition-all" style={{ width: `${total ? ((current + 1) / total) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-5 pt-6 pb-8">
        <div className="flex items-center justify-between">
          <span className="kicker text-accent">{t("stepOf", { n: current + 1, total })}</span>
          <StepModeToggle mode={stepMode} onChange={setStepMode} />
        </div>
        {s && (
          <div className="mt-5">
            <StepBody step={s} mode={stepMode} large />
            {s.timers.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {s.timers.map((timer, k) => (
                  <TimerChip key={k} timer={timer} recipe={recipe} stepIndex={current} stepText={s.text} large />
                ))}
              </div>
            )}
          </div>
        )}
        <ActiveTimersInline recipeId={recipe.id} />
      </div>

      <footer className="safe-bottom border-t border-line">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
          <button
            onClick={() => go(current - 1)}
            disabled={current === 0}
            className="flex h-14 flex-1 items-center justify-center gap-1 rounded-full border border-ink/25 text-[16px] font-medium disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
            {t("prev")}
          </button>
          {current < total - 1 ? (
            <button onClick={() => go(current + 1)} className="flex h-14 flex-[1.4] items-center justify-center gap-1 rounded-full bg-ink text-[16px] font-semibold text-paper">
              {t("next")}
              <ChevronRight className="size-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setStep(recipe.id, 0);
                router.replace(`/recipe/${recipe.id}`);
              }}
              className="flex h-14 flex-[1.4] items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-paper"
            >
              {t("finishCooking")}
            </button>
          )}
        </div>
      </footer>

      <Sheet open={showIngredients} onClose={() => setShowIngredients(false)} title={t("ingredients")} full>
        <ul className="px-4 pb-6">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              <button
                onClick={() => toggleChecked(recipe.id, i)}
                className={cn("flex w-full items-start gap-3 py-2.5 text-left text-[18px] leading-snug", checked.has(i) && "text-faint")}
              >
                <Checkbox checked={checked.has(i)} />
                <span>
                  <IngredientLine ingredient={scaleIngredient(ing, factor)} locale={locale} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
