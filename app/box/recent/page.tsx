"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeListView } from "@/components/recipe/RecipeListView";
import { useRecipes } from "@/lib/data/hooks";
import { useRecentlyViewed } from "@/lib/recent";
import type { Recipe } from "@/lib/types";

export default function RecentlyViewedPage() {
  const t = useTranslations("box");
  const { data: recipes = [], isLoading } = useRecipes();
  const ids = useRecentlyViewed();
  const list = ids.map((id) => recipes.find((r) => r.id === id)).filter((r): r is Recipe => Boolean(r));

  return (
    <RecipeListView
      title={t("recentlyViewed")}
      recipes={list}
      loading={isLoading}
      keepOrder
      empty={{ icon: <Clock className="size-6" />, text: t("recentEmpty") }}
    />
  );
}
