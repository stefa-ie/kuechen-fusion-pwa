"use client";

import { RotateCcw, ShoppingBasket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Checkbox, Stepper } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { scaleIngredient } from "@/lib/ingredients";
import { formatQuantityRange } from "@/lib/units";
import type { Ingredient, Recipe } from "@/lib/types";

export function IngredientLine({ ingredient, locale }: { ingredient: Ingredient; locale: string }) {
  const qty = formatQuantityRange(ingredient.qty, ingredient.qtyMax, ingredient.unit, locale);
  return (
    <>
      {qty && (
        <b className="font-semibold">
          {qty}
          {ingredient.unit ? ` ${ingredient.unit}` : ""}{" "}
        </b>
      )}
      {ingredient.name}
      {ingredient.note && <span className="text-muted">, {ingredient.note}</span>}
    </>
  );
}

export function IngredientsPanel({
  recipe,
  servings,
  onServingsChange,
  checked,
  onToggle,
  onAddToGrocery,
}: {
  recipe: Recipe;
  servings: number;
  onServingsChange: (n: number) => void;
  checked: Set<number>;
  onToggle: (index: number) => void;
  onAddToGrocery: () => void;
}) {
  const t = useTranslations("recipe");
  const locale = useLocale();
  const base = recipe.servings ?? 0;
  const factor = base ? servings / base : 1;

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-4">
        {base ? (
          <div className="flex items-center gap-2">
            <Stepper value={servings} onChange={onServingsChange} label={t("servings", { count: servings })} />
            {servings !== base && (
              <button
                aria-label={t("resetServings")}
                onClick={() => onServingsChange(base)}
                className="rounded-full p-1.5 text-muted hover:bg-wash"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[14px] text-muted">{recipe.servingsLabel ?? ""}</span>
        )}
        <Button size="sm" variant="outline" onClick={onAddToGrocery}>
          <ShoppingBasket className="size-4" />
          {t("toGrocery")}
        </Button>
      </div>
      <ul className="px-4">
        {recipe.ingredients.map((ing, i) => {
          const showGroup = ing.group && ing.group !== recipe.ingredients[i - 1]?.group;
          const done = checked.has(i);
          return (
            <li key={i}>
              {showGroup && <div className="kicker pt-5 pb-1 text-muted">{ing.group}</div>}
              <button
                onClick={() => onToggle(i)}
                className={cn(
                  "flex w-full items-start gap-3 py-2.5 text-left text-[18px] leading-snug",
                  done && "text-faint [&_b]:font-normal",
                )}
              >
                <Checkbox checked={done} />
                <span>
                  <IngredientLine ingredient={scaleIngredient(ing, factor)} locale={locale} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
