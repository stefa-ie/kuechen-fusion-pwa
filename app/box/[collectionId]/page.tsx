"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";
import { RecipeListView } from "@/components/recipe/RecipeListView";
import { useCollections, useRecipes } from "@/lib/data/hooks";
import type { Recipe } from "@/lib/types";

export default function CollectionPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = use(params);
  const t = useTranslations("box");
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: collections = [] } = useCollections();
  const collection = collections.find((c) => c.id === collectionId);
  const list = (collection?.recipeIds ?? [])
    .map((id) => recipes.find((r) => r.id === id))
    .filter((r): r is Recipe => Boolean(r));

  return (
    <RecipeListView
      title={collection?.name ?? ""}
      recipes={list}
      loading={isLoading || !collection}
      keepOrder
      empty={{ icon: <Bookmark className="size-6" />, text: t("folderEmpty") }}
    />
  );
}
