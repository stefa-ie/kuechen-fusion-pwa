"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeListView } from "@/components/recipe/RecipeListView";
import { useCooked, useRecipes } from "@/lib/data/hooks";
import type { Recipe } from "@/lib/types";

export default function CookedPage() {
  const t = useTranslations("box");
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: cooked = [] } = useCooked();
  const list = [...cooked]
    .sort((a, b) => b.cookedAt.localeCompare(a.cookedAt))
    .map((c) => recipes.find((r) => r.id === c.recipeId))
    .filter((r, i, arr): r is Recipe => Boolean(r) && arr.indexOf(r) === i);

  return (
    <RecipeListView
      title={t("cooked")}
      recipes={list}
      loading={isLoading}
      keepOrder
      empty={{ icon: <CheckCircle2 className="size-6 fill-ink text-paper" />, text: t("cookedEmpty") }}
    />
  );
}
