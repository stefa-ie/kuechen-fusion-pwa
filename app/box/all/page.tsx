"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeListView } from "@/components/recipe/RecipeListView";
import { useRecipes } from "@/lib/data/hooks";

export default function AllSavedPage() {
  const t = useTranslations("box");
  const { data = [], isLoading } = useRecipes();
  return (
    <RecipeListView
      title={t("allSaved")}
      recipes={data}
      loading={isLoading}
      empty={{ icon: <Bookmark className="size-6" />, text: t("allEmpty") }}
    />
  );
}
